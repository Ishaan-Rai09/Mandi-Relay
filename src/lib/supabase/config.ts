/**
 * Supabase configuration.
 *
 * Supabase hosts the Postgres database and is the only phone-number identity
 * provider. When its two public keys are absent the app falls back to the
 * built-in local provider (password + database session) so the project can
 * still be run offline — that path exists for development only and is never
 * used once Supabase is configured.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the browser and server can both reach a Supabase project. */
export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Where Supabase stores its auth cookie; used by the edge middleware gate. */
export const SUPABASE_AUTH_COOKIE_PREFIX = "sb-";
