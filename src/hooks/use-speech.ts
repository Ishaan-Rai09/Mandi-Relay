"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MAX_RECORDING_MS,
  SPEECH_LOCALES,
  TRANSCRIBE_ENDPOINT,
  browserSpeechSupported,
  speechConfig,
} from "@/lib/voice/providers";

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

/* ── WAV encoding for Gnani ────────────────────────────────────────
 * Gnani detects the format from the uploaded file's extension, and 16 kHz
 * mono WAV is the safest choice. MediaRecorder produces webm/opus (Chrome,
 * Firefox) or mp4/aac (Safari), so we decode the recording and resample it
 * offline before uploading. */

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

async function toUploadableWav(recording: Blob): Promise<Blob> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error("This browser cannot process audio.");

  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(await recording.arrayBuffer());
    const targetRate = 16_000;
    const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, frames, targetRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), targetRate);
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

export interface UseSpeechOptions {
  language?: string;
  continuous?: boolean;
  onFinal?: (transcript: string) => void;
}

/**
 * Voice input.
 *
 * With `NEXT_PUBLIC_STT_PROVIDER=gnani` (the default) the microphone is
 * recorded and posted to `/api/voice/transcribe`, which calls Gnani with the
 * server-side key. Set it to `browser` to use the Web Speech API instead —
 * that path needs no key but only works in Chromium browsers.
 */
export function useSpeechRecognition({ language = "auto", continuous = false, onFinal }: UseSpeechOptions = {}) {
  const useGnani = speechConfig.sttProvider === "gnani";

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const stopRequested = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<number | null>(null);
  /** Resolves the `stop()` promise once an uploaded clip comes back as text. */
  const pendingStopRef = useRef<((text: string) => void) | null>(null);
  const transcriptRef = useRef("");
  const interimRef = useRef("");

  useEffect(() => {
    setSupported(useGnani ? typeof navigator !== "undefined" && Boolean(navigator.mediaDevices) : browserSpeechSupported());
    return () => {
      stopRequested.current = true;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // `useGnani` is a build-time constant for this app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio-reactive level for the waveform. Uses microphone metering where the
  // browser allows it and falls back to a gentle synthetic pulse.
  useEffect(() => {
    if (!listening) {
      setLevel(0);
      return;
    }
    let ownedStream: MediaStream | null = null;
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
        const stream = streamRef.current;
        if (stream) {
          ownedStream = null;
        } else {
          if (!navigator.mediaDevices?.getUserMedia) return;
          ownedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const active = stream ?? ownedStream;
        if (!active || cancelled) return;

        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(active);
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
      ownedStream?.getTracks().forEach((track) => track.stop());
      void ctx?.close().catch(() => undefined);
    };
  }, [listening]);

  /** Uploads one clip and returns the full transcript for this turn. */
  const transcribe = useCallback(async (recording: Blob): Promise<string> => {
    setTranscribing(true);
    setError(null);
    try {
      const wav = await toUploadableWav(recording);
      const body = new FormData();
      body.append("audio", wav, "dictation.wav");
      if (language !== "auto") body.append("language", language);

      const response = await fetch(TRANSCRIBE_ENDPOINT, { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { text?: string; error?: string };

      if (!response.ok || !payload.text) {
        setError(payload.error ?? "Could not transcribe that recording. Please try again.");
        return "";
      }

      const merged = `${transcriptRef.current} ${payload.text}`.trim();
      transcriptRef.current = merged;
      setTranscript(merged);
      onFinalRef.current?.(merged);
      return merged;
    } catch {
      setError("Could not process the recording. Please try again or type the sentence.");
      return "";
    } finally {
      setTranscribing(false);
    }
  }, [language]);

  const stopRecording = useCallback((): Promise<string> => {
    if (autoStopRef.current) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    const recorder = recorderRef.current;
    setListening(false);
    if (recorder && recorder.state === "recording") {
      // `onstop` uploads the clip and resolves this promise with the text.
      return new Promise<string>((resolve) => {
        pendingStopRef.current = resolve;
        recorder.stop();
      });
    }
    return Promise.resolve(transcriptRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot record audio. Type the sentence instead.");
      return;
    }
    setError(null);
    interimRef.current = "";
    setInterim("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""];
      const mimeType = candidates.find((type) => !type || MediaRecorder.isTypeSupported(type)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const finish = (text: string) => {
          const resolve = pendingStopRef.current;
          pendingStopRef.current = null;
          resolve?.(text);
        };

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (blob.size > 0) void transcribe(blob).then(finish);
        else {
          setError("Nothing was recorded. Hold the button a little longer.");
          finish(transcriptRef.current);
        }
      };
      recorder.onerror = () => {
        setError("The recording stopped unexpectedly. Please try again.");
        setListening(false);
      };

      recorderRef.current = recorder;
      recorder.start();
      setListening(true);

      // One sentence is enough for a listing; never exceed the API limit.
      autoStopRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch (cause) {
      const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
      setError(
        denied
          ? "Microphone access was blocked. Allow it in your browser settings — the page must be on HTTPS or localhost."
          : "Could not start the microphone. Please try again.",
      );
    }
  }, [stopRecording, transcribe]);

  /**
   * Stops listening and resolves with the text captured this turn. With Gnani
   * that means waiting for the upload, so callers can extract as soon as it
   * resolves instead of racing the recorder.
   */
  const stop = useCallback((): Promise<string> => {
    stopRequested.current = true;
    if (useGnani) return stopRecording();

    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
    return Promise.resolve(`${transcriptRef.current} ${interimRef.current}`.trim());
  }, [stopRecording, useGnani]);

  const start = useCallback(() => {
    if (useGnani) {
      void startRecording();
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("This browser does not support speech recognition. Type instead — everything works by keyboard.");
      return;
    }

    setError(null);
    interimRef.current = "";
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
      if (interimText) {
        interimRef.current = interimText;
        setInterim(interimText);
      }
      if (finalText) {
        const merged = `${transcriptRef.current} ${finalText}`.trim();
        transcriptRef.current = merged;
        setTranscript(merged);
        interimRef.current = "";
        setInterim("");
        onFinalRef.current?.(merged);
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
  }, [continuous, language, startRecording, useGnani]);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcribing,
    transcript,
    interim,
    error,
    level,
    start,
    stop,
    reset,
    setTranscript,
    provider: useGnani ? ("gnani" as const) : ("browser" as const),
  };
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
