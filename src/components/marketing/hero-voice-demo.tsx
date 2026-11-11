"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Waveform } from "@/components/voice/waveform";
import { cn } from "@/lib/utils";

const SPOKEN =
  "Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon. Mujhe 20 rupaye kilo se achha rate chahiye.";

const FIELDS = [
  { label: "Produce", value: "Tomatoes" },
  { label: "Quantity", value: "500 kg" },
  { label: "Available", value: "Tomorrow, morning" },
  { label: "Location", value: "Mohali, Punjab" },
  { label: "Seeking", value: "₹20+ / kg" },
];

type Phase = "idle" | "listening" | "processing" | "extracting" | "listed";

/**
 * The hero demonstration runs the same extraction result a farmer would get,
 * but animates it on a fixed timeline so the page reads without interaction.
 * A real microphone is never requested automatically.
 */
export function HeroVoiceDemo() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [level, setLevel] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) {
      setPhase("listed");
      setTyped(SPOKEN);
      return;
    }

    let cancelled = false;
    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
      timers.current.push(id);
    };

    const runCycle = (startAt: number) => {
      schedule(() => {
        setPhase("listening");
        setTyped("");
      }, startAt + 900);

      // Type the transcript progressively.
      const chars = SPOKEN.length;
      const perChar = Math.min(26, 2600 / chars);
      for (let i = 1; i <= chars; i += 1) {
        schedule(() => setTyped(SPOKEN.slice(0, i)), startAt + 1100 + i * perChar);
      }

      schedule(() => {
        setPhase("processing");
        setLevel(0);
      }, startAt + 5000);
      schedule(() => setPhase("extracting"), startAt + 6100);
      schedule(() => setPhase("listed"), startAt + 7300);
      schedule(() => {
        setPhase("idle");
        setTyped("");
        runCycle(0);
      }, startAt + 11500);
    };

    runCycle(0);

    return () => {
      cancelled = true;
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [reduced]);

  // Synthetic microphone level while "listening".
  useEffect(() => {
    if (phase !== "listening") return;
    const id = window.setInterval(() => {
      setLevel(() => 0.25 + Math.random() * 0.65);
    }, 120);
    return () => window.clearInterval(id);
  }, [phase]);

  const active = phase === "listening";

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[10px] border border-charcoal/10 bg-white shadow-[var(--shadow-e4)]">
        {/* Panel header */}
        <div className="flex items-center justify-between gap-3 border-b border-ivory-200 bg-ivory px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-forest-600" aria-hidden />
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-charcoal-500">
              Voice listing
            </p>
          </div>
          <p className="hidden items-center gap-1 text-[10.5px] text-charcoal-400 sm:flex">
            <Sparkles className="size-3" aria-hidden /> AI extraction preview
          </p>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1fr_0.92fr]">
          {/* Left: listening */}
          <div className="relative border-b border-ivory-200 p-5 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "relative grid size-11 shrink-0 place-items-center rounded-full transition-colors",
                  active ? "bg-forest text-white" : "bg-ivory-200 text-forest-700",
                )}
              >
                {active ? (
                  <span className="absolute inset-0 rounded-full border border-forest/30 motion-safe:animate-ping [animation-duration:2.2s]" />
                ) : null}
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" strokeLinecap="round" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-charcoal">
                  {phase === "idle" && "Ready to listen"}
                  {active && "Listening…"}
                  {phase === "processing" && "Understanding…"}
                  {phase === "extracting" && "Extracting details…"}
                  {phase === "listed" && "Listing ready"}
                </p>
                <p className="text-[11px] text-charcoal-400">
                  {active ? "Speak in Hindi, Punjabi or English" : "Microphone not enabled in this preview"}
                </p>
              </div>
            </div>

            <div className="mt-4 min-h-[92px] rounded-[6px] border border-ivory-200 bg-ivory/60 p-3">
              <p className="font-devanagari text-[13px] leading-relaxed text-charcoal">
                {typed || (
                  <span className="text-charcoal-400">
                    “Mere paas kal subah 500 kilo fresh tomatoes available hain…”
                  </span>
                )}
                {active ? (
                  <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-forest" />
                ) : null}
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Waveform active={active} level={level} bars={24} className="h-7 flex-1 justify-start" />
              <span
                className={cn(
                  "rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  active ? "bg-danger-soft text-danger" : "bg-ivory-200 text-sage",
                )}
              >
                {active ? "Rec" : "Idle"}
              </span>
            </div>
          </div>

          {/* Right: extraction */}
          <div className="bg-white p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage">
              {phase === "processing" ? (
                <>
                  <Loader2 className="size-3 animate-spin" aria-hidden /> Reading the sentence
                </>
              ) : phase === "extracting" || phase === "listed" ? (
                <>
                  <Check className="size-3 text-forest-500" aria-hidden /> Structured listing
                </>
              ) : (
                "Waiting for speech"
              )}
            </p>

            <ul className="divide-y divide-ivory-200">
              {FIELDS.map((field, index) => {
                const visible = phase === "extracting" || phase === "listed";
                const shown = visible && (phase === "listed" || index < 4);
                return (
                  <li key={field.label} className="flex items-center justify-between gap-3 py-[7px]">
                    <span className="text-[11px] uppercase tracking-[0.05em] text-sage">{field.label}</span>
                    <AnimatePresence mode="wait">
                      {shown ? (
                        <motion.span
                          key={field.value}
                          initial={reduced ? { opacity: 0 } : { opacity: 0, x: 6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.22 }}
                          className="rounded-[3px] bg-forest-50 px-1.5 py-0.5 text-[12px] font-semibold text-forest-800"
                        >
                          {field.value}
                        </motion.span>
                      ) : (
                        <motion.span
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="h-[18px] w-16 rounded-[3px] bg-ivory-200"
                        />
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>

            <AnimatePresence>
              {phase === "listed" ? (
                <motion.div
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="mt-3 rounded-[6px] border border-forest/20 bg-forest-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-[13px] font-bold text-forest-900">Tomatoes · Grade A</p>
                      <p className="mt-0.5 text-[11.5px] text-forest-700/80">
                        500 kg · ₹20/kg · Kharar, Mohali
                      </p>
                    </div>
                    <span className="rounded-[3px] bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-charcoal">
                      Live
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-forest-700">
                    Ready for farmer review <ArrowUpRight className="size-3" aria-hidden />
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[10.5px] text-charcoal-400 sm:text-left">
        Preview only — no microphone access is requested until you start a listing yourself.
      </p>
    </div>
  );
}
