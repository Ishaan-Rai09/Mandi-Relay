"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function breakdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Auction clock. Renders a placeholder on the server and starts ticking after
 * mount so the markup never mismatches between server and client.
 */
export function Countdown({
  endsAt,
  className,
  compact,
  onExpire,
}: {
  endsAt: string;
  className?: string;
  compact?: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    let fired = false;
    const tick = () => {
      const ms = target - Date.now();
      setRemaining(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, onExpire]);

  if (remaining === null) {
    return <span className={cn("tabular text-charcoal-400", className)}>--:--:--</span>;
  }

  if (remaining <= 0) {
    return <span className={cn("font-semibold text-danger", className)}>Bidding closed</span>;
  }

  const { days, hours, minutes, seconds } = breakdown(remaining);

  if (compact) {
    return (
      <span className={cn("tabular font-semibold", className)}>
        {days > 0 ? `${days}d ` : ""}
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    );
  }

  const units = [
    ...(days > 0 ? [{ value: days, label: "days" }] : []),
    { value: hours, label: "hrs" },
    { value: minutes, label: "min" },
    { value: seconds, label: "sec" },
  ];

  return (
    <div className={cn("flex items-end gap-1.5", className)} role="timer" aria-live="off">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="min-w-11 rounded-[4px] border border-ivory-300 bg-white px-1.5 py-1 text-center"
        >
          <p className="font-display text-[17px] font-bold leading-none tracking-[-0.02em] text-charcoal tabular">
            {String(unit.value).padStart(2, "0")}
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-sage">{unit.label}</p>
        </div>
      ))}
    </div>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-danger">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-70" />
        <span className="relative inline-flex size-1.5 rounded-full bg-danger" />
      </span>
      {label}
    </span>
  );
}
