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

export default async function FarmerAuctionsPage() {
  const user = await requireRole("FARMER");
  await syncExpiredAuctions();

  const auctions = await db.auction.findMany({
    where: { farmerId: user.id },
    include: {
      listing: true,
      bids: { orderBy: { amount: "desc" }, take: 1, include: { buyer: true } },
      _count: { select: { bids: true } },
    },
    orderBy: [{ status: "asc" }, { endsAt: "asc" }],
  });

  const leaders = await highestBids(auctions.map((auction) => auction.id));
  const live = auctions.filter((auction) => auction.status === "LIVE");
  const other = auctions.filter((auction) => auction.status !== "LIVE");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Micro-auctions"
        title="Auctions"
        description="Timed lots where nearby buyers bid up the price. Bidding rules are enforced on the server; you decide whether to award the winning bid."
        action={
          <ButtonLink href="/farmer/listings" size="sm" variant="outline">
            Start one from a lot
          </ButtonLink>
        }
      />

      {live.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Gavel className="size-5" />}
            title="No live auctions"
            description="Open any active lot in My produce and choose Start auction. Set a floor price, an increment and a closing time."
            action={<ButtonLink href="/farmer/listings" size="sm" variant="outline">Open My produce</ButtonLink>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {live.map((auction) => {
            const leader = leaders.get(auction.id);
            const current = leader?.amount ?? auction.startingPrice;
            return (
              <Panel key={auction.id} className="overflow-hidden border-gold/40">
                <div className="flex items-center justify-between gap-2 border-b border-ivory-200 bg-gold-50 px-3.5 py-2">
                  <LiveDot />
                  <span className="text-[10.5px] text-charcoal-500">
                    {auction._count.bids} bid{auction._count.bids === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-[15px] font-bold text-charcoal">
                        {auction.listing.commodity}
                      </h2>
                      <p className="truncate text-[11px] text-charcoal-400">
                        {formatNumber(auction.quantity)} kg · {auction.listing.location}
                        {auction.isDemo ? " · demo" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-sage">
                        {leader ? "Highest" : "Floor"}
                      </p>
                      <p className="font-display text-[18px] font-bold text-gold-700 tabular">
                        {formatINR(current)}
                      </p>
                      <p className="text-[10px] text-charcoal-400">
                        +{auctionLift(current, auction.startingPrice).toFixed(0)}% lift
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-ivory-200 pt-2.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.06em] text-sage">Closes in</p>
                      <Countdown endsAt={auction.endsAt.toISOString()} compact className="text-[13px] text-charcoal" />
                    </div>
                    <ButtonLink href={`/farmer/auctions/${auction.id}`} size="sm" variant="gold" icon={<ArrowRight className="size-3.5" />}>
                      Console
                    </ButtonLink>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {other.length > 0 ? (
        <Panel>
          <PanelHeader title="Finished auctions" description="Closed lots you have not awarded yet, and awarded lots." />
          <ul className="divide-y divide-ivory-100">
            {other.map((auction) => {
              const leader = leaders.get(auction.id);
              return (
                <li key={auction.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-charcoal">
                      {auction.listing.commodity}
                      <span className="text-[11px] font-normal text-charcoal-400">
                        {formatNumber(auction.quantity)} kg
                      </span>
                      {auction.isDemo ? <DemoTag /> : null}
                    </p>
                    <p className="text-[10.5px] text-charcoal-400">
                      Ended {formatDateTime(auction.endsAt)} · {auction._count.bids} bid
                      {auction._count.bids === 1 ? "" : "s"}
                      {leader ? ` · top ${formatINR(leader.amount)}/kg` : " · no bids"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={auction.status === "AWARDED" ? "success" : "neutral"}>
                      {AUCTION_STATUS_LABEL[auction.status as AuctionStatus]}
                    </Pill>
                    <Link
                      href={`/farmer/auctions/${auction.id}`}
                      className="text-[11.5px] font-medium text-forest-700 hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
