import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing, deliberately dependency-free.
 *
 * scrypt with a 16-byte random salt per password, 64-byte derived key. The
 * comparison is constant-time, so a wrong password costs the same as a right
 * one. Kept in its own module (no `server-only`, no database) so it can be
 * exercised directly by tests and scripts.
 */

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
