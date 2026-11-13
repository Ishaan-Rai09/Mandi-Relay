"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  audit,
  createSession,
  hashPassword,
  normaliseEmail,
  requireUser,
  signOutUser,
  verifyPassword,
} from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  completePasswordReset,
  requestPasswordReset,
  RESET_TTL_MINUTES,
} from "@/lib/auth/reset";
import { db } from "@/lib/db";
import { ROLE_HOME, type Role } from "@/lib/domain";
import { emailConfigured } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import {
  fieldErrors,
  normalisePhone,
  onboardingSchema,
  profileSchema,
  requestResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ActionState,
} from "@/lib/schemas";

/** Only internal, single-slash paths are accepted as a post-auth destination. */
function safeNext(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function splitList(value: string | undefined | null): string {
  return JSON.stringify(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12),
  );
}

/** Where a signed-in account belongs, allowlist included. */
function destinationFor(user: { role: string; phone: string | null; email: string }) {
  if (isAdminEmail(user.email)) return ROLE_HOME.ADMIN;
  if (!user.phone) return "/onboarding";
  return ROLE_HOME[user.role as Role];
}

/** Absolute origin for links in email: configured site URL, else the request. */
async function publicOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto =
    hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function clientIp(hdrs: { get(name: string): string | null }) {
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/* ── Email + password ──────────────────────────────────────────────── */

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const byIp = rateLimit(`signin:${ip}`, 12, 300);
  const byEmail = rateLimit(`signin:email:${parsed.data.email}`, 8, 300);
  if (!byIp.allowed || !byEmail.allowed) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${Math.ceil(
        Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds) / 60,
      )} minutes.`,
    };
  }

  const user = await db.user.findUnique({ where: { email: normaliseEmail(parsed.data.email) } });

  // Same response whether the email is unknown or the password is wrong, and
  // the hash comparison runs either way so timing does not leak the answer.
  const valid = verifyPassword(parsed.data.password, user?.passwordHash ?? null);
  if (!user || !valid) {
    return { ok: false, message: "That email and password do not match." };
  }

  await createSession(user.id);
  await audit(user.id, "SIGN_IN", "user", user.id, { provider: "password" });

  const requested = safeNext(String(formData.get("next") ?? ""));
  redirect(requested ?? destinationFor(user));
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    language: formData.get("language") ?? "en",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`signup:${ip}`, 6, 600);
  if (!limit.allowed) {
    return { ok: false, message: "Too many sign-up attempts. Please try again shortly." };
  }

  const email = normaliseEmail(parsed.data.email);
  const phone = normalisePhone(parsed.data.phone);

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { ok: false, message: "An account already exists for that email. Sign in instead." };
  }

  // An allowlisted email is an administrator whatever the form said.
  const admin = isAdminEmail(email);

  let user;
  try {
    user = await db.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone,
        role: admin ? "ADMIN" : parsed.data.role,
        passwordHash: hashPassword(parsed.data.password),
        language: parsed.data.language,
      },
    });
  } catch (error) {
    // Only realistic cause: the phone number is already on another account.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        errors: { phone: ["That mobile number already belongs to another account."] },
      };
    }
    throw error;
  }

  await createSession(user.id);
  await audit(user.id, "SIGN_UP", "user", user.id, { role: user.role, provider: "password" });
  redirect(admin ? ROLE_HOME.ADMIN : "/onboarding");
}

/* ── Password reset ────────────────────────────────────────────────── */

/**
 * Sends a single-use reset link.
 *
 * The response is identical whether or not the address has an account, so the
 * form cannot be used to discover who is registered. The one exception is
 * delivery not being configured on this deployment: in development the link is
 * handed back so a reset can still be completed locally, and in production the
 * failure is logged and the visitor still gets the neutral message.
 */
export async function requestResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const hdrs = await headers();
  const ip = clientIp(hdrs);
  const byIp = rateLimit(`reset:${ip}`, 5, 900);
  if (!byIp.allowed) {
    return {
      ok: false,
      message: `Too many reset requests from this network. Try again in ${Math.ceil(
        byIp.retryAfterSeconds / 60,
      )} minutes.`,
    };
  }

  const neutral = `If that email belongs to an account, a reset link is on its way. It works once, within ${RESET_TTL_MINUTES} minutes.`;

  // Per-address limit, so one inbox cannot be flooded. Same neutral answer.
  const byEmail = rateLimit(`reset:email:${parsed.data.email}`, 3, 900);
  if (!byEmail.allowed) return { ok: true, message: neutral };

  const outcome = await requestPasswordReset(parsed.data.email, await publicOrigin());
  if (outcome.status === "unknown") return { ok: true, message: neutral };

  if (outcome.status === "sent") {
    await audit(outcome.userId, "PASSWORD_RESET_REQUEST", "user", outcome.userId, {
      delivered: true,
    });
    return { ok: true, message: neutral };
  }

  console.warn(
    `[password-reset] not delivered for user ${outcome.userId}: ${
      outcome.status === "failed" ? outcome.error : "RESEND_API_KEY is not set"
    }`,
  );
  await audit(outcome.userId, "PASSWORD_RESET_REQUEST", "user", outcome.userId, {
    delivered: false,
    reason: outcome.status,
  });

  // Nowhere to deliver the link, so a development build hands it to the person
  // who asked for it instead of losing it. Production stays neutral.
  if (process.env.NODE_ENV !== "production" && !emailConfigured()) {
    console.info(`[password-reset] development link: ${outcome.link}`);
    return {
      ok: true,
      message:
        "Email delivery is not set up on this deployment yet, so the reset link is shown below instead of being emailed.",
      data: { devLink: outcome.link },
    };
  }
  return { ok: true, message: neutral };
}

/** Consumes the link and signs the account in on the new password. */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const hdrs = await headers();
  const limit = rateLimit(`reset-submit:${clientIp(hdrs)}`, 10, 900);
  if (!limit.allowed) {
    return { ok: false, message: "Too many attempts. Please request a new link later." };
  }

  const done = await completePasswordReset(parsed.data.token, parsed.data.password);
  if (!done.ok) {
    return {
      ok: false,
      message:
        "That reset link has expired or was already used. Request a new one to continue.",
      data: { expired: true },
    };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: done.userId },
    select: { id: true, email: true, role: true, phone: true },
  });

  await audit(user.id, "PASSWORD_RESET", "user", user.id);

  // The old password is gone and every session was just revoked, so issue a
  // fresh one rather than bouncing the person back to the sign-in form.
  await createSession(user.id);
  redirect(destinationFor(user));
}

export async function signOutAction() {
  const user = await requireUser().catch(() => null);
  if (user) await audit(user.id, "SIGN_OUT", "user", user.id);
  await signOutUser();
  redirect("/");
}

/** Completes the profile collected during onboarding. */
export async function saveOnboardingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/onboarding");

  const raw = {
    language: formData.get("language"),
    phone: formData.get("phone"),
    role: formData.get("role") || undefined,
    state: formData.get("state"),
    district: formData.get("district"),
    village: formData.get("village"),
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    farmName: formData.get("farmName") || undefined,
    sizeAcres: formData.get("sizeAcres") || undefined,
    primaryCrops: formData.get("primaryCrops") || undefined,
    businessName: formData.get("businessName") || undefined,
    businessType: formData.get("businessType") || undefined,
    preferredCommodities: formData.get("preferredCommodities") || undefined,
    typicalQuantityKg: formData.get("typicalQuantityKg") || undefined,
    deliveryLocations: formData.get("deliveryLocations") || undefined,
    vehicleType: formData.get("vehicleType") || undefined,
    capacityKg: formData.get("capacityKg") || undefined,
    registrationNo: formData.get("registrationNo") || undefined,
    serviceAreas: formData.get("serviceAreas") || undefined,
  };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const phone = normalisePhone(data.phone);

  // One number, one account: buyers and farmers are reached through it.
  const clash = await db.user.findFirst({
    where: { phone, id: { not: user.id } },
    select: { id: true },
  });
  if (clash) {
    return { ok: false, errors: { phone: ["That mobile number already belongs to another account."] } };
  }

  // The role can still be corrected here (Google accounts arrive without one),
  // but an allowlisted email stays an administrator.
  const role: Role = isAdminEmail(user.email) ? "ADMIN" : (data.role ?? user.role);

  await db.user.update({
    where: { id: user.id },
    data: {
      phone,
      role,
      language: data.language,
      state: data.state,
      district: data.district,
      village: data.village,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
    },
  });

  if (role === "FARMER" && data.farmName) {
    await db.farm.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        farmName: data.farmName,
        sizeAcres: data.sizeAcres ?? null,
        primaryCrops: splitList(data.primaryCrops),
        verificationStatus: "PENDING",
      },
      update: {
        farmName: data.farmName,
        sizeAcres: data.sizeAcres ?? null,
        primaryCrops: splitList(data.primaryCrops),
      },
    });
  }

  if (role === "BUYER" && data.businessName) {
    await db.businessProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        businessName: data.businessName,
        businessType: data.businessType ?? "RETAILER",
        preferredCommodities: splitList(data.preferredCommodities),
        typicalQuantityKg: data.typicalQuantityKg ?? null,
        deliveryLocations: splitList(data.deliveryLocations),
        verificationStatus: "PENDING",
      },
      update: {
        businessName: data.businessName,
        businessType: data.businessType ?? "RETAILER",
        preferredCommodities: splitList(data.preferredCommodities),
        typicalQuantityKg: data.typicalQuantityKg ?? null,
        deliveryLocations: splitList(data.deliveryLocations),
      },
    });
  }

  if (role === "TRANSPORTER" && data.vehicleType) {
    await db.transporterProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        vehicleType: data.vehicleType,
        capacityKg: data.capacityKg ?? 1000,
        registrationNo: data.registrationNo ?? null,
        serviceAreas: splitList(data.serviceAreas),
        verificationStatus: "PENDING",
      },
      update: {
        vehicleType: data.vehicleType,
        capacityKg: data.capacityKg ?? 1000,
        registrationNo: data.registrationNo ?? null,
        serviceAreas: splitList(data.serviceAreas),
      },
    });
  }

  await audit(user.id, "ONBOARDING_COMPLETE", "user", user.id);
  revalidatePath("/", "layout");
  redirect(ROLE_HOME[role]);
}

/** Profile edit from the role profile pages. */
export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const sessionUser = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    language: formData.get("language"),
    state: formData.get("state"),
    district: formData.get("district"),
    village: formData.get("village"),
    farmName: formData.get("farmName") || undefined,
    sizeAcres: formData.get("sizeAcres") || undefined,
    primaryCrops: formData.get("primaryCrops") || undefined,
    businessName: formData.get("businessName") || undefined,
    businessType: formData.get("businessType") || undefined,
    preferredCommodities: formData.get("preferredCommodities") || undefined,
    typicalQuantityKg: formData.get("typicalQuantityKg") || undefined,
    deliveryLocations: formData.get("deliveryLocations") || undefined,
    vehicleType: formData.get("vehicleType") || undefined,
    capacityKg: formData.get("capacityKg") || undefined,
    registrationNo: formData.get("registrationNo") || undefined,
    serviceAreas: formData.get("serviceAreas") || undefined,
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  await db.user.update({
    where: { id: sessionUser.id },
    data: {
      name: data.name,
      language: data.language,
      state: data.state,
      district: data.district,
      village: data.village,
    },
  });

  if (sessionUser.role === "FARMER") {
    await db.farm.upsert({
      where: { userId: sessionUser.id },
      create: {
        userId: sessionUser.id,
        farmName: data.farmName ?? `${data.name}'s farm`,
        sizeAcres: data.sizeAcres ?? null,
        primaryCrops: splitList(data.primaryCrops),
        verificationStatus: "PENDING",
      },
      update: {
        farmName: data.farmName ?? undefined,
        sizeAcres: data.sizeAcres ?? null,
        primaryCrops: splitList(data.primaryCrops),
      },
    });
  }

  if (sessionUser.role === "BUYER") {
    await db.businessProfile.upsert({
      where: { userId: sessionUser.id },
      create: {
        userId: sessionUser.id,
        businessName: data.businessName ?? data.name,
        businessType: data.businessType ?? "RETAILER",
        preferredCommodities: splitList(data.preferredCommodities),
        typicalQuantityKg: data.typicalQuantityKg ?? null,
        deliveryLocations: splitList(data.deliveryLocations),
        verificationStatus: "PENDING",
      },
      update: {
        businessName: data.businessName ?? undefined,
        businessType: data.businessType ?? "RETAILER",
        preferredCommodities: splitList(data.preferredCommodities),
        typicalQuantityKg: data.typicalQuantityKg ?? null,
        deliveryLocations: splitList(data.deliveryLocations),
      },
    });
  }

  if (sessionUser.role === "TRANSPORTER") {
    await db.transporterProfile.upsert({
      where: { userId: sessionUser.id },
      create: {
        userId: sessionUser.id,
        vehicleType: data.vehicleType ?? "TEMPO",
        capacityKg: data.capacityKg ?? 1000,
        registrationNo: data.registrationNo ?? null,
        serviceAreas: splitList(data.serviceAreas),
        verificationStatus: "PENDING",
      },
      update: {
        vehicleType: data.vehicleType ?? undefined,
        capacityKg: data.capacityKg ?? undefined,
        registrationNo: data.registrationNo ?? null,
        serviceAreas: splitList(data.serviceAreas),
      },
    });
  }

  await audit(sessionUser.id, "PROFILE_UPDATE", "user", sessionUser.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}


