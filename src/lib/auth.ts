import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { ROLE_HOME, type Language, type Role, type SessionUser } from "@/lib/domain";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Identity and authorisation.
 *
 * Two providers share one public surface, so every page and action keeps
 * calling `getSessionUser()`, `requireRole()` and `assertRole()`:
 *
 *  - Supabase (production): phone-number OTP. Supabase owns the session cookie
 *    and refreshes it; this module only maps `auth.users.id` / phone onto the
 *    application's own `User` row, which is where roles and profiles live.
 *  - Local (development, no Supabase keys): a database-backed session cookie
 *    with a scrypt password. Never used once Supabase is configured.
 *
 * The local primitives stay exported because they are the fallback's whole
 * implementation and because the verification script signs in with them.
 */

const COOKIE_NAME = "mr_session";
const SESSION_DAYS = 30;

/* ── Local provider primitives ─────────────────────────────────────── */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const hdrs = await headers();

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      userAgent: hdrs.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => undefined);
  }
  jar.delete(COOKIE_NAME);
}

/* ── Identity ──────────────────────────────────────────────────────── */

/** Who the caller is, before we know whether they finished signing up. */
export interface AuthIdentity {
  /** Supabase `auth.users.id`; null on the local provider. */
  authUserId: string | null;
  /** E.164 phone number proven by the provider. */
  phone: string;
}

export const authProvider = supabaseConfigured() ? "supabase" : "local";

/**
 * Resolves the caller's identity from whichever provider is configured.
 * Cached per request: a page with several server components asks once.
 */
export const getAuthIdentity = cache(async (): Promise<AuthIdentity | null> => {
  if (supabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // A phone-OTP user always has a phone. Email-only users are not part of
    // this product, so they are treated as unidentified.
    const phone = user.phone ?? (user.user_metadata?.phone as string | undefined) ?? "";
    if (!phone) return null;
    return { authUserId: user.id, phone: normalisePhone(phone) };
  }

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    select: { id: true, expiresAt: true, user: { select: { phone: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { authUserId: null, phone: session.user.phone };
});

function toSessionUser(u: {
  id: string;
  name: string;
  phone: string;
  role: string;
  language: string;
  state: string | null;
  district: string | null;
  village: string | null;
  verified: boolean;
}): SessionUser {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role as Role,
    language: u.language as Language,
    state: u.state,
    district: u.district,
    village: u.village,
    verified: u.verified,
  };
}

/**
 * The signed-in application user. Null when the caller is anonymous *or* has
 * proven a phone number but has not created a profile yet — that state is what
 * `/onboarding` resolves.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const row = await db.user.findFirst({
    where: identity.authUserId
      ? { OR: [{ authUserId: identity.authUserId }, { phone: identity.phone }] }
      : { phone: identity.phone },
  });
  if (!row) return null;

  // First sign-in after a phone change, or a row created before the Supabase
  // id was stored: bind them together now so later lookups are a single field.
  if (identity.authUserId && row.authUserId !== identity.authUserId) {
    await db.user
      .update({ where: { id: row.id }, data: { authUserId: identity.authUserId } })
      .catch(() => undefined);
  }

  return toSessionUser(row);
});

/** Returns the user or redirects to /auth with a return path. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(returnTo ?? "/")}`);
  }
  return user;
}

/** Like `requireUser`, but also accepts a verified phone without a profile. */
export async function requireIdentity(returnTo?: string): Promise<AuthIdentity> {
  const identity = await getAuthIdentity();
  if (!identity) {
    redirect(`/auth?next=${encodeURIComponent(returnTo ?? "/")}`);
  }
  return identity;
}

/**
 * Route protection for role-scoped areas. Admins are allowed into every area
 * only for read-only support tooling; they get their own console otherwise.
 */
export async function requireRole(role: Role | Role[], returnTo?: string): Promise<SessionUser> {
  const allowed = Array.isArray(role) ? role : [role];
  const user = await requireUser(returnTo);
  if (!allowed.includes(user.role)) {
    redirect(ROLE_HOME[user.role]);
  }
  return user;
}

/** Thrown inside server actions when the caller lacks permission. */
export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function assertRole(role: Role | Role[]): Promise<SessionUser> {
  const allowed = Array.isArray(role) ? role : [role];
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Please sign in to continue.");
  if (!allowed.includes(user.role)) throw new AuthorizationError();
  return user;
}

/** Ends the session on whichever provider is configured. */
export async function signOutUser() {
  if (supabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut().catch(() => undefined);
  }
  await destroySession();
}

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
  await db.auditLog
    .create({
      data: {
        actorId: actorId ?? undefined,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip,
      },
    })
    .catch(() => undefined);
}

/* ── Helpers shared with the auth actions ──────────────────────────── */

/** Normalises any provider phone format to +91XXXXXXXXXX. */
export function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  const last10 = digits.slice(-10);
  return `+91${last10}`;
}
