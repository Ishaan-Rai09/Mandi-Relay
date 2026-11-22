"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CloudOff,
  Mic,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { Callout } from "@/components/ui/misc";
import { MicButton, MicUnavailable } from "@/components/voice/mic-button";
import { useSpeechRecognition } from "@/hooks/use-speech";
import { createListingAction } from "@/lib/actions/listings";
import { extractListingAction } from "@/lib/actions/voice";
import type { ExtractedListing } from "@/lib/ai/extract";
import { UNIT_TO_KG, type CommodityUnit } from "@/lib/domain";
import { IDLE } from "@/lib/schemas";
import { formatINR, formatNumber } from "@/lib/utils";

const DRAFT_KEY = "mr.voice-listing.draft.v1";

const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Hinglish",
    text: "Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon. Mujhe 20 rupaye kilo se achha rate chahiye.",
  },
  {
    label: "English",
    text: "I have 300 kg of onions ready tomorrow in Banur at 22 rupees per kilo.",
  },
  {
    label: "ਪੰਜਾਬੀ",
    text: "ਸਾਡੇ ਕੋਲ ਪਰਸੋਂ 2 ਕੁਇੰਟਲ ਫੁੱਲ ਗੋਭੀ ਤਿਆਰ ਹੈ, ਖਰੜ ਤੋਂ, 25 ਰੁਪਏ ਕਿਲੋ।",
  },
  {
    label: "Short",
    text: "200 kg potatoes, pickup from Kharar, ready in two days, 15 rupees a kg.",
  },
];

interface DraftFields {
  commodity: string;
  variety: string;
  categorySlug: string;
  quantity: string;
  unit: string;
  askingPrice: string;
  availableFrom: string;
  location: string;
  district: string;
  state: string;
  description: string;
  grade: string;
  pickupOnly: boolean;
}

function toLocalInput(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + 86_400_000);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fieldsFrom(extraction: ExtractedListing, fallback: { district: string; state: string }): DraftFields {
  return {
    commodity: extraction.commodity ?? "",
    variety: "",
    categorySlug: extraction.categorySlug ?? "vegetables",
    quantity: extraction.quantity != null ? String(extraction.quantity) : "",
    // The parser reports the unit the farmer actually spoke (quintal, tonne…).
    // Dropping it would publish "2 quintal" as 2 kg.
    unit: extraction.unit ?? "kg",
    askingPrice: extraction.askingPrice != null ? String(extraction.askingPrice) : "",
    availableFrom: toLocalInput(extraction.availableFrom),
    location: extraction.location ?? "",
    district: extraction.district ?? fallback.district,
    state: extraction.state ?? fallback.state,
    description: "",
    grade: extraction.grade ?? "",
    pickupOnly: extraction.pickupOnly ?? false,
  };
}

type Phase = "idle" | "listening" | "processing" | "review" | "published";

