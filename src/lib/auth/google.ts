import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Google OAuth 2.0 (authorization code + PKCE), hand-rolled.
 *
 * There is no session library involved: Google proves who the caller is, the
 * callback links that identity to a `User` row, and `createSession()` issues
 * the same cookie a password sign-in would. That keeps one session mechanism
 * for both entry points instead of two.
 *
 * Setup: Google Cloud console → APIs & Services → Credentials → Create OAuth
 * client ID (Web application) → Authorised redirect URI must exactly match
 *
 *     http://localhost:3000/api/auth/google/callback        (development)
 *     https://your-domain/api/auth/google/callback          (production)
 *
 * then set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
 */

export const GOOGLE_COOKIE = "mr_google_oauth";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The public origin of this request. Reverse proxies terminate TLS and rewrite
 * the host, so the forwarded headers win when present.
 */
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export function redirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

/** PKCE pair for one authorization attempt. */
export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizationUrl(input: {
  origin: string;
  state: string;
  challenge: string;
  prompt?: string;
}) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(input.origin),
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: input.prompt ?? "select_account",
    access_type: "online",
    include_granted_scopes: "true",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Trades the one-time code for an access token. The code is bound to our PKCE
 * verifier and to the exact redirect URI, so an intercepted code is useless.
 */
export async function exchangeCode(input: {
  code: string;
  verifier: string;
  origin: string;
}): Promise<string | null> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri(input.origin),
    grant_type: "authorization_code",
    code_verifier: input.verifier,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;
  const json = (await response.json().catch(() => null)) as { access_token?: string } | null;
  return json?.access_token ?? null;
}

/**
 * Reads the profile from Google's own userinfo endpoint over TLS, using the
 * token we just received from Google. No JWT parsing or key management, and
 * nothing in the response is client-controlled.
 */
export async function fetchProfile(accessToken: string): Promise<GoogleProfile | null> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return null;
  const json = (await response.json().catch(() => null)) as
    | { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string }
    | null;

  if (!json?.sub || !json.email) return null;

  return {
    sub: json.sub,
    email: json.email.trim().toLowerCase(),
    emailVerified: json.email_verified === true,
    name: (json.name ?? json.email.split("@")[0]).trim().slice(0, 80),
    picture: json.picture ?? null,
  };
}
