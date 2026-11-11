"use client";

import { Check, Gavel, Loader2, TimerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { awardBidAction, closeAuctionAction } from "@/lib/actions/auctions";
import { formatINR } from "@/lib/utils";

export function AwardBidButton({
  auctionId,
  bidId,
  amount,
  layout = "row",
}: {
  auctionId: string;
  bidId: string;
  amount: number;
  layout?: "row" | "hero";
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const award = () => {
    startTransition(async () => {
      const result = await awardBidAction(auctionId, bidId);
      if (result.ok) toast.success("Lot awarded", result.message);
      else toast.error("Could not award", result.message);
      setConfirming(false);
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-charcoal-500">Award at {formatINR(amount)}/kg?</span>
        <Button size="sm" variant="gold" onClick={award} loading={pending} icon={<Check className="size-3.5" />}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant={layout === "hero" ? "gold" : "outline"}
      onClick={() => setConfirming(true)}
      icon={<Gavel className="size-3.5" />}
    >
      Award lot
    </Button>
  );
}

export function CloseAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const close = () => {
    startTransition(async () => {
      const result = await closeAuctionAction(auctionId);
      if (result.ok) toast.success("Bidding closed", result.message);
      else toast.error("Could not close", result.message);
      setConfirming(false);
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="danger" onClick={close} loading={pending}>
          Close bidding now
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)} icon={<TimerOff className="size-3.5" />}>
      Close early
    </Button>
  );
}

export function RefreshBids() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-forest-700 hover:underline"
    >
      {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
      Refresh
    </button>
  );
}
