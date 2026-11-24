/**
 * Creates (or repairs) an administrator account so the credentials on file
 * actually reach `/admin`.
 *
 * An email only becomes an administrator through `ADMIN_EMAILS`; this script
 * writes the matching account row with a real scrypt hash so the sign-in form
 * has something to verify against. Safe to re-run: an existing account is
 * updated in place (role, name, password) rather than duplicated.
 *
 *   npx tsx scripts/ensure-admin.ts --email you@example.com --password '…'
 *   npx tsx scripts/ensure-admin.ts            # ADMIN_EMAIL / ADMIN_PASSWORD
 *
 * Nothing here is seeded by `db:seed`, and the password is never stored in the
 * repo — pass it on the command line or through the environment.
 */
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? "";
  const name = arg("name") ?? process.env.ADMIN_NAME ?? "Administrator";

  if (!email) throw new Error("Missing email. Pass --email or set ADMIN_EMAIL.");
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters, matching the sign-up rule.");
  }

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!allowlist.includes(email)) {
    console.warn(
      `\nWarning: ${email} is not in ADMIN_EMAILS. Add it to .env or the account will ` +
        `sign in as a normal user and /admin will stay closed.\n`,
    );
  }

  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role: "ADMIN",
      passwordHash: hashPassword(password),
      language: "en",
    },
    update: {
      name,
      role: "ADMIN",
      passwordHash: hashPassword(password),
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`\nAdministrator ready: ${user.email} (${user.role})`);
  console.log(`Sign in at /auth, then /admin will open.\n`);
}

main()
  .catch((error) => {
    console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
