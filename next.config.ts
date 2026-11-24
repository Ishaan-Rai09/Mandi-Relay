import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every response.
 *
 * The CSP is only sent in production: the development server needs inline
 * scripts and eval for React Refresh, and a policy strict enough to matter
 * would break hot reload without telling anyone anything useful.
 */
const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next ships its bootstrap and hydration payload as inline scripts.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Speech recognition uploads audio to our own route handler only.
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Navigation inside a workspace is dynamic (the session cookie is read on
    // every render), so Next would otherwise re-fetch the whole route from the
    // server on every click, including back/forward. Keeping the client router
    // cache warm for a short window makes revisits and history navigation
    // instant, while mutations still refresh through revalidatePath and every
    // fresh page load is server-rendered.
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
