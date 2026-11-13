import { NextResponse, type NextRequest } from "next/server";

import { audit, createSession, normaliseEmail } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  GOOGLE_COOKIE,
  exchangeCode,
  fetchProfile,
  googleConfigured,
  requestOrigin,
} from "@/lib/auth/google";
import { db } from "@/lib/db";
import { ROLE_HOME, type Role } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OAuthCookie {
  state: string;
  verifier: string;
  next: string | null;
}

function readCookie(raw: string | undefined): OAuthCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthCookie;
    if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Google's answer comes back here.
 *
 * The state cookie must match the state Google echoed, otherwise the response
 * is not the one we started and is discarded. Once the code is exchanged we
 * read the profile from Google's userinfo endpoint and link it to a `User`:
 *
 *   • same googleId, or same email  → sign in, remembering the googleId
 *   • nobody                         → create the account, then send the person
 *                                      to onboarding to pick a role and phone
 *
 * Only Google-verified email addresses are accepted: linking an account by an
 * address Google has not verified would let anyone claim it.
 */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);

  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/auth?error=google-not-configured", origin));
  }

  const url = new URL(request.url);
  const saved = readCookie(request.cookies.get(GOOGLE_COOKIE)?.value);

  const clear = (response: NextResponse) => {
    // Same path the cookie was written with, otherwise the browser keeps it.
    response.cookies.set(GOOGLE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return response;
  };

  const fail = (code: string) =>
    clear(NextResponse.redirect(new URL(`/auth?error=${code}`, origin)));

  if (!saved) return fail("expired");
  if (url.searchParams.get("error")) return fail("cancelled");
  if (url.searchParams.get("state") !== saved.state) return fail("state");

  const code = url.searchParams.get("code");
  if (!code) return fail("no-code");

  const accessToken = await exchangeCode({ code, verifier: saved.verifier, origin });
  if (!accessToken) return fail("exchange");

  const profile = await fetchProfile(accessToken);
  if (!profile) return fail("profile");
  if (!profile.emailVerified) return fail("email-unverified");

  const email = normaliseEmail(profile.email);

  let user = await db.user.findFirst({
    where: { OR: [{ googleId: profile.sub }, { email }] },
  });

  if (user) {
    // First Google sign-in for an account created with a password.
    if (!user.googleId) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.sub,
          avatarUrl: user.avatarUrl ?? profile.picture,
        },
      });
    }
    await audit(user.id, "SIGN_IN", "user", user.id, { provider: "google" });
  } else {
    // Role is chosen at onboarding, which every phone-less account lands on.
    user = await db.user.create({
      data: {
        email,
        googleId: profile.sub,
        name: profile.name,
        role: "FARMER",
        language: "en",
        avatarUrl: profile.picture,
      },
    });
    await audit(user.id, "SIGN_UP", "user", user.id, { provider: "google" });
  }

  const admin = isAdminEmail(user.email);
  if (admin && user.role !== "ADMIN") {
    user = await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  await createSession(user.id);

  const destination =
    saved.next ??
    (user.role === "ADMIN" ? ROLE_HOME.ADMIN : user.phone ? ROLE_HOME[user.role as Role] : "/onboarding");

  return clear(NextResponse.redirect(new URL(destination, origin)));
}
