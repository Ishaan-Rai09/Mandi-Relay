import { z } from "zod";

import {
  buildFollowUp,
  extractListing,
  type ExtractedListing,
  type MissingField,
} from "@/lib/ai/extract";

/**
 * AI provider seam.
 *
 * The product ships with a deterministic, offline multilingual parser so that
 * voice listing works with no API key, no network and no per-request cost. When
 * an OpenAI-compatible endpoint is configured the same call is routed through
 * the model and validated against a strict schema; any failure falls back to
 * the deterministic parser rather than showing the farmer an error.
 */

const aiConfig = {
  provider: (process.env.AI_PROVIDER ?? "rules").toLowerCase(),
  baseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.AI_API_KEY ?? "",
  model: process.env.AI_MODEL ?? "gpt-4o-mini",
};

export function llmEnabled() {
  return aiConfig.provider === "llm" && aiConfig.apiKey.length > 0;
}

export function activeProviderLabel() {
  return llmEnabled() ? `llm:${aiConfig.model}` : "rules-engine";
}

const llmSchema = z.object({
  commodity: z.string().nullable(),
  category: z
    .enum(["vegetables", "fruits", "grains", "pulses", "spices", "other"])
    .nullable(),
  quantity_kg: z.number().positive().nullable(),
  available_from: z.string().nullable(),
  location: z.string().nullable(),
  district: z.string().nullable(),
  state: z.string().nullable(),
  asking_price_per_kg: z.number().positive().nullable(),
  price_is_minimum: z.boolean().default(false),
  grade: z.string().nullable(),
  pickup_only: z.boolean().nullable(),
  language: z.enum(["en", "hi", "pa"]).nullable(),
  follow_up_question: z.string().nullable(),
});

/** Some models wrap JSON in a fenced block; strip it before parsing. */
function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

const SYSTEM_PROMPT = `You extract produce listings from a farmer's spoken sentence in English, Hindi, Punjabi or Hinglish.
Return JSON only. Rules:
- Never invent values. Use null when the farmer did not say it.
- Normalise quantity to kilograms (1 quintal = 100 kg, 1 tonne = 1000 kg).
- Normalise price to rupees per kilogram. "20 rupaye kilo se achha" is a minimum, set price_is_minimum true.
- available_from must be an ISO 8601 datetime, resolved relative to the CURRENT_TIME provided.
- Use the farmer's default location only when the sentence gives no location.
- Write follow_up_question in the farmer's language, asking for the single most important missing field.
- category must be one of vegetables, fruits, grains, pulses, spices, other.`;

interface Defaults {
  location?: string | null;
  district?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export async function understandListing(
  transcript: string,
  defaults: Defaults = {},
): Promise<ExtractedListing> {
  const fallback = extractListing(transcript, defaults);
  if (!llmEnabled() || transcript.trim().length < 4) return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CURRENT_TIME: ${new Date().toISOString()}\nFARMER_DEFAULT_LOCATION: ${JSON.stringify({
          location: defaults.location ?? null,
          district: defaults.district ?? null,
          state: defaults.state ?? null,
        })}\nSENTENCE: ${transcript}`,
      },
    ];

    const ask = (jsonMode: boolean) =>
      fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          temperature: 0,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages,
        }),
        signal: controller.signal,
      });

    let res = await ask(true);
    // Not every OpenAI-compatible model accepts JSON mode — several NVIDIA NIM
    // models reject it with a 400 — so retry once without it instead of
    // dropping straight to the rules engine.
    if (res.status === 400) res = await ask(false);
    clearTimeout(timer);
    if (!res.ok) return fallback;

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallback;

    const parsed = llmSchema.safeParse(JSON.parse(stripFences(content)));
    if (!parsed.success) return fallback;
    const d = parsed.data;

    const missing: MissingField[] = [];
    if (!d.commodity) missing.push("commodity");
    if (!d.quantity_kg) missing.push("quantity");
    if (!d.location) missing.push("location");
    if (!d.available_from) missing.push("availableFrom");

    const confidence = Math.max(
      fallback.confidence,
      Math.round(((4 - missing.length) / 4) * 100) / 100,
    );

    return {
      ...fallback,
      commodity: d.commodity ?? fallback.commodity,
      commodityKey: fallback.commodityKey,
      categorySlug: d.category ?? fallback.categorySlug,
      quantity: d.quantity_kg ?? fallback.quantity,
      availableFrom: d.available_from ?? fallback.availableFrom,
      location: d.location ?? fallback.location,
      district: d.district ?? fallback.district,
      state: d.state ?? fallback.state,
      askingPrice: d.asking_price_per_kg ?? fallback.askingPrice,
      priceIsMinimum: d.price_is_minimum,
      grade: d.grade ?? fallback.grade,
      pickupOnly: d.pickup_only ?? fallback.pickupOnly,
      language: d.language ?? fallback.language,
      missing,
      confidence,
      provider: "llm",
      followUp:
        missing.length === 0
          ? null
          : d.follow_up_question ??
            buildFollowUp(missing, d.language ?? fallback.language),
    };
  } catch {
    return fallback;
  }
}
