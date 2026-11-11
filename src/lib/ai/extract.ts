import type { CommodityUnit, Language } from "@/lib/domain";
import {
  COMMODITIES,
  FRACTION_WORDS,
  GRADE_WORDS,
  NUMBER_WORDS,
  PLACES,
  UNIT_ALIASES,
  UNIT_PATTERN,
  findCommodity,
  findPlace,
  type CommodityEntry,
  type PlaceEntry,
} from "@/lib/ai/lexicon";

export type MissingField = "commodity" | "quantity" | "location" | "availableFrom";

export interface ExtractedListing {
  commodity: string | null;
  commodityKey: string | null;
  categorySlug: string | null;
  quantity: number | null;
  unit: CommodityUnit;
  availableFrom: string | null;
  availableLabel: string | null;
  location: string | null;
  district: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  askingPrice: number | null;
  priceIsMinimum: boolean;
  grade: string | null;
  pickupOnly: boolean | null;
  currency: "INR";
  missing: MissingField[];
  recommended: string[];
  confidence: number;
  language: Language | "auto";
  provider: "rules" | "llm";
  transcript: string;
  followUp: string | null;
  notes: string[];
}

/** Derived from the lexicon so a new unit or script can never drift. */
const UNIT_WORD = UNIT_PATTERN;

function toNumber(raw: string) {
  return Number(raw.replace(/,/g, "."));
}

interface QuantityMatch {
  kg: number;
  spokenUnit: string;
  originalValue: number;
  token: string;
}

/**
 * Resolves a spoken quantity to kilograms. Indian trade commonly uses quintals
 * and tonnes, so everything is normalised to kg for a coherent marketplace.
 */
export function parseQuantity(text: string): QuantityMatch | null {
  const lower = text.toLowerCase();

  // 1. Digits followed by a unit: "500 kg", "2.5 ton", "5 quintal".
  //    `\b` is ASCII-only in JavaScript, so a Unicode-aware lookahead is used
  //    to terminate the alias — otherwise Devanagari/Gurmukhi units never match.
  const digitUnit = new RegExp(
    `(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_WORD})(?![\\p{L}\\p{N}])`,
    "iu",
  );
  const dm = lower.match(digitUnit);
  if (dm) {
    const value = toNumber(dm[1]);
    const spokenUnit = dm[2].toLowerCase();
    const unit = normalizeUnitWord(spokenUnit);
    return { ...convert(value, unit), token: dm[0] };
  }

  // 2. Spoken numerals: "paanch sau kilo", "dedh sau kilo", "do sau pachaas kilo".
  const wordMatch = parseSpokenNumberBeforeUnit(lower);
  if (wordMatch) return wordMatch;

  // 3. Bare number of quintals is common: "500" alone is ambiguous, so we do
  //    not guess. Missing quantity triggers a follow-up instead.
  return null;
}

function normalizeUnitWord(word: string): CommodityUnit {
  for (const entry of UNIT_ALIASES) {
    if (entry.aliases.includes(word)) return entry.unit as CommodityUnit;
  }
  return "kg";
}

function convert(value: number, unit: CommodityUnit): Omit<QuantityMatch, "token"> {
  const factor =
    unit === "quintal" ? 100 : unit === "tonne" ? 1000 : unit === "dozen" ? 1 : 1;
  return {
    kg: Math.round(value * factor * 100) / 100,
    spokenUnit: unit,
    originalValue: value,
  };
}

