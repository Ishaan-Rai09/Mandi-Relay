/**
 * Speech provider abstraction.
 *
 * Two seams exist:
 *  - STT: the browser Web Speech API (default, free, works on localhost/HTTPS)
 *    or a server endpoint that proxies a cloud STT vendor.
 *  - TTS: the browser SpeechSynthesis API or a server endpoint.
 *
 * Both return the same shape so the UI never knows which provider answered.
 * Nothing here claims offline transcription: the Web Speech API requires a
 * network connection in Chrome.
 */

export type SpeechProvider = "browser" | "server";

export interface TranscriptResult {
  text: string;
  confidence: number;
  language: string;
  isFinal: boolean;
  provider: SpeechProvider;
}

export const speechConfig = {
  sttProvider: (process.env.NEXT_PUBLIC_STT_PROVIDER ?? "browser") as SpeechProvider,
  ttsProvider: (process.env.NEXT_PUBLIC_TTS_PROVIDER ?? "browser") as SpeechProvider,
};

/** BCP-47 tags used by the Web Speech API for each supported language. */
export const SPEECH_LOCALES: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  pa: "pa-IN",
  auto: "hi-IN",
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
