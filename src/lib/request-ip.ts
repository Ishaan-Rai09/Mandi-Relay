/**
 * The caller's address, as far as it can be known.
 *
 * `x-forwarded-for` is a list that the caller can pre-fill, so its first entry
 * is whatever the client wants it to be — keying a rate limiter on it lets an
 * attacker mint a fresh bucket per request by sending a new value. The platform
 * edge writes `x-real-ip`, and appends its own hop to the forwarded list, so
 * prefer `x-real-ip` and fall back to the *last* hop rather than the first.
 *
 * A missing header (local development, direct requests) resolves to "local",
 * which keeps every caller on one shared bucket instead of an unlimited one.
 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const hops =
    headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((hop) => hop.trim())
      .filter(Boolean) ?? [];

  // Last hop: written by the proxy closest to us, not by the caller.
  if (hops.length > 0) return hops[hops.length - 1];

  return "local";
}