function parseSpokenNumberBeforeUnit(text: string): QuantityMatch | null {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const unitIndex = tokens.findIndex((token) => {
    const clean = token.replace(/[^\p{L}]/gu, "");
    return UNIT_ALIASES.some((u) => u.aliases.includes(clean.toLowerCase()));
  });
  if (unitIndex < 1) return null;

  // Walk back from the unit collecting numeral words, stopping at a non-numeral.
  const collected: number[] = [];
  let fraction: number | null = null;
  let i = unitIndex - 1;
  while (i >= 0) {
    const clean = tokens[i].replace(/[^\p{L}\p{N}.]/gu, "").toLowerCase();
    if (!clean) break;
    if (!collected.length && FRACTION_WORDS[clean] != null) {
      fraction = FRACTION_WORDS[clean];
      i -= 1;
      continue;
    }
    if (!collected.length && /^\d+(\.\d+)?$/.test(clean)) {
      collected.push(Number(clean));
      i -= 1;
      continue;
    }
    const word = NUMBER_WORDS[clean];
    if (word == null) break;
    collected.unshift(word);
    i -= 1;
    if (collected.length >= 4) break;
  }

  if (!collected.length && fraction == null) return null;

  let value = 0;
  let current = 0;
  for (const n of collected) {
    if (n >= 100) {
      current = (current || 1) * n;
      value += current;
      current = 0;
    } else {
      current += n;
    }
  }
  value += current;
  if (fraction != null) value = value > 0 ? value * fraction : fraction;

  const unit = normalizeUnitWord(tokens[unitIndex].replace(/[^\p{L}]/gu, "").toLowerCase());
  return {
    ...convert(value, unit),
    token: `${tokens.slice(Math.max(0, i + 1), unitIndex + 1).join(" ")}`,
  };
}

export interface PriceMatch {
  perKg: number;
  isMinimum: boolean;
  raw: string;
}

/**
 * Extracts an asking price and normalises it to rupees per kilogram.
 * "20 rupaye kilo" -> 20/kg, "2000 rupaye quintal" -> 20/kg.
 */
export function parsePrice(text: string, quantity?: QuantityMatch | null): PriceMatch | null {
  const lower = text.toLowerCase();
  const currency = "(?:₹|rs\\.?|inr|rupaye|rupees|rupay|rupiya|रुपये|रुपए|ਰੁਪਏ)";

  const patterns = [
    new RegExp(`${currency}\\s*(\\d+(?:[.,]\\d+)?)`, "i"),
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${currency}`, "i"),
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:per|prati|/)\\s*(${UNIT_WORD})`, "i"),
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    const value = toNumber(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;

    // Which unit does this price refer to? Look just after the match.
    const after = lower.slice(match.index! + match[0].length, match.index! + match[0].length + 28);
    const unitMatch = after.match(
      new RegExp(`(?<![\\p{L}\\p{N}])(${UNIT_WORD})(?![\\p{L}\\p{N}])`, "iu"),
    );
    const unit = unitMatch
      ? normalizeUnitWord(unitMatch[1].toLowerCase())
      : quantity?.spokenUnit === "quintal" || quantity?.spokenUnit === "tonne"
        ? quantity.spokenUnit
        : "kg";

    const multiplier = unit === "quintal" ? 1 / 100 : unit === "tonne" ? 1 / 1000 : 1;
    const perKg = Math.round(value * multiplier * 100) / 100;

    // "20 rupaye se achha rate chahiye" reads as a floor, not a fixed price.
    const around = lower.slice(
      Math.max(0, match.index! - 10),
      match.index! + match[0].length + 24,
    );
    const isMinimum = /se (achha|accha|zyada|jyada|upar|badhiya)|minimum|at least|above|se kam nahi/i.test(
      around,
    );

    return { perKg, isMinimum, raw: match[0].trim() };
  }

  // Spoken price: "bees rupaye" / "pachaas rupaye".
  const spoken = lower.match(
    new RegExp(
      `((?:${Object.keys(NUMBER_WORDS).join("|")})(?:\\s+(?:${Object.keys(NUMBER_WORDS).join("|")}))?)\\s+(?:rupaye|rupees|rupay)`,
      "i",
    ),
  );
  if (spoken) {
    const parts = spoken[1].split(/\s+/).map((p) => NUMBER_WORDS[p.toLowerCase()] ?? 0);
    const value = parts.reduce((acc, n) => (n >= 100 ? (acc || 1) * n : acc + n), 0);
    if (value > 0) return { perKg: value, isMinimum: false, raw: spoken[0].trim() };
  }

  return null;
}

export interface AvailabilityMatch {
  date: Date;
  label: string;
}

