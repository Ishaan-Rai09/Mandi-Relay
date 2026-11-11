"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SPEECH_LOCALES, browserSpeechSupported } from "@/lib/voice/providers";

/* Minimal structural types — the Web Speech API is not in lib.dom. */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechOptions {
  language?: string;
  continuous?: boolean;
  onFinal?: (transcript: string) => void;
}

export function useSpeechRecognition({ language = "auto", continuous = false, onFinal }: UseSpeechOptions = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const stopRequested = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(browserSpeechSupported());
    return () => {
      stopRequested.current = true;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  // Audio-reactive level for the waveform. Uses microphone metering where the
  // browser allows it and falls back to a gentle synthetic pulse.
  useEffect(() => {
    if (!listening) {
      setLevel(0);
      return;
    }
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let cancelled = false;

    const fallback = window.setInterval(() => {
      setLevel((prev) => {
        const next = 0.25 + Math.random() * 0.6;
        return prev * 0.6 + next * 0.4;
      });
    }, 140);

    const startMeter = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (let i = 0; i < data.length; i += 1) {
            peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
          }
          setLevel((prev) => prev * 0.55 + Math.min(1, peak * 2.6) * 0.45);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        window.clearInterval(fallback);
      } catch {
        /* Metering is optional; the synthetic pulse keeps the UI alive. */
      }
    };

    void startMeter();

    return () => {
      cancelled = true;
      window.clearInterval(fallback);
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      void ctx?.close().catch(() => undefined);
    };
  }, [listening]);

  const stop = useCallback(() => {
    stopRequested.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("This browser does not support speech recognition. Type instead — everything works by keyboard.");
      return;
    }

    setError(null);
    setInterim("");
    stopRequested.current = false;

    const recognition = new Ctor();
    recognition.lang = SPEECH_LOCALES[language] ?? SPEECH_LOCALES.auto;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setTranscript((prev) => {
          const merged = `${prev} ${finalText}`.trim();
          onFinalRef.current?.(merged);
          return merged;
        });
        setInterim("");
      }
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        "not-allowed":
          "Microphone access was blocked. Allow it in your browser settings — the page must be on HTTPS or localhost.",
        "service-not-allowed":
          "Speech recognition is unavailable in this browser context. Use HTTPS or type instead.",
        "audio-capture": "No microphone was found on this device.",
        network: "Speech recognition needs a network connection. You can type instead.",
        "no-speech": "I did not catch that. Try speaking again, a little closer to the mic.",
        aborted: "",
      };
      const message = messages[event.error] ?? "Speech recognition stopped unexpectedly.";
      if (message) setError(message);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      if (continuous && !stopRequested.current) {
        try {
          recognition.start();
        } catch {
          /* ignore restart races */
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError("Could not start the microphone. Please try again.");
    }
  }, [continuous, language]);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  return { supported, listening, transcript, interim, error, level, start, stop, reset, setTranscript };
}

/** Text-to-speech with the browser voice list, preferring an Indian voice. */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string, language = "en") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const locale = SPEECH_LOCALES[language] ?? "en-IN";
    utterance.lang = locale;
    utterance.rate = 0.98;
    utterance.pitch = 1;
    const voices = synth.getVoices();
    const preferred = voices.find((v) => v.lang === locale) ?? voices.find((v) => v.lang.startsWith(locale.slice(0, 2)));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  return { speak, cancel, speaking, supported };
}
