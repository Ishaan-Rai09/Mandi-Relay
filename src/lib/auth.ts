import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { ROLE_HOME, type Language, type Role, type SessionUser } from "@/lib/domain";

const COOKIE_NAME = "mr_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
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

/**
 * Resolves the signed-in user for the current request. Cached per request so a
 * page with several server components only hits the database once.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const u = session.user;
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
    isDemo: u.isDemo,
  };
});

/** Returns the user or redirects to /auth with a return path. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(returnTo ?? "/")}`);
  }
  return user;
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
