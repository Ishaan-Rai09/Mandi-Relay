"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, MapPin, CalendarDays, Package, Tag, Wheat } from "lucide-react";

import type { ExtractedListing } from "@/lib/ai/extract";
import { cn, formatDate, formatINR } from "@/lib/utils";

interface Row {
  key: string;
  label: string;
  value: string | null;
  icon: typeof Wheat;
  hint?: string;
}

function rowsFor(e: ExtractedListing): Row[] {
  return [
    { key: "commodity", label: "Produce", value: e.commodity, icon: Wheat },
    {
      key: "quantity",
      label: "Quantity",
      value: e.quantity != null ? `${e.quantity.toLocaleString("en-IN")} kg` : null,
      icon: Package,
    },
    { key: "location", label: "Pickup location", value: e.location, icon: MapPin },
    {
      key: "availableFrom",
      label: "Available from",
      value: e.availableFrom
        ? formatDate(e.availableFrom, { hour: "numeric", minute: "2-digit" })
        : null,
      icon: CalendarDays,
    },
    {
      key: "askingPrice",
      label: "Seeking",
      value:
        e.askingPrice != null
          ? `${formatINR(e.askingPrice)}${e.priceIsMinimum ? "+" : ""} / kg`
          : null,
      icon: Tag,
      hint: e.priceIsMinimum ? "minimum acceptable rate" : undefined,
    },
  ];
}

export function ExtractionView({
  extraction,
  compact,
  onFieldClick,
}: {
  extraction: ExtractedListing;
  compact?: boolean;
  onFieldClick?: (key: string) => void;
}) {
  const rows = rowsFor(extraction);
  const reduced = useReducedMotion();

  return (
    <ul className={cn("divide-y divide-ivory-200", compact ? "text-[12.5px]" : "text-[13px]")}>
      {rows.map((row, index) => {
        const missing = row.value == null;
        const Icon = row.icon;
        const Tag = onFieldClick ? "button" : "div";
        return (
          <motion.li
            key={row.key}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : index * 0.06, duration: 0.24 }}
          >
            <Tag
              {...(onFieldClick
                ? {
                    type: "button" as const,
                    onClick: () => onFieldClick(row.key),
                    className: "flex w-full items-center gap-3 py-2 text-left transition-colors hover:bg-ivory/60",
                  }
                : { className: "flex w-full items-center gap-3 py-2" })}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-[3px] border",
                  missing
                    ? "border-dashed border-sage/50 bg-ivory text-sage"
                    : "border-forest/15 bg-forest-50 text-forest-700",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="w-[104px] shrink-0 text-[11.5px] uppercase tracking-[0.06em] text-sage">
                {row.label}
              </span>
              <span className="min-w-0 flex-1">
                {missing ? (
                  <span className="inline-flex items-center gap-1 text-[12px] text-warning">
                    <AlertCircle className="size-3.5" aria-hidden />
                    Not mentioned
                  </span>
                ) : (
                  <span className="font-medium text-charcoal">{row.value}</span>
                )}
                {row.hint && !missing ? (
                  <span className="ml-1.5 text-[11px] text-charcoal-400">({row.hint})</span>
                ) : null}
              </span>
              {!missing ? (
                <Check className="size-3.5 shrink-0 text-forest-500" aria-hidden />
              ) : null}
            </Tag>
          </motion.li>
        );
      })}
    </ul>
  );
}
