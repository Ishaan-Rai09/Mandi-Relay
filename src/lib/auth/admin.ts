import "server-only";

import { normaliseEmail } from "@/lib/auth";

/**
 * Emails that become administrators, from `ADMIN_EMAILS="a@x.com,b@y.com"`.
 *
 * Roles are never accepted from the client, so this allowlist is the only way
 * to mint an administrator: whatever the form says, an allowlisted email is an
 * ADMIN. Keep it in the environment, never in the database or the repo.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => normaliseEmail(value))
    .filter(Boolean);
  return list.includes(normaliseEmail(email));
}
