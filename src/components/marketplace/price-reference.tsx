import { Info, TrendingDown, TrendingUp } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { cn, formatDate, formatINR } from "@/lib/utils";

export interface ReferenceRow {
  commodity: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  reportDate: Date;
  source: string;
}

/**
 * Compares the farmer's ask with the latest official reference price. The
 * reference is per quintal; the ask is per kg, so it is converted before the
 * gap is shown. The source and report date stay on screen so a quotation is
 * never mistaken for a transaction price.
 */
export function PriceReferencePanel({
  reference,
  askingPerKg,
  history,
  className,
}: {
  reference: ReferenceRow | null;
  askingPerKg: number;
  history?: ReferenceRow[];
  className?: string;
}) {
  if (!reference) {
    return (
      <Panel className={cn("p-4", className)}>
        <p className="text-[12.5px] leading-relaxed text-charcoal-500">
          No published reference price is loaded for this commodity yet. Ask prices are shown
          without a comparison rather than against an invented number.
        </p>
      </Panel>
    );
  }

  const modalPerKg = reference.modalPrice / 100;
  const minPerKg = reference.minPrice / 100;
  const maxPerKg = reference.maxPrice / 100;
  const gapPct = ((askingPerKg - modalPerKg) / modalPerKg) * 100;
  const above = gapPct > 1;
  const below = gapPct < -1;

  const ordered = (history ?? []).slice().sort((a, b) => a.reportDate.getTime() - b.reportDate.getTime());
  const series = ordered.map((row) => row.modalPrice / 100);
  const chartMax = Math.max(...series, maxPerKg, askingPerKg) * 1.06;
  const chartMin = Math.min(...series, minPerKg, askingPerKg) * 0.94;

  return (
    <Panel className={cn("overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-ivory-200 px-4 py-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
            Reference price
          </p>
          <p className="mt-0.5 text-[12.5px] font-medium text-charcoal">{reference.market}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            above ? "bg-warning-soft text-warning" : below ? "bg-success-soft text-success" : "bg-ivory-200 text-charcoal-500",
          )}
        >
          {above ? <TrendingUp className="size-3" aria-hidden /> : below ? <TrendingDown className="size-3" aria-hidden /> : null}
          {Math.abs(gapPct) < 0.5 ? "at modal" : `${Math.abs(gapPct).toFixed(0)}% ${above ? "above" : "below"}`}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-ivory-200 border-b border-ivory-200">
        {[
          { label: "Min / kg", value: minPerKg },
          { label: "Modal / kg", value: modalPerKg, strong: true },
          { label: "Max / kg", value: maxPerKg },
        ].map((cell) => (
          <div key={cell.label} className="px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.06em] text-sage">{cell.label}</p>
            <p
              className={cn(
                "mt-0.5 text-[13.5px] font-semibold tabular",
                cell.strong ? "text-forest-700" : "text-charcoal",
              )}
            >
              {formatINR(cell.value, true)}
            </p>
          </div>
        ))}
      </div>

      {series.length > 1 ? (
        <div className="px-3 pb-1 pt-3">
          <p className="mb-1 text-[10px] uppercase tracking-[0.06em] text-sage">
            Modal price, last {series.length} reports
          </p>
          <svg viewBox="0 0 300 64" className="h-16 w-full" role="img" aria-label="Reference price trend">
            <defs>
              <linearGradient id="refFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a6147" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2a6147" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const x = (i: number) => 4 + (i * 292) / Math.max(1, series.length - 1);
              const y = (v: number) => 58 - ((v - chartMin) / Math.max(1, chartMax - chartMin)) * 50;
              const points = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
              const area = `M${x(0)},58 L${points
                .split(" ")
                .map((p) => p)
                .join(" L")} L${x(series.length - 1)},58 Z`;
              return (
                <>
                  <path d={area} fill="url(#refFill)" />
                  <polyline points={points} fill="none" stroke="#2a6147" strokeWidth="1.8" strokeLinejoin="round" />
                  <line
                    x1="4"
                    x2="296"
                    y1={y(askingPerKg)}
                    y2={y(askingPerKg)}
                    stroke="#c99420"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <text x="296" y={y(askingPerKg) - 3} textAnchor="end" fontSize="7.5" fill="#a97b12">
                    ask
                  </text>
                </>
              );
            })()}
          </svg>
        </div>
      ) : null}

      <div className="flex items-start gap-1.5 border-t border-ivory-200 bg-ivory px-3 py-2 text-[10.5px] leading-relaxed text-charcoal-400">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span>
          {reference.source} · reported {formatDate(reference.reportDate)}. Reference prices
          describe a market, not a completed transaction.
        </span>
      </div>
    </Panel>
  );
}
