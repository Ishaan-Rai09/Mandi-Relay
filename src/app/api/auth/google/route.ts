import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  GOOGLE_COOKIE,
  authorizationUrl,
  googleConfigured,
  pkcePair,
  requestOrigin,
} from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A post-auth destination must be an internal, single-slash path. */
function safeNext(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value.slice(0, 300) : null;
}

/**
 * Starts the Google flow: mint state + PKCE, park them in an httpOnly cookie
 * for ten minutes, and hand the browser to Google. Nothing about the eventual
 * user is decided here.
 */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);

  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/auth?error=google-not-configured", origin));
  }

  const state = randomBytes(16).toString("hex");
  const { verifier, challenge } = pkcePair();
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const response = NextResponse.redirect(new URL(authorizationUrl({ origin, state, challenge })));

  response.cookies.set(
    GOOGLE_COOKIE,
    Buffer.from(JSON.stringify({ state, verifier, next })).toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/google",
      maxAge: 600,
    },
  );

  return response;
}
