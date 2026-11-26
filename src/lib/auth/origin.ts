import "server-only";

/**
 * The public origin of a request, pinned to something we can vouch for.
 *
 * `x-forwarded-host` is caller-controlled on most proxies, so building a
 * redirect target (or an OAuth `redirect_uri`) from it turns
 * /api/auth/google into an open redirect. Two rules instead:
 *
 *   1. When NEXT_PUBLIC_SITE_URL is configured, it is the only origin these
 *      routes will use. That is the deployment's real address, so redirects and
 *      the Google callback stay on it regardless of the headers.
 *   2. Otherwise a forwarded host is honoured only when it is one of our own
 *      deployment hosts — loopback, this Vercel deployment, or the configured
 *      site — and anything else falls back to the URL Next itself built.
 */

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/** `host[:port]` for a URL or a bare host; null when it is not parseable. */
function parseHost(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Hosts that can only be ours. */
function trustedHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const value of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    const host = parseHost(value);
    if (host) hosts.add(host);
  }
  return hosts;
}

export function isTrustedHost(host: string | null | undefined): boolean {
  const candidate = parseHost(host);
  if (!candidate) return false;
  return LOOPBACK.test(candidate) || trustedHosts().has(candidate);
}

/** The configured public origin, normalised, or null when it is not set. */
function configuredOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

/**
 * Origin for a route handler: the configured site, else a trusted forwarded
 * host, else the origin Next built from the real request.
 */
export function requestOrigin(request: Request): string {
  return originFromHeaders(request.headers) ?? new URL(request.url).origin;
}

/**
 * The same rule for code that only has `headers()` (server actions, route
 * handlers). Returns null when no origin can be vouched for, so the caller
 * decides the fallback instead of silently trusting a header.
 */
export function originFromHeaders(hdrs: { get(name: string): string | null }): string | null {
  const configured = configuredOrigin();
  if (configured) return configured;

  const forwarded = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!isTrustedHost(forwarded)) return null;

  const host = parseHost(forwarded);
  if (!host) return null;

  const forwardedProto = hdrs.get("x-forwarded-proto");
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : LOOPBACK.test(host)
        ? "http"
        : "https";

  return `${proto}://${host}`;
}
