import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { BadgeCheck, FlaskConical } from "lucide-react";

/** A bordered surface. Used deliberately — not every section is a card. */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[8px] border border-ivory-300 bg-white shadow-[var(--shadow-e1)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-ivory-200 px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-bold tracking-[-0.01em] text-charcoal">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[13px] leading-relaxed text-charcoal-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "gold" | "forest";

const tones: Record<Tone, string> = {
  neutral: "bg-ivory-200 text-charcoal-500 border-ivory-300",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
  gold: "bg-gold-100 text-gold-700 border-gold/40",
  forest: "bg-forest-50 text-forest-700 border-forest/20",
};

export function Pill({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] border border-dashed border-sage/60 bg-ivory px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sage",
        className,
      )}
      title="This record is demonstration data created by the seed script, not real market activity."
    >
      <FlaskConical className="size-3" aria-hidden />
      Demo
    </span>
  );
}

export function VerifiedBadge({ verified, className }: { verified: boolean; className?: string }) {
  if (!verified) {
    return (
      <span className={cn("text-[11.5px] text-sage", className)} title="Identity not yet verified">
        Unverified
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11.5px] font-medium text-forest-600", className)}
      title="Phone and profile details verified by Mandi Relay"
    >
      <BadgeCheck className="size-3.5" aria-hidden />
      Verified
    </span>
  );
}
