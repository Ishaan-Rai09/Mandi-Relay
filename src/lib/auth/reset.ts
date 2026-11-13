import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { passwordResetMail, sendMail } from "@/lib/email";
import { hashPassword } from "@/lib/password";

/**
 * Password reset tokens.
 *
 * The raw token exists in exactly three places: the caller, the emailed URL and
 * this function's return value. The database stores only its SHA-256, so a
 * database leak does not hand anyone a working link, and the token is single
 * use with a one-hour life.
 *
 * Not marked `server-only` on purpose: like `src/lib/password.ts`, these
 * functions are pure database + crypto helpers so `scripts/verify-reset.ts` can
 * prove the behaviour instead of asserting it. Only server actions call them.
 */

export const RESET_TTL_MINUTES = 60;

/** Links are compared by hash, never by value, and never stored in the clear. */
export function hashResetToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Issues the only live link for an account, invalidating any previous one. */
export async function issueResetToken(userId: string) {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await db.passwordResetToken.deleteMany({ where: { userId } });
  await db.passwordResetToken.create({
    data: { userId, tokenHash: hashResetToken(raw), expiresAt },
  });

  return { token: raw, expiresAt };
}

/** What happened when a reset was requested for an address. */
export type ResetRequestOutcome =
  | { status: "unknown" }
  | { status: "sent"; userId: string; link: string }
  | { status: "not-configured"; userId: string; link: string }
  | { status: "failed"; userId: string; link: string; error: string };

/**
 * Issues the link and tries to email it.
 *
 * Never reveals whether the address has an account: the caller maps every
 * outcome to the same sentence, and only a development build shows the link.
 */
export async function requestPasswordReset(
  rawEmail: string,
  origin: string,
): Promise<ResetRequestOutcome> {
  const email = rawEmail.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { status: "unknown" };

  const { token } = await issueResetToken(user.id);
  const link = `${origin.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  const sent = await sendMail(
    passwordResetMail({ to: user.email, name: user.name, link, minutes: RESET_TTL_MINUTES }),
  );

  if (sent.ok) return { status: "sent", userId: user.id, link };
  if (sent.error === "not-configured") return { status: "not-configured", userId: user.id, link };
  return { status: "failed", userId: user.id, link, error: sent.error };
}

/** The account behind a still-usable token, or null. */
export async function findResetToken(raw: string) {
  if (raw.length < 20 || raw.length > 200) return null;

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(raw) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/**
 * Claims the token and sets the new password in one transaction.
 *
 * The claim is an `updateMany` guarded on `usedAt: null`, so two simultaneous
 * submissions of the same link cannot both succeed. Every session for the
 * account is deleted: if the reset happened because someone else had access,
 * signing them out is the point.
 */
export async function completePasswordReset(
  raw: string,
  newPassword: string,
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const row = await findResetToken(raw);
  if (!row) return { ok: false };

  const passwordHash = hashPassword(newPassword);

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("token-already-claimed");

      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      await tx.passwordResetToken.deleteMany({
        where: { userId: row.userId, id: { not: row.id } },
      });
      await tx.session.deleteMany({ where: { userId: row.userId } });
    });
  } catch {
    return { ok: false };
  }

  return { ok: true, userId: row.userId };
}
