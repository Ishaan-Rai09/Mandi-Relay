import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Gavel } from "lucide-react";

import { Countdown, LiveDot } from "@/components/marketplace/countdown";
import { ButtonLink } from "@/components/ui/button";
import { DemoTag, Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUCTION_STATUS_LABEL, type AuctionStatus } from "@/lib/domain";
import { highestBids, syncExpiredAuctions } from "@/lib/services/auctions";
import { auctionLift } from "@/lib/services/pricing";
import { formatDateTime, formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Auctions" };
export const dynamic = "force-dynamic";

export default async function BuyerAuctionsPage() {
  const user = await requireRole("BUYER");
  await syncExpiredAuctions();

  const [live, finished, myBids] = await Promise.all([
    db.auction.findMany({
      where: { status: "LIVE" },
      include: {
        listing: { include: { farmer: true } },
        _count: { select: { bids: true } },
        bids: { orderBy: { amount: "desc" }, take: 1 },
      },
      orderBy: { endsAt: "asc" },
    }),
    db.auction.findMany({
      where: { status: { in: ["CLOSED", "AWARDED"] } },
      include: { listing: true, bids: { orderBy: { amount: "desc" }, take: 1 } },
      orderBy: { endsAt: "desc" },
      take: 6,
    }),
    db.bid.findMany({
      where: { buyerId: user.id },
      include: { auction: { include: { listing: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const leaders = await highestBids(live.map((auction) => auction.id));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Micro-auctions"
        title="Live auctions"
        description="Timed lots where the price rises with demand. Every bid is validated on the server; the farmer awards the winning bid."
      />

      {live.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Gavel className="size-5" />}
            title="No live auctions right now"
            description="Farmers start these when several buyers want the same lot. New ones appear here while bidding is open."
            action={<ButtonLink href="/buyer/marketplace" size="sm" variant="outline">Browse the marketplace</ButtonLink>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {live.map((auction) => {
            const leader = leaders.get(auction.id);
            const current = leader?.amount ?? auction.startingPrice;
            const minNext = leader ? leader.amount + auction.minIncrement : auction.startingPrice;
            return (
              <Panel key={auction.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-ivory-200 bg-gold-50 px-3.5 py-2">
                  <LiveDot />
                  <span className="text-[10.5px] text-charcoal-500">
                    {auction._count.bids} bid{auction._count.bids === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-[15px] font-bold text-charcoal">
                        {auction.listing.commodity}
                      </h2>
                      <p className="truncate text-[11px] text-charcoal-400">
                        {formatNumber(auction.quantity)} kg · {auction.listing.location}
                      </p>
                      <p className="mt-0.5 text-[11px] text-charcoal-400">
                        {auction.listing.farmer.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-sage">
                        {leader ? "Highest" : "Floor"}
                      </p>
                      <p className="font-display text-[18px] font-bold leading-none text-gold-700 tabular">
                        {formatINR(current)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-charcoal-400">
                        next {formatINR(minNext)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Pill tone="neutral">+{auctionLift(current, auction.startingPrice).toFixed(0)}% lift</Pill>
                    {auction.isDemo ? <DemoTag /> : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-ivory-200 pt-2.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.06em] text-sage">Closes in</p>
                      <Countdown endsAt={auction.endsAt.toISOString()} compact className="text-[13px] text-charcoal" />
                    </div>
                    <Link
                      href={`/buyer/auctions/${auction.id}`}
                      className="inline-flex items-center gap-1 rounded-[4px] bg-forest px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-forest-700"
                    >
                      Bid now <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {myBids.length > 0 ? (
        <Panel>
          <PanelHeader title="Your bidding history" />
          <ul className="divide-y divide-ivory-100">
            {myBids.map((bid) => {
              const isLeader = leaders.get(bid.auctionId)?.amount === bid.amount;
              return (
                <li key={bid.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/buyer/auctions/${bid.auctionId}`}
                      className="truncate text-[12.5px] font-medium text-charcoal hover:text-forest-700"
                    >
                      {bid.auction.listing.commodity}
                      <span className="ml-1.5 text-[11px] font-normal text-charcoal-400">
                        {formatNumber(bid.quantity)} kg
                      </span>
                    </Link>
                    <p className="text-[10.5px] text-charcoal-400">
                      Bid {formatINR(bid.amount)}/kg · {formatDateTime(bid.createdAt)}
                    </p>
                  </div>
                  <Pill tone={isLeader && bid.auction.status === "LIVE" ? "success" : "neutral"}>
                    {bid.auction.status === "AWARDED"
                      ? "Auction awarded"
                      : bid.auction.status === "CLOSED"
                        ? "Closed"
                        : isLeader
                          ? "Leading"
                          : "Outbid"}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      {finished.length > 0 ? (
        <Panel>
          <PanelHeader title="Recently closed" />
          <ul className="divide-y divide-ivory-100">
            {finished.map((auction) => (
              <li key={auction.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-charcoal">
                    {auction.listing.commodity}
                    <span className="ml-1.5 text-[11px] font-normal text-charcoal-400">
                      {formatNumber(auction.quantity)} kg
                    </span>
                  </p>
                  <p className="text-[10.5px] text-charcoal-400">
                    Ended {formatDateTime(auction.endsAt)}
                    {auction.bids[0] ? ` · top bid ${formatINR(auction.bids[0].amount)}/kg` : " · no bids"}
                  </p>
                </div>
                <Pill tone={auction.status === "AWARDED" ? "success" : "neutral"}>
                  {AUCTION_STATUS_LABEL[auction.status as AuctionStatus]}
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
