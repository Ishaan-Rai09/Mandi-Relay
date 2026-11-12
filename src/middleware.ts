import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_AUTH_COOKIE_PREFIX,
  SUPABASE_URL,
  supabaseConfigured,
} from "@/lib/supabase/config";

/**
 * First gate for authenticated areas, plus the Supabase session refresher.
 *
 * Supabase access tokens are short-lived, so the cookie has to be rotated on
 * every request; doing it here keeps server components free of write attempts
 * (their cookie store is read-only). The gate after it only checks whether a
 * session cookie exists — it deliberately does not decide authorisation. Every
 * layout and server action still validates the session and the user's role,
 * so a forged cookie reaches a redirect, never data.
 */
const PROTECTED = ["/farmer", "/buyer", "/transporter", "/admin", "/notifications", "/onboarding"];

const LOCAL_COOKIE = "mr_session";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (supabaseConfigured()) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Touching the user rotates the session cookie when it is near expiry.
    await supabase.auth.getUser();
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return response;

  const hasSession = supabaseConfigured()
    ? request.cookies
        .getAll()
        .some(
          (cookie) =>
            cookie.name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) &&
            cookie.name.includes("-auth-token"),
        )
    : Boolean(request.cookies.get(LOCAL_COOKIE)?.value);

  if (hasSession) return response;

  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/farmer/:path*",
    "/buyer/:path*",
    "/transporter/:path*",
    "/admin/:path*",
    "/notifications",
    "/onboarding",
  ],
};
