"use server";

import { headers } from "next/headers";

import { understandListing, activeProviderLabel } from "@/lib/ai/provider";
import { parseSearch, searchToQueryString } from "@/lib/ai/search";
import type { ExtractedListing } from "@/lib/ai/extract";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export interface ExtractionResponse {
  ok: boolean;
  extraction?: ExtractedListing;
  provider?: string;
  error?: string;
}

/**
 * Runs the real extraction pipeline. Used by the public playground on the
 * landing page and by the farmer voice-listing screen, so the demo on the
 * marketing site is the production path rather than a mock.
 */
export async function extractListingAction(transcript: string): Promise<ExtractionResponse> {
  const text = transcript.trim();
  if (text.length < 4) {
    return { ok: false, error: "Say or type a little more about your produce." };
  }
  if (text.length > 1200) {
    return { ok: false, error: "That is longer than we can parse. Keep it to one or two sentences." };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`extract:${ip}`, 40, 60);
  if (!limit.allowed) {
    return { ok: false, error: "Too many requests. Please wait a moment." };
  }

  const user = await getSessionUser();
  const defaults = user
    ? await db.user
        .findUnique({
          where: { id: user.id },
          select: { village: true, district: true, state: true, lat: true, lng: true },
        })
        .then((row) =>
          row
            ? {
                location: row.village ?? row.district,
                district: row.district,
                state: row.state,
                lat: row.lat,
                lng: row.lng,
              }
            : {},
        )
    : {};

  const extraction = await understandListing(text, defaults);

  if (user) {
    await db.voiceSession
      .create({
        data: {
          userId: user.id,
          kind: "LISTING",
          transcript: text,
          language: extraction.language,
          parsed: JSON.stringify(extraction),
          provider: extraction.provider,
        },
      })
      .catch(() => undefined);
  }

  return { ok: true, extraction, provider: activeProviderLabel() };
}

export interface SearchParseResponse {
  ok: boolean;
  parsed?: ReturnType<typeof parseSearch>;
  queryString?: string;
  error?: string;
}

export async function parseSearchAction(text: string): Promise<SearchParseResponse> {
  const trimmed = text.trim();
  if (trimmed.length < 3) return { ok: false, error: "Say what produce you are looking for." };

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`search-parse:${ip}`, 60, 60);
  if (!limit.allowed) return { ok: false, error: "Too many searches. Wait a moment and try again." };

  const user = await getSessionUser();
  const origin = user
    ? await db.user
        .findUnique({ where: { id: user.id }, select: { lat: true, lng: true } })
        .then((row) => (row ? { lat: row.lat, lng: row.lng } : undefined))
    : undefined;

  const parsed = parseSearch(trimmed, origin);
  return { ok: true, parsed, queryString: searchToQueryString(parsed) };
}
