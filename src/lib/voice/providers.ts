/**
 * Speech provider abstraction.
 *
 * Two seams exist:
 *  - STT: Gnani (Vachana Prisma) through `/api/voice/transcribe` (production),
 *    with the browser Web Speech API as the no-key fallback.
 *  - TTS: the browser SpeechSynthesis API or a server endpoint.
 *
 * Both return the same shape so the UI never knows which provider answered.
 * Nothing here claims offline transcription: every provider needs a network
 * connection, and the Gnani key never leaves the server.
 *
 * Gnani's REST endpoint takes a multipart audio file (wav/mp3/ogg/flac/aac/m4a)
 * up to 30 seconds, so the browser records, resamples to 16 kHz mono WAV and
 * uploads. See `src/hooks/use-speech.ts`.
 */

import { LOCALES } from "@/lib/i18n/locales";

export type SpeechProvider = "browser" | "gnani";

export interface TranscriptResult {
  text: string;
  confidence: number;
  language: string;
  isFinal: boolean;
  provider: SpeechProvider;
}

function sttProvider(): SpeechProvider {
  const value = (process.env.NEXT_PUBLIC_STT_PROVIDER ?? "gnani").toLowerCase();
  // Everything except the explicit browser fallback goes through Gnani.
  return value === "browser" ? "browser" : "gnani";
}

export const speechConfig = {
  sttProvider: sttProvider(),
  ttsProvider: (process.env.NEXT_PUBLIC_TTS_PROVIDER ?? "browser") as "browser" | "server",
};

/** Where the browser posts recorded audio for server-side transcription. */
export const TRANSCRIBE_ENDPOINT = "/api/voice/transcribe";

/**
 * Gnani transcribes at most 30 seconds per REST request, so the recorder stops
 * a little earlier. Longer speech is split into several turns by the UI.
 */
export const MAX_RECORDING_MS = 27_000;

/**
 * BCP-47 tags for the Web Speech API, derived from the site's locale registry so
 * a farmer who switched the interface to Tamil gets Tamil recognition too.
 */
export const SPEECH_LOCALES: Record<string, string> = {
  ...Object.fromEntries(LOCALES.map((locale) => [locale.code, locale.bcp47])),
  auto: "hi-IN",
};

/**
 * Gnani language codes. It transcribes ten languages directly; anything else is
 * sent as `indic-auto` on Prisma v3.0, which identifies the language itself and
 * reports it back as `detected_language_code`.
 */
export const GNANI_LANGUAGE_CODES: Record<string, string> = {
  bn: "bn-IN",
  en: "en-IN",
  gu: "gu-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  auto: "indic-auto",
};

export function browserSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  );
}

export function browserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
