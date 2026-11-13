import { NextResponse, type NextRequest } from "next/server";

/**
 * First gate for authenticated areas.
 *
 * The session is a random token in an httpOnly cookie, validated against the
 * `Session` table by `src/lib/auth.ts` on every page and server action. This
 * middleware only checks that a cookie exists, so a forged one reaches a
 * redirect rather than data; it deliberately makes no authorisation decision.
 */
const PROTECTED = ["/farmer", "/buyer", "/transporter", "/admin", "/notifications", "/onboarding"];

const COOKIE_NAME = "mr_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (request.cookies.get(COOKIE_NAME)?.value) return NextResponse.next();

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
