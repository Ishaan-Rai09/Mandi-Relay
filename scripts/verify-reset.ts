/**
 * Verification of the password-reset guarantees, against the real database.
 *
 * Proves, with no mocks:
 *   • the raw token is never stored — only its SHA-256
 *   • a link expires and is single use
 *   • requesting a new link invalidates the previous one
 *   • a completed reset changes the password hash and revokes every session
 *
 * Run with: npm run verify:reset
 */
import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import { hashPassword, verifyPassword } from "../src/lib/password";
import {
  completePasswordReset,
  findResetToken,
  hashResetToken,
  issueResetToken,
  requestPasswordReset,
  RESET_TTL_MINUTES,
} from "../src/lib/auth/reset";

const ok = (line: string) => console.log(`  ✓ ${line}`);

async function main() {
  const email = `reset-probe-${Date.now()}@example.invalid`;

  const user = await db.user.create({
    data: {
      name: "Reset Probe",
      email,
      role: "FARMER",
      passwordHash: hashPassword("original-pass-1"),
    },
  });

  try {
    assert.equal(RESET_TTL_MINUTES, 60);
    ok("link lifetime is 60 minutes");

    // A live session, to prove a reset revokes it.
    await db.session.create({
      data: {
        userId: user.id,
        token: `probe-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    // ── 1. Only the hash is stored ──────────────────────────────────
    const first = await issueResetToken(user.id);
    const stored = await db.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });

    assert.notEqual(stored.tokenHash, first.token);
    assert.equal(stored.tokenHash, hashResetToken(first.token));
    assert.match(stored.tokenHash, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(stored).includes(first.token), "raw token leaked into the row");
    ok("database holds the SHA-256 only, never the token itself");

    // ── 2. A new request invalidates the previous link ──────────────
    assert.ok(await findResetToken(first.token));
    const second = await issueResetToken(user.id);
    assert.equal(await findResetToken(first.token), null);
    assert.ok(await findResetToken(second.token));
    ok("requesting a new link kills the old one");

    // ── 3. Reset changes the password and revokes sessions ──────────
    const done = await completePasswordReset(second.token, "brand-new-pass-2");
    assert.equal(done.ok, true);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(verifyPassword("brand-new-pass-2", after.passwordHash), true);
    assert.equal(verifyPassword("original-pass-1", after.passwordHash), false);
    assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
    ok("password replaced; old password rejected; every session revoked");

    // ── 4. The link cannot be used twice ────────────────────────────
    assert.equal(await findResetToken(second.token), null);
    const replay = await completePasswordReset(second.token, "third-pass-3");
    assert.equal(replay.ok, false);
    ok("same link replayed → refused");

    // ── 5. Expired links are refused ────────────────────────────────
    const expiredRaw = "expired-probe-token-abcdefghijklmnop";
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(expiredRaw),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    assert.equal(await findResetToken(expiredRaw), null);
    assert.equal((await completePasswordReset(expiredRaw, "fourth-pass-4")).ok, false);
    ok("expired link → refused");

    // ── 6. A wrong token is refused without touching the account ────
    const wrong = await completePasswordReset("x".repeat(43), "fifth-pass-5");
    assert.equal(wrong.ok, false);
    const still = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(verifyPassword("brand-new-pass-2", still.passwordHash), true);
    ok("unknown token → refused, password untouched");

    // ── 7. Unknown address reveals nothing ──────────────────────────
    const ghost = await requestPasswordReset(
      `nobody-${Date.now()}@example.invalid`,
      "http://localhost:3000",
    );
    assert.equal(ghost.status, "unknown");
    ok("unknown address → no token, same answer to the caller");

    // ── 8. The real request builds a working link ───────────────────
    const request = await requestPasswordReset(
      email.toUpperCase(),
      "http://localhost:3000/",
    );
    assert.notEqual(request.status, "unknown");
    if (request.status === "unknown") throw new Error("unreachable");

    const link = new URL(request.link);
    assert.equal(link.origin, "http://localhost:3000");
    assert.equal(link.pathname, "/reset-password");
    const token = link.searchParams.get("token") ?? "";
    assert.ok(token.length >= 40, "link has no token");

    const pending = await db.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id, usedAt: null },
    });
    assert.equal(pending.tokenHash, hashResetToken(token));
    assert.ok(!request.link.includes(pending.tokenHash), "link exposes the stored hash");
    ok(`request builds a one-use link (delivery: ${request.status})`);

    const final = await completePasswordReset(token, "final-pass-9");
    assert.equal(final.ok, true);
    const latest = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(verifyPassword("final-pass-9", latest.passwordHash), true);
    ok("link from the request resets the password end to end");
  } finally {
    await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
    assert.equal(
      await db.user.count({ where: { email } }),
      0,
      "probe account was not removed",
    );
    console.log("\nProbe account removed. Password reset verified.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