export function parseAvailability(text: string, now = new Date()): AvailabilityMatch | null {
  const lower = text.toLowerCase();
  const base = new Date(now);

  let offsetDays: number | null = null;
  if (/\b(parso|parson|day after tomorrow|परसों)\b/.test(lower)) offsetDays = 2;
  else if (/\b(kal|tomorrow|ਕੱਲ|ਕੱਲ੍ਹ|कल)\b/.test(lower)) offsetDays = 1;
  else if (/\b(aaj|today|abhi|right now|आज|ਅੱਜ)\b/.test(lower)) offsetDays = 0;
  else if (/\b(next week|agle hafte|agley hafte|अगले हफ्ते)\b/.test(lower)) offsetDays = 7;
  else if (/\b(this week|is hafte|इस हफ्ते)\b/.test(lower)) offsetDays = 3;

  const hasMorning = /\b(subah|morning|ਸਵੇਰ|सुबह)\b/.test(lower);
  const hasEvening = /\b(shaam|sham|evening|ਸ਼ਾਮ|शाम)\b/.test(lower);
  const hasAfternoon = /\b(dopahar|afternoon|ਦੁਪਹਿਰ|दोपहर)\b/.test(lower);

  if (offsetDays == null) {
    if (!hasMorning && !hasEvening && !hasAfternoon) return null;
    offsetDays = 0;
  }

  base.setDate(base.getDate() + offsetDays);
  if (hasEvening) base.setHours(17, 0, 0, 0);
  else if (hasAfternoon) base.setHours(13, 0, 0, 0);
  else base.setHours(6, 0, 0, 0);

  const labelParts: string[] = [];
  if (offsetDays === 0) labelParts.push("Today");
  else if (offsetDays === 1) labelParts.push("Tomorrow");
  else if (offsetDays === 2) labelParts.push("Day after tomorrow");
  else labelParts.push(new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(base));
  if (hasMorning) labelParts.push("morning");
  else if (hasAfternoon) labelParts.push("afternoon");
  else if (hasEvening) labelParts.push("evening");

  return { date: base, label: labelParts.join(", ") };
}

export function detectLanguage(text: string): Language | "auto" {
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Gurmukhi
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari
  const hinglish = /\b(hai|hain|kal|aaj|mere paas|chahiye|rupaye|kilo|subah|mein|ka|ki|ko|nahi|bahut|accha|achha)\b/i;
  if (hinglish.test(text)) return "hi";
  return "en";
}