export function VoiceStudio({
  defaults,
  categories,
}: {
  defaults: { village: string; district: string; state: string; lat: number | null; lng: number | null; language: string };
  categories: { slug: string; name: string }[];
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState<ExtractedListing | null>(null);
  const [fields, setFields] = useState<DraftFields>(() =>
    fieldsFrom(
      {
        commodity: null,
        commodityKey: null,
        categorySlug: null,
        quantity: null,
        unit: "kg",
        availableFrom: null,
        availableLabel: null,
        location: defaults.village,
        district: defaults.district,
        state: defaults.state,
        lat: defaults.lat,
        lng: defaults.lng,
        askingPrice: null,
        priceIsMinimum: false,
        grade: null,
        pickupOnly: null,
        currency: "INR",
        missing: [],
        recommended: [],
        confidence: 0,
        language: "auto",
        provider: "rules",
        transcript: "",
        followUp: null,
        notes: [],
      },
      { district: defaults.district, state: defaults.state },
    ),
  );
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(false);
  const [restorable, setRestorable] = useState<DraftFields | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [listState, publish, publishing] = useActionState(createListingAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  const speech = useSpeechRecognition({
    language: defaults.language,
    onFinal: (value) => setTranscript(value),
  });

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftFields;
        if (parsed?.commodity) setRestorable(parsed);
      }
    } catch {
      /* corrupt draft is discarded */
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (speech.listening) setPhase("listening");
  }, [speech.listening]);

  useEffect(() => {
    if (listState.ok && listState.data?.listingId) {
      setPublishedId(String(listState.data.listingId));
      setPhase("published");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setQueued(false);
    }
  }, [listState]);

  const saveDraftLocally = (next: DraftFields = fields) => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      setQueued(true);
    } catch {
      /* storage may be unavailable in private mode */
    }
  };

  const runExtraction = async (text: string) => {
    if (text.trim().length < 4) {
      setError("Say or type a little more about your produce.");
      return;
    }
    setBusy(true);
    setError(null);
    setPhase("processing");
    const response = await extractListingAction(text);
    setBusy(false);
    if (!response.ok || !response.extraction) {
      setError(response.error ?? "Could not read that. Try again.");
      setPhase("idle");
      return;
    }
    setExtraction(response.extraction);
    setFields(fieldsFrom(response.extraction, defaults));
    setPhase("review");
  };

  const handleFollowUp = async () => {
    const addition = followUpAnswer.trim();
    if (!addition) return;
    const merged = `${transcript} ${addition}`.trim();
    setTranscript(merged);
    setFollowUpAnswer("");
    await runExtraction(merged);
  };

  const update = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  /**
   * A draft restored from this device never went through the parser in this
   * session, so the review payload is rebuilt from the saved fields.
   */
  const extractionFromDraft = (draft: DraftFields): ExtractedListing => ({
    commodity: draft.commodity || null,
    commodityKey: null,
    categorySlug: draft.categorySlug || null,
    quantity: Number(draft.quantity) || null,
    unit: (draft.unit || "kg") as CommodityUnit,
    availableFrom: draft.availableFrom ? new Date(draft.availableFrom).toISOString() : null,
    availableLabel: null,
    location: draft.location || null,
    district: draft.district || null,
    state: draft.state || null,
    lat: defaults.lat,
    lng: defaults.lng,
    askingPrice: Number(draft.askingPrice) || null,
    priceIsMinimum: false,
    grade: draft.grade || null,
    pickupOnly: draft.pickupOnly,
    currency: "INR",
    missing: [],
    recommended: [],
    confidence: 0,
    language: "auto",
    provider: "rules",
    transcript: "",
    followUp: null,
    notes: ["Restored from a draft saved on this device. Check every field before publishing."],
  });

  const completeness = useMemo(() => {
    const required = [fields.commodity, fields.quantity, fields.askingPrice, fields.location, fields.availableFrom];
    return required.filter((value) => Boolean(value)).length;
  }, [fields]);

  const unitFactor = UNIT_TO_KG[fields.unit] ?? 1;
  const totalValue = Number(fields.quantity || 0) * Number(fields.askingPrice || 0) * unitFactor;

  const liveSentence = speech.listening ? `${speech.transcript}${speech.interim}` : transcript;
  const sentenceLength = liveSentence.trim().length;

  const capture: { label: string; tone: "neutral" | "forest" | "gold" | "warning" } = speech.transcribing
    ? { label: "Transcribing", tone: "warning" }
    : phase === "processing"
      ? { label: "Reading your words", tone: "gold" }
      : speech.listening
        ? { label: "Listening", tone: "forest" }
        : { label: "Ready", tone: "neutral" };

  /* ── Published ── */
  if (phase === "published" && publishedId) {
    return (
      <Panel className="p-6 sm:p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="mx-auto grid size-14 place-items-center rounded-full bg-forest text-white"
        >
          <Check className="size-7" aria-hidden />
        </motion.div>
        <h2 className="mt-4 text-center font-display text-[22px] font-bold text-charcoal">
          Your listing is live.
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-center text-[13px] leading-relaxed text-charcoal-500">
          {formatNumber(Number(fields.quantity) * unitFactor)} kg of {fields.commodity} at{" "}
          {formatINR(Number(fields.askingPrice))}/kg is now visible to buyers in {fields.district}.
          Buyers who registered this commodity have been notified.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/farmer/listings"
            className="rounded-[5px] bg-forest px-3.5 py-2 text-[13px] font-medium text-white hover:bg-forest-700"
          >
            View my listings
          </Link>
          <Link
            href="/farmer/offers"
            className="rounded-[5px] border border-forest/25 bg-white px-3.5 py-2 text-[13px] font-medium text-forest-800 hover:bg-forest-50"
          >
            Watch for offers
          </Link>
        </div>
        <p className="mt-4 text-center text-[11px] text-charcoal-400">
          You can pause, edit or auction this lot at any time from My produce.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {!online ? (
        <div className="flex items-start gap-2 rounded-[6px] border border-warning/25 bg-warning-soft px-3.5 py-2.5">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="text-[12px] leading-relaxed text-charcoal-500">
            You are offline. Voice transcription and AI extraction need a connection, but you can
            still fill the form by hand — your draft is saved on this device and published when you
            are back online.
          </p>
        </div>
      ) : null}

      {restorable && phase === "idle" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-forest/25 bg-forest-50 px-3.5 py-2.5">
          <p className="text-[12px] text-charcoal-500">
            A saved draft for <span className="font-semibold text-charcoal">{restorable.commodity}</span>{" "}
            was found on this device.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const draft = { ...restorable, unit: restorable.unit || "kg" };
                setFields(draft);
                setExtraction(extractionFromDraft(draft));
                setPhase("review");
                setRestorable(null);
              }}
              className="rounded-[4px] bg-forest px-2.5 py-1 text-[11.5px] font-medium text-white"
            >
              Restore draft
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(DRAFT_KEY);
                setRestorable(null);
              }}
              className="rounded-[4px] px-2 py-1 text-[11.5px] text-charcoal-500 hover:text-danger"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {phase !== "review" ? (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-200 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-forest-50 text-forest-700 ring-1 ring-forest/10">
                <Mic className="size-4" strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[14.5px] font-bold tracking-[-0.01em] text-charcoal">
                  Speak your listing
                </p>
                <p className="truncate text-[11.5px] text-charcoal-400">
                  Hindi, Punjabi or English — one sentence is enough
                </p>
              </div>
            </div>
            <Pill tone={capture.tone} dot>
              {capture.label}
            </Pill>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* Microphone stage */}
            <div className="flex flex-col items-center justify-center border-b border-ivory-200 bg-ivory/50 px-5 py-8 text-center lg:border-b-0 lg:border-r lg:py-10">
              {speech.supported ? (
                <>
                  <MicButton
                    listening={speech.listening}
                    level={speech.level}
                    onToggle={() => {
                      if (speech.listening) {
                        // Resolves with the final text: immediately for the browser
                        // recogniser, after the upload for Gnani.
                        void speech.stop().then((captured) => {
                          if (captured.length > 3) {
                            setTranscript(captured);
                            void runExtraction(captured);
                          }
                        });
                      } else {
                        speech.reset();
                        setPhase("listening");
                        speech.start();
                      }
                    }}
                    label={
                      phase === "processing"
                        ? "Extracting…"
                        : speech.transcribing
                          ? "Transcribing your sentence…"
                          : speech.listening
                            ? "Tap to stop and extract"
                            : "Tap to speak"
                    }
                    transcribing={speech.transcribing}
                    disabled={busy || speech.transcribing}
                  />
                  <p className="mt-6 max-w-[17rem] text-[12px] leading-relaxed text-charcoal-400">
                    {speech.listening
                      ? "Speak naturally — produce, quantity, place and date."
                      : "Tap the microphone and describe what you have. We fill the form, you check it."}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[10.5px] text-sage">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Recorded only while the button is active
                  </p>
                </>
              ) : (
                <MicUnavailable message="This browser does not support speech recognition. Type your sentence on the right — every field still works, and the same parser reads it." />
              )}
            </div>

            {/* Sentence and examples */}
            <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label htmlFor="sentence" className="text-[13px] font-medium text-charcoal">
                    Your sentence
                  </label>
                  <span className="shrink-0 text-[11px] text-charcoal-400 tabular">
                    {sentenceLength}/1200
                  </span>
                </div>
                <Textarea
                  id="sentence"
                  rows={4}
                  value={liveSentence}
                  readOnly={speech.listening}
                  maxLength={1200}
                  onChange={(event) => setTranscript(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void runExtraction(liveSentence);
                    }
                  }}
                  placeholder="Mere paas kal subah 500 kilo tamatar hain, Kharar se…"
                  className="min-h-[108px] font-devanagari text-[13.5px] leading-relaxed"
                  aria-describedby="sentence-hint"
                  disabled={busy}
                />
                <p id="sentence-hint" className="mt-1.5 text-[11px] text-charcoal-400">
                  {speech.listening ? (
                    <span className="font-medium text-forest-700">Listening — speak now.</span>
                  ) : (
                    "Speak, or type it here. Both use the same parser."
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void runExtraction(liveSentence)}
                  loading={busy}
                  disabled={sentenceLength < 4 || speech.listening}
                  icon={<ArrowRight className="size-4" />}
                >
                  Read my sentence
                </Button>
                {transcript ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setTranscript("");
                      speech.reset();
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

              {error ? (
                <p
                  className="rounded-[5px] border border-danger/20 bg-danger-soft px-2.5 py-1.5 text-[11.5px] leading-relaxed text-danger"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
                  Try an example
                </p>
                <ul className="mt-2 space-y-1.5">
                  {EXAMPLES.map((example) => (
                    <li key={example.label}>
                      <button
                        type="button"
                        onClick={() => {
                          setTranscript(example.text);
                          void runExtraction(example.text);
                        }}
                        disabled={busy}
                        className="group flex w-full items-start gap-2.5 rounded-[5px] border border-ivory-300 bg-white px-2.5 py-2 text-left transition-colors hover:border-forest/35 hover:bg-forest-50/70 disabled:opacity-50"
                      >
                        <span className="mt-px shrink-0 rounded-[3px] bg-ivory px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-charcoal-500 group-hover:bg-white">
                          {example.label}
                        </span>
                        <span className="line-clamp-2 min-w-0 font-devanagari text-[11.5px] leading-snug text-charcoal-500">
                          {example.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ivory-200 px-4 py-2.5 text-[11px] text-charcoal-400 sm:px-5">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-forest-500" aria-hidden />
              You review every field before it goes live
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-forest-500" aria-hidden />
              Missing details are asked for, never invented
            </span>
          </div>
        </Panel>
      ) : null}

      {/* Review stage */}
      <AnimatePresence>
        {phase === "review" && extraction ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 lg:grid-cols-[1.25fr_1fr]"
          >
            <Panel className="overflow-hidden">
              <PanelHeader
                title={
                  <span className="flex items-center gap-1.5">
                    <PencilLine className="size-4 text-forest-600" aria-hidden />
                    Review and edit
                  </span>
                }
                description="Everything below is pre-filled from your sentence. Change anything that is off."
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("idle");
                      setExtraction(null);
                      speech.reset();
                    }}
                    className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px] font-medium text-charcoal-500 transition-colors hover:bg-charcoal/5 hover:text-forest-700"
                  >
                    <RefreshCw className="size-3" aria-hidden /> Start again
                  </button>
                }
              />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-ivory-200 bg-ivory/40 px-4 py-3 text-[11.5px] sm:grid-cols-4">
                <div>
                  <dt className="text-sage">Confidence</dt>
                  <dd className="font-semibold text-charcoal tabular">
                    {Math.round(extraction.confidence * 100)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-sage">Language</dt>
                  <dd className="font-semibold text-charcoal">
                    {extraction.language === "hi" ? "Hindi/Hinglish" : extraction.language === "pa" ? "Punjabi" : extraction.language === "en" ? "English" : "Mixed"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage">Extracted by</dt>
                  <dd className="font-semibold text-charcoal">
                    {extraction.provider === "llm" ? "Language model" : "Rules engine"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage">Fields filled</dt>
                  <dd className="font-semibold text-charcoal tabular">{completeness} of 5</dd>
                </div>
              </dl>

              {extraction.notes.length > 0 ? (
                <ul className="space-y-1 border-b border-ivory-200 bg-gold-50/60 px-4 py-2">
                  {extraction.notes.map((note) => (
                    <li key={note} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-charcoal-500">
                      <TriangleAlert className="mt-0.5 size-3 shrink-0 text-gold-700" aria-hidden />
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Follow-up */}
              {extraction.missing.length > 0 ? (
                <div className="border-b border-charcoal/10 bg-gold-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-700">
                    One more thing
                  </p>
                  <p className="mt-1 font-devanagari text-[12.5px] leading-relaxed text-charcoal">
                    {extraction.followUp}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={followUpAnswer}
                      onChange={(event) => setFollowUpAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleFollowUp();
                        }
                      }}
                      placeholder="Answer here — or fill the field below"
                      className="field-base h-8 flex-1 py-0 text-[12.5px] font-devanagari"
                      aria-label="Answer the follow-up question"
                    />
                    <Button type="button" size="sm" variant="gold" onClick={() => void handleFollowUp()} loading={busy}>
                      Add
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-charcoal-400">
                    Missing: {extraction.missing.join(", ")}. You can also type the value directly
                    into the form — nothing is invented for you.
                  </p>
                </div>
              ) : null}

              <form ref={formRef} action={publish} className="space-y-3.5 p-4" id="publish-form">
                <input type="hidden" name="source" value="VOICE" />
                <input type="hidden" name="state" value={fields.state} />
                <input type="hidden" name="lat" value={defaults.lat ?? ""} />
                <input type="hidden" name="lng" value={defaults.lng ?? ""} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Produce" htmlFor="commodity" required error={listState.errors?.commodity?.[0]}>
                    <Input
                      id="commodity"
                      name="commodity"
                      value={fields.commodity}
                      onChange={(event) => update("commodity", event.target.value)}
                      placeholder="Tomatoes"
                      required
                    />
                  </Field>
                  <Field label="Category" htmlFor="categorySlug" required>
                    <Select
                      id="categorySlug"
                      name="categorySlug"
                      value={fields.categorySlug}
                      onChange={(event) => update("categorySlug", event.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Quantity"
                    htmlFor="quantity"
                    hint={fields.unit}
                    required
                    error={listState.errors?.quantity?.[0]}
                  >
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={fields.quantity}
                      onChange={(event) => update("quantity", event.target.value)}
                      required
                    />
                  </Field>
                  <Field
                    label="Asking price"
                    htmlFor="askingPrice"
                    hint="₹/kg"
                    required
                    error={listState.errors?.askingPrice?.[0]}
                  >
                    <Input
                      id="askingPrice"
                      name="askingPrice"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={fields.askingPrice}
                      onChange={(event) => update("askingPrice", event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Unit" htmlFor="unit" hint="converted to kg">
                    <Select
                      id="unit"
                      name="unit"
                      value={fields.unit}
                      onChange={(event) => update("unit", event.target.value)}
                    >
                      <option value="kg">kg</option>
                      <option value="quintal">quintal (100 kg)</option>
                      <option value="tonne">tonne (1,000 kg)</option>
                      <option value="dozen">dozen</option>
                      <option value="piece">piece</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Available from" htmlFor="availableFrom" required error={listState.errors?.availableFrom?.[0]}>
                    <Input
                      id="availableFrom"
                      name="availableFrom"
                      type="datetime-local"
                      value={fields.availableFrom}
                      onChange={(event) => update("availableFrom", event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Variety" htmlFor="variety" hint="optional">
                    <Input
                      id="variety"
                      name="variety"
                      value={fields.variety}
                      onChange={(event) => update("variety", event.target.value)}
                      placeholder="Hybrid, local red"
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                  <Field label="Pickup location" htmlFor="location" required error={listState.errors?.location?.[0]}>
                    <Input
                      id="location"
                      name="location"
                      value={fields.location}
                      onChange={(event) => update("location", event.target.value)}
                      placeholder="Kharar, SAS Nagar"
                      required
                    />
                  </Field>
                  <Field label="District" htmlFor="district" required error={listState.errors?.district?.[0]}>
                    <Input
                      id="district"
                      name="district"
                      value={fields.district}
                      onChange={(event) => update("district", event.target.value)}
                      required
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <Field label="Grade" htmlFor="grade" hint="optional">
                    <Select
                      id="grade"
                      name="grade"
                      value={fields.grade}
                      onChange={(event) => update("grade", event.target.value)}
                    >
                      <option value="">Not stated</option>
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                    </Select>
                  </Field>
                  <Field label="Description" htmlFor="description" hint="optional">
                    <Textarea
                      id="description"
                      name="description"
                      rows={2}
                      value={fields.description}
                      onChange={(event) => update("description", event.target.value)}
                      placeholder="Packing, crate size, loading arrangements…"
                    />
                  </Field>
                </div>

                <Checkbox
                  name="pickupOnly"
                  defaultChecked={fields.pickupOnly}
                  label="Farm-gate pickup only"
                  description="Buyers must collect; you are not arranging transport."
                />

                <Callout tone="neutral">
                  Grade is shown as “stated by the farmer” unless independently checked. Mandi
                  Relay does not certify quality.
                </Callout>
              </form>
            </Panel>

            {/* Preview + publish */}
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Panel className="overflow-hidden">
                <div className="border-b border-ivory-200 bg-ivory px-3.5 py-2">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-charcoal-500">
                    Buyer preview
                  </p>
                </div>
                <div className="p-3.5">
                  <div className="rounded-[6px] border border-ivory-300 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[15px] font-bold text-charcoal">
                          {fields.commodity || "Produce name"}
                        </p>
                        <p className="text-[11px] text-charcoal-400">
                          {fields.variety || categories.find((c) => c.slug === fields.categorySlug)?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-[16px] font-bold text-forest-800 tabular">
                          {fields.askingPrice ? formatINR(Number(fields.askingPrice)) : "₹—"}
                        </p>
                        <p className="text-[10px] text-charcoal-400">per kg</p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-ivory-200 pt-2 text-[11px]">
                      <div>
                        <p className="text-sage">Available</p>
                        <p className="font-semibold text-charcoal tabular">
                          {fields.quantity
                            ? `${formatNumber(Number(fields.quantity) * unitFactor)} kg`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sage">Lot value</p>
                        <p className="font-semibold text-charcoal tabular">
                          {totalValue > 0 ? formatINR(totalValue) : "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sage">Pickup</p>
                        <p className="truncate font-medium text-charcoal">
                          {fields.location || "—"}
                          {fields.district ? `, ${fields.district}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {listState.message && !listState.ok ? (
                      <p className="rounded-[4px] bg-danger-soft px-2.5 py-1.5 text-[11.5px] text-danger" role="alert">
                        {listState.message}
                      </p>
                    ) : null}

                    {online ? (
                      <Button
                        type="button"
                        className="w-full"
                        size="lg"
                        loading={publishing}
                        disabled={completeness < 5}
                        onClick={() => formRef.current?.requestSubmit()}
                        icon={<Check className="size-4" />}
                      >
                        Publish listing
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          className="w-full"
                          variant="gold"
                          onClick={() => saveDraftLocally()}
                          icon={<CloudOff className="size-4" />}
                        >
                          Save draft on this device
                        </Button>
                        {queued ? (
                          <p className="flex items-center gap-1.5 rounded-[4px] bg-ivory px-2 py-1.5 text-[11px] text-charcoal-500">
                            <Wifi className="size-3" aria-hidden /> Saved. Publish it when you are
                            back online — nothing is sent automatically.
                          </p>
                        ) : null}
                      </>
                    )}

                    {completeness < 5 ? (
                      <p className="text-[10.5px] leading-relaxed text-charcoal-400">
                        Fill the remaining fields in the form to publish. {5 - completeness} still
                        needed.
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => saveDraftLocally()}
                      className="w-full rounded-[4px] border border-ivory-300 py-1.5 text-[11.5px] font-medium text-charcoal-500 transition-colors hover:border-forest/30 hover:text-forest-700"
                    >
                      Save draft and finish later
                    </button>
                  </div>
                </div>
              </Panel>

              <Panel className="p-3.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
                  From your sentence
                </p>
                <p className="mt-1.5 font-devanagari text-[11.5px] leading-relaxed text-charcoal-500">
                  “{transcript}”
                </p>
              </Panel>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
