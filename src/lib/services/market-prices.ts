import { db } from "@/lib/db";

/**
 * Official market price feed — Agmarknet via data.gov.in.
 *
 * Agmarknet is the Directorate of Marketing & Inspection's mandi reporting
 * system: it publishes daily min/max/modal wholesale prices per commodity, per
 * market. Those are the only reference prices this product shows, and every row
 * keeps the market, the variety and the report date it came from. Nothing here
 * invents a number: if the feed is not configured the table stays empty and the
 * interface says so.
 *
 * Prices arrive in ₹ per quintal, which is how mandis quote. The UI converts to
 * ₹/kg for comparison with an asking price.
 *
 * Configure:
 *   AGMARKNET_API_KEY   data.gov.in API key (required)
 *   AGMARKNET_BASE_URL  optional, defaults to the Agmarknet resource
 *   AGMARKNET_STATE     optional state filter, e.g. "Punjab"
 */

const DEFAULT_RESOURCE =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const MAX_LIMIT = 1000;

export function marketFeedConfigured(): boolean {
  return Boolean(process.env.AGMARKNET_API_KEY);
}

export const MARKET_FEED_SOURCE = "Agmarknet · Directorate of Marketing & Inspection";

export interface FeedPrice {
  commodity: string;
  variety: string;
  market: string;
  district: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  reportDate: Date;
}

interface AgmarknetRecord {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
}

/** `arrival_date` is published as dd/mm/yyyy. */
function parseReportDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = new Date(value);
  if (Number.isNaN(iso.getTime())) return null;
  return new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));
}

function toPrice(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export interface FetchOptions {
  limit?: number;
  state?: string;
  commodity?: string;
  signal?: AbortSignal;
}

/** Raw feed read. Throws with a useful message on any transport problem. */
export async function fetchMarketPrices(options: FetchOptions = {}): Promise<FeedPrice[]> {
  const apiKey = process.env.AGMARKNET_API_KEY;
  if (!apiKey) {
    throw new Error("AGMARKNET_API_KEY is not set, so no official price feed is available.");
  }

  const base = process.env.AGMARKNET_BASE_URL || DEFAULT_RESOURCE;
  const limit = Math.min(Math.max(options.limit ?? MAX_LIMIT, 1), MAX_LIMIT);

  const url = new URL(base);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");

  const state = options.state ?? process.env.AGMARKNET_STATE ?? "";
  if (state) url.searchParams.set("filters[state.keyword]", state);
  if (options.commodity) url.searchParams.set("filters[commodity]", options.commodity);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: options.signal ?? AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 403 || response.status === 401
        ? "data.gov.in rejected the AGMARKNET_API_KEY."
        : `The Agmarknet feed answered ${response.status}.`,
    );
  }

  const payload = (await response.json()) as { records?: AgmarknetRecord[] };
  const records = payload.records ?? [];

  const rows: FeedPrice[] = [];
  for (const record of records) {
    const commodity = record.commodity?.trim();
    const market = record.market?.trim();
    const district = record.district?.trim();
    const stateName = record.state?.trim();
    const reportDate = parseReportDate(record.arrival_date);
    const minPrice = toPrice(record.min_price);
    const maxPrice = toPrice(record.max_price);
    const modalPrice = toPrice(record.modal_price);

    if (!commodity || !market || !district || !stateName || !reportDate) continue;
    if (minPrice == null || maxPrice == null || modalPrice == null) continue;

    rows.push({
      commodity: titleCase(commodity),
      variety: (record.variety ?? "").trim(),
      market: titleCase(market),
      district: titleCase(district),
      state: titleCase(stateName),
      minPrice,
      maxPrice,
      modalPrice,
      reportDate,
    });
  }

  return rows;
}

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  newestReportDate: string | null;
  source: string;
}

/**
 * Writes the feed into `PriceReference`. Idempotent: the same quotation from the
 * same market on the same day updates in place instead of duplicating.
 */
export async function syncMarketPrices(options: FetchOptions = {}): Promise<SyncResult> {
  const rows = await fetchMarketPrices(options);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let newest: Date | null = null;

  for (const row of rows) {
    if (row.maxPrice < row.minPrice || row.modalPrice <= 0) {
      skipped += 1;
      continue;
    }
    if (!newest || row.reportDate > newest) newest = row.reportDate;

    const key = {
      commodity: row.commodity,
      market: row.market,
      variety: row.variety,
      reportDate: row.reportDate,
    };

    const existing = await db.priceReference.findUnique({
      where: { commodity_market_variety_reportDate: key },
      select: { id: true, modalPrice: true, minPrice: true, maxPrice: true },
    });

    if (existing) {
      if (
        existing.modalPrice === row.modalPrice &&
        existing.minPrice === row.minPrice &&
        existing.maxPrice === row.maxPrice
      ) {
        skipped += 1;
        continue;
      }
      await db.priceReference.update({
        where: { id: existing.id },
        data: {
          minPrice: row.minPrice,
          maxPrice: row.maxPrice,
          modalPrice: row.modalPrice,
          district: row.district,
          state: row.state,
          source: MARKET_FEED_SOURCE,
          unit: "quintal",
        },
      });
      updated += 1;
      continue;
    }

    await db.priceReference.create({
      data: {
        ...key,
        district: row.district,
        state: row.state,
        minPrice: row.minPrice,
        maxPrice: row.maxPrice,
        modalPrice: row.modalPrice,
        source: MARKET_FEED_SOURCE,
        unit: "quintal",
      },
    });
    inserted += 1;
  }

  return {
    fetched: rows.length,
    inserted,
    updated,
    skipped,
    newestReportDate: newest ? newest.toISOString().slice(0, 10) : null,
    source: MARKET_FEED_SOURCE,
  };
}

/** Feed health for the admin console: what is loaded and how old it is. */
export async function marketFeedStatus() {
  const [count, newest, distinctCommodities] = await Promise.all([
    db.priceReference.count(),
    db.priceReference.findFirst({ orderBy: { reportDate: "desc" } }),
    db.priceReference.findMany({ distinct: ["commodity"], select: { commodity: true } }),
  ]);

  return {
    configured: marketFeedConfigured(),
    rows: count,
    commodities: distinctCommodities.length,
    lastReportDate: newest?.reportDate ?? null,
    source: newest?.source ?? null,
  };
}
