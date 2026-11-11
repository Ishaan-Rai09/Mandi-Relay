import type { CommodityUnit } from "@/lib/domain";
import { findCommodity, findPlace } from "@/lib/ai/lexicon";
import { parseQuantity } from "@/lib/ai/extract";

export type SearchSort = "relevance" | "newest" | "distance" | "price_asc" | "price_desc";

export interface ParsedSearch {
  commodity: string | null;
  commodityKey: string | null;
  categorySlug: string | null;
  quantityKg: number | null;
  maxPricePerKg: number | null;
  minPricePerKg: number | null;
  maxDistanceKm: number | null;
  place: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  sort: SearchSort;
  availableBy: string | null;
  keywords: string[];
  summary: string;
  understood: boolean;
}

/**
 * Converts a natural-language produce request into structured marketplace
 * filters.
 *
 *   "Find 200 kg of fresh onions within 30 kilometres of Mohali."
 *   -> { commodityKey: "onion", quantityKg: 200, maxDistanceKm: 30, place: "Mohali" }
 */
export function parseSearch(text: string, origin?: { lat?: number | null; lng?: number | null }): ParsedSearch {
  const lower = text.toLowerCase();
  const quantity = parseQuantity(text);
  const commodity = findCommodity(text);
  const place = findPlace(text);

  // Distance: "within 30 km", "30 kilometres", "nearby", "near me".
  let maxDistanceKm: number | null = null;
  const distanceMatch = lower.match(
    /(?:within|under|upto|up to|andar|ke andar)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kms|kilometers?|kilometres?|किमी|ਕਿਲੋਮੀਟਰ)/,
  );
  if (distanceMatch) maxDistanceKm = Number(distanceMatch[1].replace(",", "."));
  if (/\b(near me|nearby|paas|aas paas|around me|mere paas)\b/.test(lower) && maxDistanceKm == null) {
    maxDistanceKm = 50;
  }

  // Price: "under 25 rupees", "cheaper than 30", "below ₹20".
  let maxPricePerKg: number | null = null;
  let minPricePerKg: number | null = null;
  const underMatch = lower.match(
    /(?:under|below|less than|cheaper than|upto|se kam|kam mein)\s*(?:₹|rs\.?)?\s*(\d+(?:[.,]\d+)?)/,
  );
  if (underMatch) maxPricePerKg = Number(underMatch[1].replace(",", "."));
  const overMatch = lower.match(
    /(?:over|above|more than|se zyada|se jyada)\s*(?:₹|rs\.?)?\s*(\d+(?:[.,]\d+)?)/,
  );
  if (overMatch) minPricePerKg = Number(overMatch[1].replace(",", "."));

  let sort: SearchSort = "relevance";
  if (/\b(cheap(er|est)?|lower price|lowest price|sasta|saste|sasti|sabse sasta|price low)\b/.test(lower)) {
    sort = "price_asc";
  }
  else if (/\b(highest price|premium|mehnga|best price)\b/.test(lower)) sort = "price_desc";
  else if (/\b(nearest|closest|paas wala|paas ka)\b/.test(lower)) sort = "distance";
  else if (/\b(newest|latest|fresh listings|naya|naye)\b/.test(lower)) sort = "newest";
  else if (commodity && place) sort = "distance";

  // Availability: "available tomorrow" means available on or before that day.
  let availableBy: string | null = null;
  if (/\b(today|aaj|abhi)\b/.test(lower)) availableBy = new Date().toISOString();
  else if (/\b(tomorrow|kal)\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    availableBy = d.toISOString();
  }

  const keywords = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const lat = place?.lat ?? origin?.lat ?? null;
  const lng = place?.lng ?? origin?.lng ?? null;

  const clauses: string[] = [];
  if (commodity) clauses.push(commodity.name.toLowerCase());
  if (quantity) clauses.push(`${Math.round(quantity.kg)} kg`);
  if (maxDistanceKm) clauses.push(`within ${maxDistanceKm} km`);
  if (place) clauses.push(`of ${place.name}`);
  if (maxPricePerKg) clauses.push(`under ₹${maxPricePerKg}/kg`);

  return {
    commodity: commodity?.name ?? null,
    commodityKey: commodity?.key ?? null,
    categorySlug: commodity?.categorySlug ?? null,
    quantityKg: quantity?.kg ?? null,
    maxPricePerKg,
    minPricePerKg,
    maxDistanceKm,
    place: place?.name ?? null,
    district: place?.district ?? null,
    lat,
    lng,
    sort,
    availableBy,
    keywords,
    summary: clauses.length ? `Searching for ${clauses.join(" ")}` : "Showing all active listings",
    understood: Boolean(commodity || quantity || place || maxPricePerKg),
  };
}

const STOPWORDS = new Set([
  "find", "show", "me", "the", "for", "and", "with", "any", "some", "please",
  "search", "want", "need", "looking", "available", "near", "from", "all",
  "kilo", "kilos", "kg", "fresh", "good", "quality", "chahiye", "dikhao", "ka",
  "ki", "ko", "mein", "hai", "hain", "wala", "wale", "de", "do", "give",
]);

/** Builds a query string that the marketplace page understands. */
export function searchToQueryString(parsed: ParsedSearch): string {
  const params = new URLSearchParams();
  if (parsed.commodityKey) params.set("q", parsed.commodityKey);
  if (parsed.categorySlug) params.set("category", parsed.categorySlug);
  if (parsed.quantityKg) params.set("minQty", String(Math.round(parsed.quantityKg)));
  if (parsed.maxPricePerKg) params.set("maxPrice", String(parsed.maxPricePerKg));
  if (parsed.minPricePerKg) params.set("minPrice", String(parsed.minPricePerKg));
  if (parsed.maxDistanceKm) params.set("distance", String(parsed.maxDistanceKm));
  if (parsed.place) params.set("place", parsed.place);
  if (parsed.availableBy) params.set("availableBy", parsed.availableBy);
  if (parsed.sort !== "relevance") params.set("sort", parsed.sort);
  return params.toString();
}

/** Unit normalisation helper shared with listing ingestion. */
export function normaliseUnit(unit: string | null | undefined): CommodityUnit {
  const u = (unit ?? "kg").toLowerCase();
  if (["quintal", "kuntal"].includes(u)) return "quintal";
  if (["tonne", "ton", "tons"].includes(u)) return "tonne";
  if (["dozen", "darjan"].includes(u)) return "dozen";
  if (["piece", "nag", "pc"].includes(u)) return "piece";
  return "kg";
}
