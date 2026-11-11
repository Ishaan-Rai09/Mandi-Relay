"use client";

import { Check, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { acceptQuoteAction } from "@/lib/actions/delivery";
import { formatINR } from "@/lib/utils";

export interface QuoteView {
  id: string;
  amount: number;
  etaHours: number | null;
  message: string | null;
  status: string;
  transporter: { name: string; verified: boolean; vehicleType: string | null };
}

export function TransportQuotes({
  requestId,
  status,
  quotes,
}: {
  requestId: string;
  status: string;
  quotes: QuoteView[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (quotes.length === 0) {
    return (
      <p className="inline-flex items-center gap-1 text-[10.5px] text-charcoal-400">
        <Truck className="size-3" aria-hidden /> Requested · waiting for quotes
      </p>
    );
  }

  if (status === "ASSIGNED" || status === "PICKED_UP" || status === "IN_TRANSIT" || status === "DELIVERED") {
    const selected = quotes.find((quote) => quote.status === "SELECTED");
    if (!selected) {
      return (
        <p className="inline-flex items-center gap-1 text-[10.5px] text-success">
          <Truck className="size-3" aria-hidden /> Transporter assigned
        </p>
      );
    }
    return (
      <p className="inline-flex items-center gap-1 rounded-[3px] bg-info-soft px-1.5 py-0.5 text-[10.5px] text-info">
        <Truck className="size-3" aria-hidden />
        {selected.transporter.name} · {formatINR(selected.amount)} ·{" "}
        {status.replace(/_/g, " ").toLowerCase()}
      </p>
    );
  }

  const accept = (quoteId: string) => {
    setPendingId(quoteId);
    startTransition(async () => {
      const result = await acceptQuoteAction(quoteId);
      setPendingId(null);
      if (result.ok) toast.success("Transporter selected", result.message);
      else toast.error("Could not assign", result.message);
      router.refresh();
    });
  };

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sage">
        {quotes.length} transport quote{quotes.length === 1 ? "" : "s"}
      </p>
      {quotes.map((quote) => (
        <div
          key={quote.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-ivory-300 bg-white px-2 py-1.5"
        >
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-medium text-charcoal">
              {quote.transporter.name}
              {quote.transporter.verified ? (
                <span className="ml-1 text-[10px] text-forest-600">verified</span>
              ) : null}
            </p>
            <p className="text-[10px] text-charcoal-400">
              {formatINR(quote.amount)}
              {quote.etaHours ? ` · ~${quote.etaHours}h` : ""}
              {quote.message ? ` · ${quote.message}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => accept(quote.id)}
            disabled={pendingId === quote.id}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-[3px] bg-forest px-1.5 py-0.5 text-[10.5px] font-medium text-white hover:bg-forest-700 disabled:opacity-50"
          >
            <Check className="size-3" aria-hidden />
            {pendingId === quote.id ? "Assigning…" : "Select"}
          </button>
        </div>
      ))}
      <p className="text-[10px] text-charcoal-400">
        Request {requestId.slice(0, 8)} · selecting one declines the others.
      </p>
    </div>
  );
}
