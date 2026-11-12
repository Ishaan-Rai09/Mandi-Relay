import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gavel, Info, Trophy } from "lucide-react";

import { AwardBidButton, CloseAuctionButton, RefreshBids } from "@/components/farmer/auction-controls";
import { Countdown, LiveDot } from "@/components/marketplace/countdown";
import { Panel, PanelHeader, Pill, VerifiedBadge } from "@/components/ui/panel";
import { BackLink } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { AUCTION_STATUS_LABEL, PLATFORM_FEE_RATE, type AuctionStatus } from "@/lib/domain";
import { syncExpiredAuctions } from "@/lib/services/auctions";
import { auctionLift } from "@/lib/services/pricing";
import { formatDateTime, formatINR, formatNumber, round2, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Auction console" };
export const dynamic = "force-dynamic";

export default async function FarmerAuctionConsole({ params }: { params: Promise<{ id: string }> }) {
  if (!auctionsEnabled) notFound();
  const { id } = await params;
  const user = await requireRole("FARMER");
  await syncExpiredAuctions();

  const auction = await db.auction.findUnique({
    where: { id },
    include: {
      listing: true,
      bids: {
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        include: { buyer: { include: { business: true } } },
      },
    },
  });

  if (!auction || auction.farmerId !== user.id) notFound();

  const leader = auction.bids[0];
  const current = leader?.amount ?? auction.startingPrice;
  const isLive = auction.status === "LIVE";
  const canAward = (auction.status === "LIVE" || auction.status === "CLOSED") && Boolean(leader);
  const gross = round2(current * auction.quantity);
  const net = round2(gross * (1 - PLATFORM_FEE_RATE));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <BackLink href="/farmer/auctions">Auctions</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? <LiveDot /> : null}
            <Pill tone={auction.status === "AWARDED" ? "success" : "gold"}>
              {AUCTION_STATUS_LABEL[auction.status as AuctionStatus]}
            </Pill>
            
          </div>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
            {auction.listing.commodity}
            <span className="ml-2 text-[15px] font-medium text-charcoal-400">
              {formatNumber(auction.quantity)} kg lot
            </span>
          </h1>
          <p className="mt-1 text-[12.5px] text-charcoal-500">
            {auction.listing.location} · floor {formatINR(auction.startingPrice)}/kg · step{" "}
            {formatINR(auction.minIncrement)} · closes {formatDateTime(auction.endsAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshBids />
          {isLive ? <CloseAuctionButton auctionId={auction.id} /> : null}
        </div>
      </div>

      <Panel className="grid grid-cols-2 divide-ivory-200 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <p className="eyebrow">Current price</p>
          <p className="mt-1.5 font-display text-[24px] font-bold leading-none text-gold-700 tabular">
            {formatINR(current)}
          </p>
          <p className="mt-1 text-[11px] text-charcoal-400">
            {auctionLift(current, auction.startingPrice).toFixed(0)}% above floor
          </p>
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <p className="eyebrow">Bids</p>
          <p className="mt-1.5 font-display text-[24px] font-bold leading-none text-charcoal tabular">
            {auction.bids.length}
          </p>
          <p className="mt-1 text-[11px] text-charcoal-400">
            {new Set(auction.bids.map((bid) => bid.buyerId)).size} bidder
            {new Set(auction.bids.map((bid) => bid.buyerId)).size === 1 ? "" : "s"}
          </p>
        </div>
        <div className="border-t border-ivory-200 p-4 sm:border-t-0">
          <p className="eyebrow">Lot value</p>
          <p className="mt-1.5 font-display text-[24px] font-bold leading-none text-charcoal tabular">
            {formatINR(gross)}
          </p>
          <p className="mt-1 text-[11px] text-charcoal-400">net ≈ {formatINR(net)}</p>
        </div>
        <div className="border-l border-t border-ivory-200 p-4 sm:border-l-0 sm:border-t-0">
          <p className="eyebrow">{isLive ? "Closes in" : "Closed"}</p>
          <div className="mt-1.5">
            {isLive ? (
              <Countdown endsAt={auction.endsAt.toISOString()} compact className="text-[15px] text-charcoal" />
            ) : (
              <p className="text-[12.5px] font-medium text-charcoal">{formatDateTime(auction.endsAt)}</p>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader
            title="Bid history"
            description="Highest first. Only the highest bid can be awarded while bids are live."
          />
          {auction.bids.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Gavel className="mx-auto size-5 text-sage" aria-hidden />
              <p className="mt-2 text-[12.5px] text-charcoal-500">No bids yet.</p>
              <p className="mt-1 text-[11.5px] text-charcoal-400">
                Buyers within reach of {auction.listing.district} see this lot in their auction list.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-ivory-200 bg-ivory/60">
                    {["Bidder", "Bid", "Lot value", "Placed", ""].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-100">
                  {auction.bids.map((bid, index) => (
                    <tr key={bid.id} className={index === 0 ? "bg-gold-50/50" : ""}>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {index === 0 ? <Trophy className="size-3.5 text-gold-700" aria-hidden /> : null}
                          <span className="text-[12.5px] font-medium text-charcoal">
                            {bid.buyer.business?.businessName ?? bid.buyer.name}
                          </span>
                          
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <VerifiedBadge verified={bid.buyer.verified} />
                          <span className="text-[10px] text-charcoal-400">{bid.buyer.district ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-charcoal tabular">
                        {formatINR(bid.amount)}/kg
                      </td>
                      <td className="px-3.5 py-2.5 text-charcoal-500 tabular">
                        {formatINR(bid.amount * bid.quantity)}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-charcoal-400">{timeAgo(bid.createdAt)}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        {canAward && index === 0 && auction.status !== "AWARDED" ? (
                          <AwardBidButton auctionId={auction.id} bidId={bid.id} amount={bid.amount} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              Auction rules in force
            </p>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              <li>· Bids below floor + increment are rejected by the server.</li>
              <li>· No bid is accepted after the closing time.</li>
              <li>· You cannot bid on your own lot.</li>
              <li>· Awarding a bid creates the order; closing alone does not.</li>
            </ul>
            {auction.buyerCriteria ? (
              <p className="mt-2 rounded-[4px] bg-ivory px-2.5 py-1.5 text-[11px] leading-relaxed text-charcoal-500">
                Stated buyer criteria: {auction.buyerCriteria}
              </p>
            ) : null}
          </Panel>

          {auction.pickupNote ? (
            <Panel className="p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
                Pickup note
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
                {auction.pickupNote}
              </p>
            </Panel>
          ) : null}

          <Panel className="p-3.5">
            <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-charcoal-400">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              Bidders in this build include clearly labelled demonstration accounts. Their bids are
              not evidence of real market demand.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
