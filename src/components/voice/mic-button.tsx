"use client";

import { Mic, MicOff, Square } from "lucide-react";

import { ListeningRings, Waveform } from "@/components/voice/waveform";
import { cn } from "@/lib/utils";

export function MicButton({
  listening,
  level,
  onToggle,
  disabled,
  size = "lg",
  label,
}: {
  listening: boolean;
  level: number;
  onToggle: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
  label?: string;
}) {
  const dimension = size === "lg" ? "size-24 sm:size-28" : "size-16";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ListeningRings active={listening} />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? "Stop recording" : "Start voice input"}
          className={cn(
            "relative grid place-items-center rounded-full transition-all duration-300 disabled:opacity-40",
            dimension,
            listening
              ? "bg-forest text-white shadow-[0_0_0_10px_rgba(24,61,43,0.08),0_18px_40px_-18px_rgba(24,61,43,0.7)]"
              : "bg-white text-forest-700 shadow-[var(--shadow-e2)] ring-1 ring-forest/15 hover:ring-forest/35 hover:shadow-[var(--shadow-e3)]",
          )}
        >
          {listening ? (
            <Square className={size === "lg" ? "size-7" : "size-5"} fill="currentColor" strokeWidth={0} />
          ) : (
            <Mic className={size === "lg" ? "size-9" : "size-6"} strokeWidth={1.7} />
          )}
        </button>
        {listening && size === "lg" ? (
          <div className="pointer-events-none absolute inset-x-0 -bottom-1 translate-y-full pt-3">
            <Waveform level={level} active bars={20} className="h-6 w-40" />
          </div>
        ) : null}
      </div>
      {label ? (
        <p className={cn("text-[12px] font-medium", listening ? "text-forest-700" : "text-charcoal-400")}>
          {label}
        </p>
      ) : null}
    </div>
  );
}

export function MicUnavailable({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[6px] border border-warning/25 bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-charcoal-500">
      <MicOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
