"use client";

import { Check, Gavel, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { placeBidAction } from "@/lib/actions/auctions";
import { IDLE } from "@/lib/schemas";
import { cn, formatINR, formatNumber } from "@/lib/utils";

export function BidPanel({
  auctionId,
  quantity,
  startingPrice,
  minIncrement,
  currentPrice,
  minNextBid,
  isLeader,
  yourHighestBid,
  live,
  isOwner,
}: {
  auctionId: string;
  quantity: number;
  startingPrice: number;
  minIncrement: number;
  currentPrice: number;
  minNextBid: number;
  isLeader: boolean;
  yourHighestBid: number | null;
  live: boolean;
  isOwner: boolean;
}) {
  const [state, action, pending] = useActionState(placeBidAction, IDLE);
  const [amount, setAmount] = useState(String(minNextBid));
  const [reviewing, setReviewing] = useState(false);
  const router = useRouter();

  // Keep the price board fresh while bidding is open. This is polling, not a
  // socket: the UI says so rather than implying push updates.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [live, router]);

  useEffect(() => {
    setAmount(String(minNextBid));
    setReviewing(false);
  }, [minNextBid]);

  if (isOwner) {
    return (
      <div className="rounded-[5px] border border-ivory-300 bg-ivory p-3.5">
        <p className="text-[12px] leading-relaxed text-charcoal-500">
          This is your own lot. You cannot bid on it — the console shows every bid as it arrives.
        </p>
        <a
          href={`/farmer/auctions/${auctionId}`}
          className="mt-2 inline-block text-[12px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2"
        >
          Open auction console
        </a>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="rounded-[5px] border border-success/25 bg-success-soft p-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <Check className="size-4" aria-hidden /> {state.message}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-charcoal-500">
          You are the leading bidder. If someone outbids you, you will be notified.
        </p>
      </div>
    );
  }

  if (!live) {
    return (
      <div className="rounded-[5px] border border-ivory-300 bg-ivory p-3.5">
        <p className="text-[12px] leading-relaxed text-charcoal-500">
          Bidding has closed for this lot. The farmer decides whether to award the winning bid.
        </p>
      </div>
    );
  }

  const total = Number(amount || 0) * quantity;

  return (
    <div className="space-y-3">
      {isLeader ? (
        <p className="rounded-[4px] bg-success-soft px-2.5 py-1.5 text-[11.5px] font-medium text-success">
          You are currently the highest bidder{yourHighestBid ? ` at ${formatINR(yourHighestBid)}/kg` : ""}.
        </p>
      ) : yourHighestBid ? (
        <p className="rounded-[4px] bg-warning-soft px-2.5 py-1.5 text-[11.5px] font-medium text-warning">
          You have been outbid. Current leader is at {formatINR(currentPrice)}/kg.
        </p>
      ) : null}

      <div className="rounded-[5px] border border-ivory-300 bg-ivory/70 p-3">
        <div className="flex items-baseline justify-between text-[11.5px]">
          <span className="text-charcoal-500">Next minimum bid</span>
          <span className="font-semibold text-charcoal tabular">{formatINR(minNextBid)}/kg</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-[11px] text-charcoal-400">
          <span>
            Floor {formatINR(startingPrice)} · step {formatINR(minIncrement)}
          </span>
          <span>{formatNumber(quantity)} kg lot</span>
        </div>
      </div>

      {state.message && !state.ok ? (
        <p className="rounded-[4px] bg-danger-soft px-2.5 py-1.5 text-[11.5px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      {reviewing ? (
        <form action={action} className="space-y-2.5">
          <input type="hidden" name="auctionId" value={auctionId} />
          <input type="hidden" name="amount" value={amount} />
          <div className="rounded-[5px] border border-gold/50 bg-gold-50 p-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gold-700">
              Confirm your bid
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-charcoal">
              {formatINR(Number(amount))}/kg for the full {formatNumber(quantity)} kg lot —{" "}
              <span className="font-semibold">{formatINR(total)}</span> in total.
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-charcoal-500">
              A bid is a commitment of intent. If you win, an order is created at this price and the
              farmer is notified.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" loading={pending} className="flex-1" icon={<Gavel className="size-4" />}>
              Place bid
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReviewing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <label className="block">
            <span className="text-[11px] font-medium text-charcoal-500">Your bid (₹/kg)</span>
            <div className="mt-1 flex gap-2">
              <Input
                type="number"
                min={minNextBid}
                step={Math.max(0.5, minIncrement)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={cn("h-9", Number(amount) < minNextBid && "border-danger")}
              />
              <Button
                type="button"
                variant="gold"
                onClick={() => setReviewing(true)}
                disabled={Number(amount) < minNextBid}
              >
                Review
              </Button>
            </div>
          </label>
          <div className="flex gap-1.5">
            {[minNextBid, minNextBid + minIncrement, minNextBid + minIncrement * 2].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className="rounded-full border border-ivory-300 bg-white px-2 py-0.5 text-[11px] text-charcoal-500 hover:border-gold/50 hover:text-gold-700"
              >
                {formatINR(value)}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-1 text-[10px] leading-relaxed text-charcoal-400">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
            Bids are validated on the server against the increment rule and the closing time.
          </p>
        </div>
      )}
    </div>
  );
}
