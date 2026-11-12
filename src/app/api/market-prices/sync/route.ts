import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  marketFeedConfigured,
  marketFeedStatus,
  syncMarketPrices,
} from "@/lib/services/market-prices";

/**
 * Price feed ingestion endpoint, for a scheduler (Vercel Cron, GitHub Actions,
 * a cron box) rather than a browser.
 *
 * Authenticate one of two ways:
 *   - `x-sync-secret: <MARKET_PRICES_SYNC_SECRET>` (or `Authorization: Bearer …`)
 *   - an ADMIN session, which is what the admin console uses when someone
 *     presses "Sync now"
 *
 * GET reports feed health without touching the network.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorised(request: Request): Promise<boolean> {
  const secret = process.env.MARKET_PRICES_SYNC_SECRET;
  if (secret) {
    const header = request.headers.get("x-sync-secret");
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header === secret || bearer === secret) return true;
  }

  const user = await getSessionUser();
  return user?.role === "ADMIN";
}

export async function GET() {
  const status = await marketFeedStatus();
  return NextResponse.json({
    ...status,
    hint: status.configured
      ? undefined
      : "Set AGMARKNET_API_KEY to enable the official feed.",
  });
}

export async function POST(request: Request) {
  if (!marketFeedConfigured()) {
    return NextResponse.json(
      { error: "AGMARKNET_API_KEY is not set.", code: "FEED_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!(await authorised(request))) {
    return NextResponse.json(
      { error: "Not authorised. Send x-sync-secret or sign in as an administrator." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    state?: string;
    limit?: number;
  };

  try {
    const result = await syncMarketPrices({
      state: typeof body.state === "string" ? body.state : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not sync the price feed.",
        code: "FEED_ERROR",
      },
      { status: 502 },
    );
  }
}
