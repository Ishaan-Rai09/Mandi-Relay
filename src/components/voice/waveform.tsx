"use client";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const BAR_COUNT = 32;
const HEIGHTS = [
  0.22, 0.34, 0.5, 0.42, 0.66, 0.88, 0.58, 0.4, 0.72, 0.95, 0.62, 0.38, 0.54, 0.78, 0.9,
  0.56, 0.44, 0.7, 0.86, 0.62, 0.48, 0.8, 0.94, 0.6, 0.36, 0.52, 0.74, 0.9, 0.64, 0.42,
  0.3, 0.2,
];

/**
 * Voice-reactive waveform. The level comes from a real microphone meter when
 * available, so the visual genuinely tracks the speaker rather than looping a
 * decorative animation.
 */
export function Waveform({
  level = 0,
  active = false,
  className,
  bars = BAR_COUNT,
  tone = "forest",
}: {
  level?: number;
  active?: boolean;
  className?: string;
  bars?: number;
  tone?: "forest" | "ivory" | "gold";
}) {
  const reduced = useReducedMotion();
  const color =
    tone === "ivory" ? "bg-ivory" : tone === "gold" ? "bg-gold" : "bg-forest-600";

  return (
    <div
      className={cn("flex h-10 items-center justify-center gap-[3px]", className)}
      aria-hidden
    >
      {HEIGHTS.slice(0, bars).map((base, index) => {
        const intensity = active ? Math.max(0.16, Math.min(1, base * 0.55 + level * base * 1.25)) : 0.14;
        return (
          <span
            key={index}
            className={cn("w-[3px] rounded-full transition-[height,opacity] duration-100 ease-out", color)}
            style={{
              height: `${Math.round(intensity * 100)}%`,
              opacity: active ? 0.55 + intensity * 0.45 : 0.28,
              transitionDuration: reduced ? "0ms" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

/** Three orbiting arcs around the microphone while recording. */
export function ListeningRings({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  if (!active || reduced) return null;
  return (
    <>
      <span className="pointer-events-none absolute inset-0 rounded-full border border-forest/25 motion-safe:animate-ping [animation-duration:2.4s]" />
      <span className="pointer-events-none absolute inset-0 rounded-full border border-forest/15 motion-safe:animate-ping [animation-delay:0.8s] [animation-duration:2.4s]" />
    </>
  );
}
