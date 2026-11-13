import "server-only";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { ROLE_HOME, type Language, type Role, type SessionUser } from "@/lib/domain";

/**
 * Identity and authorisation.
 *
 * One mechanism, two ways in:
 *   • email + password — scrypt hash in `User.passwordHash`
 *   • Google OAuth — `User.googleId`, linked in /api/auth/google/callback
 *
 * Both end here: a random token in an httpOnly cookie (`mr_session`), stored in
 * the `Session` table with an expiry. Nothing is trusted from the client except
 * that opaque token, and every page and server action resolves the user through
 * `getSessionUser()`, so a forged cookie reaches a redirect, never data.
 *
 * Supabase Auth is deliberately not used: no phone OTP, no `auth.uid()`, no
 * provider session to refresh. The database is plain Postgres.
 */

const COOKIE_NAME = "mr_session";
const SESSION_DAYS = 30;

/* ── Passwords ─────────────────────────────────────────────────────── */

export { hashPassword, verifyPassword } from "@/lib/password";

/** Emails are stored and compared lower-cased; anything else is a bug. */
export function normaliseEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/* ── Sessions ──────────────────────────────────────────────────────── */

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

function toSessionUser(u: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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
    email: u.email,
    // Contact number is optional until onboarding finishes; an empty string
    // keeps every caller's `maskPhone` graceful instead of widening the type.
    phone: u.phone ?? "",
    role: u.role as Role,
    language: u.language as Language,
    state: u.state,
    district: u.district,
    village: u.village,
    verified: u.verified,
  };
}

/**
 * The signed-in application user, or null. Cached per request: a page with
 * several server components resolves the session once.
 *
 * Expired sessions are deleted on sight, so a cookie that outlives its row can
 * never be replayed.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    select: { id: true, expiresAt: true, user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return toSessionUser(session.user);
});

/** Returns the user or redirects to /auth with a return path. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(returnTo ?? "/")}`);
  }
  return user;
}

/** Where a signed-in user belongs: onboarding until a phone is on file. */
export function homeFor(user: SessionUser) {
  return user.phone ? ROLE_HOME[user.role] : "/onboarding";
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

/** Ends the session: the row is deleted, so the token can never be reused. */
export async function signOutUser() {
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
