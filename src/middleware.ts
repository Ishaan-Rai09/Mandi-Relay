import { NextResponse, type NextRequest } from "next/server";

/**
 * First gate for authenticated areas. This runs on the edge and only checks for
 * the presence of a session cookie — it deliberately does not decide authorisation.
 * The real check happens in every layout and server action, where the session is
 * validated against the database and the user's role is compared with the route.
 *
 * That split keeps redirects fast while ensuring a forged or stolen cookie cannot
 * reach data: the page will simply redirect again from the server layer.
 */
const PROTECTED = ["/farmer", "/buyer", "/transporter", "/admin", "/notifications", "/onboarding"];

const COOKIE_NAME = "mr_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) return NextResponse.next();

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