interface ExtractDefaults {
  location?: string | null;
  district?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function extractListing(
  transcript: string,
  defaults: ExtractDefaults = {},
): ExtractedListing {
  const text = transcript.trim();
  const quantity = parseQuantity(text);
  const price = parsePrice(text, quantity);
  const availability = parseAvailability(text);
  const commodityEntry = findCommodity(text);
  const place = findPlace(text);
  const language = detectLanguage(text);

  const grade = GRADE_WORDS.find((g) => g.aliases.some((a) => text.toLowerCase().includes(a)))?.grade ?? null;
  const pickupOnly = /\b(pickup|pick up|uthana|khud aana|self pick|ex-farm|farm gate)\b/i.test(text)
    ? true
    : null;

  const location = place?.name ?? defaults.location ?? null;
  const district = place?.district ?? defaults.district ?? null;
  const state = place?.state ?? defaults.state ?? null;

  const missing: MissingField[] = [];
  if (!commodityEntry) missing.push("commodity");
  if (!quantity) missing.push("quantity");
  if (!location) missing.push("location");
  if (!availability) missing.push("availableFrom");

  const recommended: string[] = [];
  if (!price) recommended.push("askingPrice");

  const core = 4;
  const found = core - missing.length;
  const confidence = Math.round(((found / core) * 0.9 + (price ? 0.1 : 0)) * 100) / 100;

  const notes: string[] = [];
  if (quantity && quantity.spokenUnit !== "kg") {
    notes.push(
      `Quantity converted from ${quantity.originalValue} ${quantity.spokenUnit} to ${quantity.kg} kg.`,
    );
  }
  if (price && price.isMinimum) {
    notes.push("Spoken as a minimum acceptable rate — edit the price if you meant a fixed ask.");
  }

  return {
    commodity: commodityEntry?.name ?? null,
    commodityKey: commodityEntry?.key ?? null,
    categorySlug: commodityEntry?.categorySlug ?? null,
    quantity: quantity?.kg ?? null,
    unit: "kg",
    availableFrom: availability?.date.toISOString() ?? null,
    availableLabel: availability?.label ?? null,
    location,
    district,
    state,
    lat: place?.lat ?? defaults.lat ?? null,
    lng: place?.lng ?? defaults.lng ?? null,
    askingPrice: price?.perKg ?? null,
    priceIsMinimum: price?.isMinimum ?? false,
    grade,
    pickupOnly,
    currency: "INR",
    missing,
    recommended,
    confidence,
    language,
    provider: "rules",
    transcript: text,
    followUp: buildFollowUp(missing, language),
    notes,
  };
}

const FOLLOW_UP: Record<MissingField, Record<string, string>> = {
  commodity: {
    en: "Which produce are you listing? For example: tomatoes, onions or potatoes.",
    hi: "आप कौन सी फसल बेचना चाहते हैं? जैसे टमाटर, प्याज़ या आलू।",
    pa: "ਤੁਸੀਂ ਕਿਹੜੀ ਫ਼ਸਲ ਵੇਚਣੀ ਹੈ? ਜਿਵੇਂ ਟਮਾਟਰ, ਪਿਆਜ਼ ਜਾਂ ਆਲੂ।",
  },
  quantity: {
    en: "How much quantity do you have available, in kilograms?",
    hi: "कितनी मात्रा उपलब्ध है, किलोग्राम में बताइए।",
    pa: "ਕਿੰਨੀ ਮਾਤਰਾ ਉਪਲਬਧ ਹੈ, ਕਿਲੋਗ੍ਰਾਮ ਵਿੱਚ ਦੱਸੋ।",
  },
  location: {
    en: "Where is the produce available for pickup? A village, town or district is enough.",
    hi: "पिकअप के लिए फसल कहाँ उपलब्ध है? गाँव, कस्बा या ज़िला बता दीजिए।",
    pa: "ਪਿਕਅੱਪ ਲਈ ਫ਼ਸਲ ਕਿੱਥੇ ਹੈ? ਪਿੰਡ, ਕਸਬਾ ਜਾਂ ਜ਼ਿਲ੍ਹਾ ਦੱਸ ਦਿਓ।",
  },
  availableFrom: {
    en: "When will it be ready? For example: tomorrow morning, or in three days.",
    hi: "फसल कब तैयार होगी? जैसे कल सुबह, या तीन दिन में।",
    pa: "ਫ਼ਸਲ ਕਦੋਂ ਤਿਆਰ ਹੋਵੇਗੀ? ਜਿਵੇਂ ਕੱਲ੍ਹ ਸਵੇਰੇ, ਜਾਂ ਤਿੰਨ ਦਿਨਾਂ ਵਿੱਚ।",
  },
};

export function buildFollowUp(missing: MissingField[], language: Language | "auto"): string | null {
  if (missing.length === 0) return null;
  const lang = language === "auto" ? "en" : language;
  return FOLLOW_UP[missing[0]][lang] ?? FOLLOW_UP[missing[0]].en;
}

/** Commodity suggestions for autocomplete in the listing form. */
export function suggestCommodities(query: string): CommodityEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMODITIES.slice(0, 8);
  return COMMODITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.key.includes(q) ||
      c.nameHi.includes(query) ||
      c.aliases.some((a) => a.includes(q)),
  ).slice(0, 8);
}

/** Distance in km from a place name, for "near Mohali" style queries. */
export function placeByName(name: string): PlaceEntry | null {
  const lower = name.trim().toLowerCase();
  return (
    PLACES.find(
      (p) => p.name.toLowerCase() === lower || p.aliases.includes(lower),
    ) ?? null
  );
}
