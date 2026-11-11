"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  audit,
  createSession,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_HOME } from "@/lib/domain";
import { rateLimit } from "@/lib/rate-limit";
import {
  fieldErrors,
  normalisePhone,
  onboardingSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
  type ActionState,
} from "@/lib/schemas";
import { parseJsonArray } from "@/lib/utils";

function splitList(value: string | undefined | null): string {
  return JSON.stringify(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12),
  );
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`signin:${ip}`, 12, 300);
  if (!limit.allowed) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const phone = normalisePhone(parsed.data.phone);
  const user = await db.user.findUnique({ where: { phone } });

  // Constant-ish response: never reveal whether the phone number exists.
  const valid = user ? verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) {
    return { ok: false, message: "That phone number and password do not match." };
  }

  await createSession(user.id);
  await audit(user.id, "SIGN_IN", "user", user.id);

  const next = String(formData.get("next") ?? "");
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : ROLE_HOME[user.role as keyof typeof ROLE_HOME];
  redirect(destination);
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
    language: formData.get("language") ?? "hi",
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

  const phone = normalisePhone(parsed.data.phone);
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    return {
      ok: false,
      message: "An account already exists for this number. Sign in instead.",
    };
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      phone,
      role: parsed.data.role,
      passwordHash: hashPassword(parsed.data.password),
      language: parsed.data.language,
    },
  });

  await createSession(user.id);
  await audit(user.id, "SIGN_UP", "user", user.id, { role: user.role });
  redirect("/onboarding");
}

export async function signOutAction() {
  const user = await requireUser().catch(() => null);
  if (user) await audit(user.id, "SIGN_OUT", "user", user.id);
  await destroySession();
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

  await db.user.update({
    where: { id: user.id },
    data: {
      language: data.language,
      state: data.state,
      district: data.district,
      village: data.village,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
    },
  });

  if (user.role === "FARMER" && data.farmName) {
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

  if (user.role === "BUYER" && data.businessName) {
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

  if (user.role === "TRANSPORTER" && data.vehicleType) {
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
  redirect(ROLE_HOME[user.role]);
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

/** Used by the profile page to preview saved produce categories. */
export async function readProfileLists(userId: string) {
  const farm = await db.farm.findUnique({ where: { userId } });
  const business = await db.businessProfile.findUnique({ where: { userId } });
  return {
    primaryCrops: parseJsonArray(farm?.primaryCrops),
    preferredCommodities: parseJsonArray(business?.preferredCommodities),
  };
}
