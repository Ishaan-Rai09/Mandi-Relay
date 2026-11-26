import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { marketFeedConfigured } from "@/lib/services/market-prices";
import { googleConfigured } from "@/lib/auth/google";

/**
 * Readiness probe. Reports what is wired up without leaking any secret: booleans
 * and counts only. Returns 503 when the database is unreachable, which is the
 * one dependency every page needs.
 *
 * Reachability is public — an uptime monitor needs nothing else. Counts and the
 * integration list describe the business to anyone who asks, so they are only
 * returned when the caller proves it holds HEALTH_CHECK_SECRET.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Constant-time secret check; a wrong length cannot leak through timing. */
function authorised(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) return false;

  const given =
    request.headers.get("x-health-secret") ?? new URL(request.url).searchParams.get("key");
  if (!given) return false;

  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  let database = "unreachable";
  let counts: { users: number; listings: number; priceReferences: number } | null = null;

  try {
    const [users, listings, priceReferences] = await Promise.all([
      db.user.count(),
      db.listing.count(),
      db.priceReference.count(),
    ]);
    database = "ok";
    counts = { users, listings, priceReferences };
  } catch {
    database = "unreachable";
  }

  const detailed = authorised(request);

  const body = {
    ok: database === "ok",
    database,
    ...(detailed
      ? {
          counts,
          integrations: {
            auth: googleConfigured() ? "email-password+google" : "email-password",
            speechToText: process.env.GNANI_API_KEY ? "gnani-prisma" : "not-configured",
            marketPriceFeed: marketFeedConfigured() ? "agmarknet" : "not-configured",
            extraction:
              (process.env.AI_PROVIDER ?? "rules") === "llm" && process.env.AI_API_KEY
                ? "llm"
                : "rules-engine",
          },
          features: { auctions: auctionsEnabled },
        }
      : {}),
    latencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
