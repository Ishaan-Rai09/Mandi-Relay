import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Browser Supabase client. Only the public anon key is used here; it is
 * designed to be exposed and every table is protected by Row Level Security.
 * The service-role key never reaches the browser.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
