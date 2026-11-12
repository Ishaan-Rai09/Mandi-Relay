import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gavel, Info, Trophy } from "lucide-react";

import { BidPanel } from "@/components/buyer/bid-panel";
import { Countdown, LiveDot } from "@/components/marketplace/countdown";
import { ProduceTile } from "@/components/ui/produce-art";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { BackLink } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { AUCTION_STATUS_LABEL, type AuctionStatus } from "@/lib/domain";
import { syncExpiredAuctions } from "@/lib/services/auctions";
import { auctionLift } from "@/lib/services/pricing";
import { formatDateTime, formatINR, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Auction" };
export const dynamic = "force-dynamic";

/** Other bidders are shown by first name and district only. */
function bidderLabel(name: string, district: string | null, isYou: boolean) {
  if (isYou) return "You";
  return `${name.split(" ")[0]}${district ? ` · ${district}` : ""}`;
}

export default async function BuyerAuctionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!auctionsEnabled) notFound();
  const { id } = await params;
  const user = await requireRole("BUYER");
  await syncExpiredAuctions();

  const auction = await db.auction.findUnique({
    where: { id },
    include: {
      listing: { include: { category: true, farmer: true } },
      bids: {
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        include: { buyer: true },
      },
    },
  });

  if (!auction) notFound();

  const leader = auction.bids[0];
  const current = leader?.amount ?? auction.startingPrice;
  const isLeader = leader?.buyerId === user.id;
  const myBids = auction.bids.filter((bid) => bid.buyerId === user.id);
  const yourHighest = myBids[0]?.amount ?? null;
  const live = auction.status === "LIVE" && auction.endsAt.getTime() > Date.now() - 1000;
  const minNext = leader ? leader.amount + auction.minIncrement : auction.startingPrice;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <BackLink href="/buyer/auctions">Auctions</BackLink>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <ProduceTile
              category={auction.listing.category.slug}
              imageUrl={auction.listing.imageUrl}
              alt={auction.listing.commodity}
              className="aspect-[16/7] w-full"
            />
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {live ? <LiveDot /> : null}
                <Pill tone={auction.status === "AWARDED" ? "success" : "gold"}>
                  {AUCTION_STATUS_LABEL[auction.status as AuctionStatus]}
                </Pill>
                
                <Pill tone="neutral">
                  +{auctionLift(current, auction.startingPrice).toFixed(0)}% above floor
                </Pill>
              </div>
              <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
                {auction.listing.commodity}
                <span className="ml-2 text-[14px] font-medium text-charcoal-400">
                  {formatNumber(auction.quantity)} kg lot
                </span>
              </h1>
              <p className="mt-1 text-[12.5px] text-charcoal-500">
                {auction.listing.location} · {auction.listing.farmer.name} · floor{" "}
                {formatINR(auction.startingPrice)}/kg · step {formatINR(auction.minIncrement)}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ivory-200 pt-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.06em] text-sage">Current price</p>
                  <p className="font-display text-[20px] font-bold text-gold-700 tabular">
                    {formatINR(current)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.06em] text-sage">Lot value</p>
                  <p className="font-display text-[20px] font-bold text-charcoal tabular">
                    {formatINR(current * auction.quantity)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.06em] text-sage">
                    {live ? "Closes in" : "Closed"}
                  </p>
                  {live ? (
                    <Countdown endsAt={auction.endsAt.toISOString()} compact className="text-[15px] text-charcoal" />
                  ) : (
                    <p className="text-[12px] font-medium text-charcoal">{formatDateTime(auction.endsAt)}</p>
                  )}
                </div>
              </div>

              {auction.listing.description ? (
                <p className="mt-3 border-t border-ivory-200 pt-3 text-[12.5px] leading-relaxed text-charcoal-500">
                  {auction.listing.description}
                </p>
              ) : null}

              {auction.pickupNote ? (
                <p className="mt-2 rounded-[4px] bg-ivory px-2.5 py-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
                  Pickup: {auction.pickupNote}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Bid history"
              description={`${auction.bids.length} bid${auction.bids.length === 1 ? "" : "s"} · other bidders are shown by first name only`}
            />
            {auction.bids.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Gavel className="mx-auto size-5 text-sage" aria-hidden />
                <p className="mt-2 text-[12.5px] text-charcoal-500">No bids yet — the floor is open.</p>
              </div>
            ) : (
              <ul className="divide-y divide-ivory-100">
                {auction.bids.map((bid, index) => (
                  <li key={bid.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {index === 0 ? <Trophy className="size-3.5 shrink-0 text-gold-700" aria-hidden /> : null}
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-charcoal">
                          {bidderLabel(bid.buyer.name, bid.buyer.district, bid.buyerId === user.id)}
                          
                        </p>
                        <p className="text-[10.5px] text-charcoal-400">{timeAgo(bid.createdAt)}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-[12.5px] font-semibold text-charcoal tabular">
                      {formatINR(bid.amount)}/kg
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel className="p-4">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              {live ? "Place a bid" : "Bidding closed"}
            </p>
            <BidPanel
              auctionId={auction.id}
              quantity={auction.quantity}
              startingPrice={auction.startingPrice}
              minIncrement={auction.minIncrement}
              currentPrice={current}
              minNextBid={minNext}
              isLeader={isLeader}
              yourHighestBid={yourHighest}
              live={live}
              isOwner={auction.farmerId === user.id}
            />
          </Panel>

          {auction.buyerCriteria ? (
            <Panel className="p-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
                Stated buyer criteria
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
                {auction.buyerCriteria}
              </p>
            </Panel>
          ) : null}

          <Panel className="p-3.5">
            <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-charcoal-400">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              The price board refreshes every 20 seconds — this build uses polling, not a live socket.
              Awarding is always the farmer&apos;s decision, and no payment is processed here.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
