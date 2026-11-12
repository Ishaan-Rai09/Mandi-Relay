import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { marketFeedConfigured } from "@/lib/services/market-prices";
import { supabaseConfigured } from "@/lib/supabase/config";

/**
 * Readiness probe. Reports what is wired up without leaking any secret: booleans
 * and counts only. Returns 503 when the database is unreachable, which is the
 * one dependency every page needs.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  const body = {
    ok: database === "ok",
    database,
    counts,
    integrations: {
      supabaseAuth: supabaseConfigured() ? "supabase-phone-otp" : "local-development-provider",
      speechToText: process.env.GNANI_API_KEY ? "gnani-prisma" : "not-configured",
      marketPriceFeed: marketFeedConfigured() ? "agmarknet" : "not-configured",
      extraction: (process.env.AI_PROVIDER ?? "rules") === "llm" && process.env.AI_API_KEY ? "llm" : "rules-engine",
    },
    features: { auctions: auctionsEnabled },
    latencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
