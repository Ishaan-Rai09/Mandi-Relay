"use client";

import { ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useState, useTransition } from "react";

import { MicButton } from "@/components/voice/mic-button";
import { ExtractionView } from "@/components/voice/extraction-view";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech";
import { extractListingAction } from "@/lib/actions/voice";
import type { ExtractedListing } from "@/lib/ai/extract";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon.",
  "I have 300 kg of onions ready in Banur at 22 rupees per kilo.",
  "ਸਾਡੇ ਕੋਲ ਪਰਸੋਂ 2 ਕੁਇੰਟਲ ਫੁੱਲ ਗੋਭੀ ਤਿਆਰ ਹੈ, ਖਰੜ ਤੋਂ।",
  "150 kg potatoes, pickup from Kharar, 15 rupees a kg.",
];

export function VoicePlayground() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExtractedListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const speech = useSpeechRecognition({
    language: "auto",
    onFinal: (transcript) => setText(transcript),
  });

  const run = (value?: string) => {
    const transcript = (value ?? text).trim();
    if (transcript.length < 4) {
      setError("Type or say a sentence about your produce first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const response = await extractListingAction(transcript);
      if (!response.ok || !response.extraction) {
        setError(response.error ?? "Could not read that. Try again.");
        return;
      }
      setResult(response.extraction);
    });
  };

  return (
    <div className="overflow-hidden rounded-[10px] border border-ivory-300 bg-white shadow-[var(--shadow-e2)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-200 bg-ivory px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-charcoal-500">
          <Wand2 className="size-3.5 text-forest-600" aria-hidden /> Try the parser
        </p>
        <p className="text-[10.5px] text-charcoal-400">
          The same extraction used for real listings · Hindi, Punjabi, English
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_1fr]">
        <div className="border-b border-ivory-200 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-4">
            <MicButton
              listening={speech.listening}
              level={speech.level}
              onToggle={() => (speech.listening ? speech.stop() : speech.start())}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={4}
                placeholder="Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon…"
                className="field-base font-devanagari resize-none text-[13px] leading-relaxed"
                aria-label="Describe the produce you have available"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button onClick={() => run()} loading={pending} size="sm" icon={<Sparkles className="size-3.5" />}>
                  Extract listing
                </Button>
                {text ? (
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      setResult(null);
                      speech.reset();
                    }}
                    className="text-[12px] text-charcoal-400 underline-offset-2 hover:text-charcoal hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {speech.error ? (
            <p className="mt-2 rounded-[4px] bg-warning-soft px-2.5 py-1.5 text-[11.5px] leading-relaxed text-warning">
              {speech.error}
            </p>
          ) : null}

          <div className="mt-3.5">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-sage">Try an example</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EXAMPLES.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setText(example);
                    run(example);
                  }}
                  className="max-w-full truncate rounded-full border border-ivory-300 bg-ivory px-2.5 py-1 text-left text-[11px] text-charcoal-500 transition-colors hover:border-forest/30 hover:text-forest-700"
                  title={example}
                >
                  {index === 0 ? "Hinglish tomatoes" : index === 1 ? "English onions" : index === 2 ? "Punjabi cauliflower" : "Potatoes, pickup"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative p-4">
          {pending ? (
            <div className="flex items-center gap-2 py-8 text-[12.5px] text-charcoal-400">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the sentence…
            </div>
          ) : result ? (
            <div>
              <p className="mb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage">
                <span>Extracted fields</span>
                <span className="rounded-[3px] bg-forest-50 px-1.5 py-0.5 normal-case tracking-normal text-forest-700">
                  {Math.round(result.confidence * 100)}% complete
                </span>
              </p>
              <ExtractionView extraction={result} compact />
              {result.followUp ? (
                <div className="mt-3 rounded-[5px] border border-gold/40 bg-gold-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-700">
                    Follow-up needed
                  </p>
                  <p className="mt-0.5 font-devanagari text-[12.5px] leading-relaxed text-charcoal">
                    {result.followUp}
                  </p>
                </div>
              ) : (
                <p className={cn("mt-3 text-[12px] leading-relaxed text-forest-700")}>
                  Everything needed for a listing was understood.
                </p>
              )}
              <a
                href="/auth?mode=signup&role=farmer"
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
              >
                Publish a listing like this <ArrowRight className="size-3" aria-hidden />
              </a>
            </div>
          ) : (
            <div className="flex h-full min-h-[190px] flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 grid size-9 place-items-center rounded-full border border-dashed border-sage/50 text-sage">
                <Sparkles className="size-4" aria-hidden />
              </div>
              <p className="text-[12.5px] font-medium text-charcoal">Nothing extracted yet</p>
              <p className="mt-1 max-w-[240px] text-[11.5px] leading-relaxed text-charcoal-400">
                Speak or type a sentence. Missing details stay missing — the parser never invents
                a quantity, price or date.
              </p>
            </div>
          )}
          {error ? (
            <p className="mt-2 text-[11.5px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
