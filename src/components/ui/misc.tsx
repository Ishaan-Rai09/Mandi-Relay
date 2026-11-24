import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Static layout primitives. Deliberately server components — these are imported
 * by nearly every page, so keeping them out of a client boundary keeps the
 * shared bundle small. Animated pieces live in `reveal.tsx`.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid size-11 place-items-center rounded-full border border-ivory-300 bg-ivory text-forest-600">
          {icon}
        </div>
      ) : null}
      <p className="font-display text-[15px] font-bold text-charcoal">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-charcoal-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CheckRow({ children, tone = "forest" }: { children: ReactNode; tone?: "forest" | "gold" }) {
  return (
    <li className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-charcoal-500">
      <svg viewBox="0 0 16 16" className="mt-1 size-3.5 shrink-0" aria-hidden>
        <path
          d="M3 8.5 6.2 11.5 13 4.5"
          fill="none"
          stroke={tone === "gold" ? "var(--color-gold-600)" : "var(--color-forest-600)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

/**
 * Numeric cell for the landing price table. Below `sm` the table rows become
 * stacked cards, so each cell carries its own column label.
 */
export function PriceCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "modal";
}) {
  return (
    <td
      className={cn(
        "px-3 py-2 tabular max-sm:px-0 max-sm:py-0",
        tone === "modal" ? "font-semibold text-forest-700" : "text-charcoal-500",
      )}
    >
      <span className="hidden text-[9.5px] font-semibold uppercase tracking-[0.08em] text-sage max-sm:block">
        {label}
      </span>
      {value}
    </td>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "gold" | "forest";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-[26px] font-bold leading-none tracking-[-0.03em] tabular",
          tone === "gold" ? "text-gold-700" : tone === "forest" ? "text-forest-700" : "text-charcoal",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[12px] leading-relaxed text-charcoal-500">{sub}</p> : null}
    </div>
  );
}

export function Divider({ className, vertical }: { className?: string; vertical?: boolean }) {
  return vertical ? (
    <span aria-hidden className={cn("block w-px self-stretch bg-ivory-300", className)} />
  ) : (
    <hr className={cn("border-0 border-t border-ivory-300", className)} />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[4px]", className)} />;
}

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "success" | "neutral";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info/20 bg-info-soft text-info",
    warning: "border-warning/25 bg-warning-soft text-warning",
    success: "border-success/20 bg-success-soft text-success",
    neutral: "border-ivory-300 bg-ivory text-charcoal-500",
  } as const;
  return (
    <div className={cn("rounded-[6px] border px-3.5 py-2.5 text-[12.5px] leading-relaxed", tones[tone], className)}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      <div className="text-charcoal-500">{children}</div>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-charcoal-500 transition-colors hover:text-forest-700"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.03em] text-charcoal sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-charcoal-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
