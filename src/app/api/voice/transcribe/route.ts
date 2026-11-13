import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { GNANI_LANGUAGE_CODES } from "@/lib/voice/providers";

/**
 * Speech-to-text proxy for Gnani (Vachana Prisma).
 *
 * The browser records, downsamples to 16 kHz mono and encodes WAV, then posts
 * the bytes here. This route is the only place the Gnani key exists, so the
 * credential is never shipped to a client.
 *
 * Gnani REST contract:
 *   POST https://api.vachana.ai/stt/v3
 *   X-API-Key-ID: <key>
 *   multipart/form-data: audio_file, language_code, format, model?
 *   → { success, transcript, detected_language_code, model, truncated? }
 *
 * Only short clips are accepted (30 s per request), and the key carries the
 * account's scope and credit, so auth/credit failures are reported verbatim.
 * Without a key the route answers 503 and the interface tells the farmer to
 * type instead.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GNANI_ENDPOINT = process.env.GNANI_STT_URL ?? "https://api.vachana.ai/stt/v3";

/** A 30 s 16 kHz mono WAV is under 1 MB; this only guards abuse. */
const MAX_BYTES = 12 * 1024 * 1024;

/** Model used when the speaker has not picked a language. */
const AUTO_MODEL = "prisma-v3.0";

/** Domain hint — Prisma v3.0 uses it to favour mandi vocabulary. */
const MANDI_TOPIC =
  "A farmer recording a crop listing at an Indian mandi: crop name, quantity in quintals, and price in rupees.";

function resolveLanguage(raw: string): { code: string; auto: boolean } {
  const value = raw.trim().toLowerCase();
  if (!value || value === "auto") {
    return { code: GNANI_LANGUAGE_CODES.auto, auto: true };
  }
  const short = value.split("-")[0];
  const mapped = GNANI_LANGUAGE_CODES[short];
  if (mapped && !mapped.startsWith("indic")) return { code: mapped, auto: false };
  // A language Gnani cannot be pinned to (Assamese, Urdu, Santali …) is sent as
  // indic-auto: the model identifies what was spoken instead of forcing Hindi.
  return { code: GNANI_LANGUAGE_CODES.auto, auto: true };
}

/** Gnani uses three different error envelopes; flatten them into one message. */
async function describeFailure(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "");
  let code = "";
  let message = "";
  try {
    const parsed = JSON.parse(raw) as {
      detail?: { error_code?: string; message?: string } | unknown[];
      error?: { type?: string; message?: string } | string;
      code?: string;
      message?: string;
    };
    if (parsed.detail && !Array.isArray(parsed.detail)) {
      code = parsed.detail.error_code ?? "";
      message = parsed.detail.message ?? "";
    } else if (Array.isArray(parsed.detail)) {
      message = "The recording was rejected as invalid audio.";
    }
    if (typeof parsed.error === "object" && parsed.error) {
      code = code || (parsed.error.type ?? "");
      message = message || (parsed.error.message ?? "");
    }
    if (typeof parsed.error === "string") message = message || parsed.error;
    code = code || (parsed.code ?? "");
    message = message || (parsed.message ?? "");
  } catch {
    message = raw.slice(0, 200);
  }

  if (response.status === 401 || code === "INVALID_API_KEY" || code === "MISSING_API_KEY") {
    return "Gnani rejected the API key. Check GNANI_API_KEY on the server.";
  }
  if (response.status === 402) {
    return "The Gnani account has no credit left. Top it up or type the sentence instead.";
  }
  if (response.status === 403) {
    return "This Gnani key is not allowed to use speech-to-text. Enable the STT scope for it.";
  }
  if (response.status === 429) {
    return "Voice input is busy right now. Wait a moment and try again.";
  }
  if (code === "MAX_AUDIO_DURATION_EXCEEDED") {
    return "That recording is too long for one turn. Speak for a few seconds and try again.";
  }
  if (code === "EMPTY_AUDIO" || code === "UNSUPPORTED_AUDIO_FORMAT" || code === "AUDIO_CONVERSION_ERROR") {
    return "That audio could not be read. Please record again.";
  }
  if (response.status === 504 || code === "UPSTREAM_TIMEOUT") {
    return "Gnani took too long to transcribe that. Please try again.";
  }
  return message
    ? `Gnani could not transcribe that recording: ${message.slice(0, 160)}`
    : "Gnani could not transcribe that recording. Please try again.";
}

export async function POST(request: Request) {
  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Voice input is not configured. Add GNANI_API_KEY on the server, or type the sentence instead.",
        code: "GNANI_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  // Anonymous callers (the landing-page playground) are limited per address, not
  // as one shared "anon" bucket that a single visitor could exhaust.
  const hdrs = request.headers;
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "local";
  const limit = rateLimit(`gnani:${user?.id ?? `ip:${ip}`}`, 60, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many voice requests. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart audio." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "No audio was uploaded." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That recording is too long. Keep it under thirty seconds." },
      { status: 413 },
    );
  }

  const { code: languageCode, auto } = resolveLanguage(String(form.get("language") ?? ""));

  const upstream = new FormData();
  // Gnani detects the format from the file-name extension, so the name matters.
  upstream.append("audio_file", audio, audio.name && audio.name.includes(".") ? audio.name : "dictation.wav");
  upstream.append("language_code", languageCode);
  // `transcribe` turns "do hazaar do sau" into "2200" — quantities and prices
  // must arrive as digits for the listing form.
  upstream.append("format", "transcribe");
  if (auto) {
    upstream.append("model", AUTO_MODEL);
    upstream.append("topic", MANDI_TOPIC);
  }

  try {
    const response = await fetch(GNANI_ENDPOINT, {
      method: "POST",
      headers: { "X-API-Key-ID": apiKey },
      body: upstream,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: await describeFailure(response) },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      success?: boolean;
      transcript?: string;
      detected_language_code?: string;
      model?: string;
      truncated?: boolean;
    };

    const text = (payload.transcript ?? "").trim();
    if (!text) {
      return NextResponse.json(
        {
          error: "I did not catch any words. Try again a little closer to the microphone.",
          code: "EMPTY_TRANSCRIPT",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text,
      detectedLanguage: payload.detected_language_code ?? null,
      model: payload.model ?? null,
      truncated: payload.truncated === true,
      provider: "gnani",
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "Gnani took too long to answer. Please try again."
          : "Could not reach Gnani. Check the network and try again.",
      },
      { status: 504 },
    );
  }
}
