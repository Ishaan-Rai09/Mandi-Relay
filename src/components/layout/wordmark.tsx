import { cn } from "@/lib/utils";

/**
 * Wordmark: a relay mark built from three converging strokes — three sellers,
 * one market. Drawn rather than imported so it stays crisp at every size.
 */
export function Mark({ className, tone = "forest" }: { className?: string; tone?: "forest" | "ivory" }) {
  const stroke = tone === "ivory" ? "#F5F3EC" : "#183D2B";
  const accent = "#F4B942";
  return (
    <svg viewBox="0 0 28 28" className={cn("size-7", className)} aria-hidden>
      <rect width="28" height="28" rx="6" fill={tone === "ivory" ? "#F5F3EC" : "#183D2B"} />
      <path d="M7 19.5c0-4 2.6-7.2 6.5-7.2" fill="none" stroke={tone === "ivory" ? "#183D2B" : "#F5F3EC"} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 19.5c0-4-2.6-7.2-6.5-7.2" fill="none" stroke={tone === "ivory" ? "#183D2B" : "#F5F3EC"} strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <circle cx="14" cy="9.2" r="2.4" fill={accent} />
      <path d="M14 12v7.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" opacity="0" />
    </svg>
  );
}

export function Wordmark({
  compact,
  tone = "forest",
  className,
}: {
  compact?: boolean;
  tone?: "forest" | "ivory";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark tone={tone} className={compact ? "size-6" : "size-7"} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-extrabold uppercase tracking-[0.1em]",
            compact ? "text-[12.5px]" : "text-[13.5px]",
            tone === "ivory" ? "text-ivory" : "text-forest-800",
          )}
        >
          Mandi Relay
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1 text-[8.5px] uppercase tracking-[0.16em]",
              tone === "ivory" ? "text-ivory/60" : "text-sage",
            )}
          >
            Your voice, your market
          </span>
        ) : null}
      </span>
    </span>
  );
}
