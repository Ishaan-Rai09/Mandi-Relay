import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Gavel, Handshake, Store, Truck } from "lucide-react";

import { Countdown } from "@/components/marketplace/countdown";
import { ListingCard } from "@/components/marketplace/listing-card";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { BUSINESS_TYPE_LABEL, type BusinessType } from "@/lib/domain";
import { searchListings } from "@/lib/queries/listings";
import { auctionsEnabled } from "@/lib/features";
import { highestBids, syncExpiredAuctions } from "@/lib/services/auctions";
import { formatDate, formatINR, formatNumber, parseJsonArray } from "@/lib/utils";

export const metadata: Metadata = { title: "Buyer dashboard" };
export const dynamic = "force-dynamic";

export default async function BuyerDashboard() {
  const user = await requireRole("BUYER");
  if (auctionsEnabled) await syncExpiredAuctions();

  const [profile, businessProfile, offers, orders, auctions] = await Promise.all([
    db.user.findUnique({ where: { id: user.id } }),
    db.businessProfile.findUnique({ where: { userId: user.id } }),
    db.offer.findMany({
      where: { buyerId: user.id },
      include: { listing: { include: { farmer: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.order.findMany({
      where: { buyerId: user.id },
      include: { listing: true, farmer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    auctionsEnabled
      ? db.auction.findMany({
          where: { status: "LIVE" },
          include: { listing: true, _count: { select: { bids: true } } },
          orderBy: { endsAt: "asc" },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  const preferred = parseJsonArray(businessProfile?.preferredCommodities);

  const market = await searchListings({
    origin: { lat: profile?.lat ?? null, lng: profile?.lng ?? null },
    limit: 6,
    sort: preferred.length > 0 && preferred[0] ? "distance" : "newest",
  });

  const leaders = await highestBids(auctions.map((auction) => auction.id));

  const openOffers = offers.filter((offer) => offer.status === "PENDING" || offer.status === "COUNTERED");
  const awaitingMe = openOffers.filter((offer) => offer.actorRole === "FARMER");
  const spend = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.grossValue, 0);

  const matched = market.items.filter((item) =>
    preferred.some(
      (commodity) =>
        item.commodity.toLowerCase().includes(commodity.toLowerCase()) ||
        commodity.toLowerCase().includes(item.commodity.toLowerCase()),
    ),
  );
  const suggestions = (matched.length > 0 ? matched : market.items).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <PageHeader
        eyebrow={businessProfile ? BUSINESS_TYPE_LABEL[businessProfile.businessType as BusinessType] : "Buyer workspace"}
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description={
          businessProfile
            ? `${businessProfile.businessName} · ${[user.village, user.district].filter(Boolean).join(", ")}`
            : "Add your business details so farmers know who they are dealing with."
        }
        action={
          <ButtonLink href="/buyer/marketplace" icon={<Store className="size-4" />}>
            Browse marketplace
          </ButtonLink>
        }
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <Stat label="Open offers" value={openOffers.length} sub={awaitingMe.length > 0 ? `${awaitingMe.length} need your reply` : "all sent"} tone={awaitingMe.length > 0 ? "gold" : "default"} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Orders" value={orders.length} sub={`${formatINR(spend)} committed`} />
        </div>
        {auctionsEnabled ? (
          <div className="border-t border-ivory-200 p-4 sm:border-t-0">
            <Stat label="Live auctions" value={auctions.length} sub="across the region" />
          </div>
        ) : null}
        <div className="border-l border-t border-ivory-200 p-4 sm:border-l-0 sm:border-t-0">
          <Stat label="Lots on market" value={market.total} sub="active listings" />
        </div>
      </Panel>

      {awaitingMe.length > 0 ? (
        <Panel className="border-gold/40 bg-gold-50 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[12.5px] text-charcoal">
              <Handshake className="size-4 text-gold-700" aria-hidden />
              {awaitingMe.length} farmer counteroffer{awaitingMe.length === 1 ? "" : "s"} waiting for your answer.
            </p>
            <ButtonLink href="/buyer/bids" size="sm" variant="gold">
              Review now
            </ButtonLink>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-[16px] font-bold text-charcoal">
                  {matched.length > 0 ? "Matching what you buy" : "Fresh on the market"}
                </h2>
                <p className="text-[11.5px] text-charcoal-400">
                  {matched.length > 0 && preferred.length > 0
                    ? `Based on: ${preferred.slice(0, 3).join(", ")}`
                    : "Latest active lots across the region"}
                </p>
              </div>
              <Link href="/buyer/marketplace" className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline">
                See all <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>

            {suggestions.length === 0 ? (
              <Panel>
                <EmptyState
                  compact
                  icon={<Store className="size-4" />}
                  title="No active lots right now"
                  description="Farmers publish throughout the day — check back shortly."
                />
              </Panel>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {suggestions.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    href={`/buyer/product/${listing.id}`}
                  />
                ))}
              </div>
            )}
          </div>

          <Panel>
            <PanelHeader
              title="My offers"
              description="Offers you sent and farmer counters awaiting your reply."
              action={
                <Link href="/buyer/bids" className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline">
                  All offers <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {openOffers.length === 0 ? (
              <EmptyState
                compact
                icon={<Handshake className="size-4" />}
                title="No open offers"
                description="Open a lot and send an offer — the farmer sees the price, quantity and pickup terms you propose."
                action={<ButtonLink href="/buyer/marketplace" size="sm" variant="outline">Find produce</ButtonLink>}
              />
            ) : (
              <ul className="divide-y divide-ivory-100">
                {openOffers.slice(0, 5).map((offer) => (
                  <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-charcoal">
                        {offer.listing.commodity}
                        <span className="ml-1.5 text-[11px] font-normal text-charcoal-400">
                          {formatNumber(offer.quantity)} kg · {offer.listing.farmer.name}
                        </span>
                      </p>
                      <p className="text-[10.5px] text-charcoal-400">
                        {formatINR(offer.pricePerUnit)}/kg · {formatINR(offer.pricePerUnit * offer.quantity)} total
                      </p>
                    </div>
                    <Pill tone={offer.actorRole === "FARMER" ? "gold" : "info"}>
                      {offer.actorRole === "FARMER" ? "Counter received" : "Awaiting farmer"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Recent orders"
              action={
                <Link href="/buyer/orders" className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline">
                  All orders <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {orders.length === 0 ? (
              <EmptyState compact icon={<Truck className="size-4" />} title="No orders yet" description="Confirmed offers appear here with delivery status." />
            ) : (
              <ul className="divide-y divide-ivory-100">
                {orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-charcoal">
                        {order.listing.commodity}
                        <span className="ml-1.5 text-[11px] font-normal text-charcoal-400">
                          {formatNumber(order.quantity)} kg · {order.farmer.name}
                        </span>
                      </p>
                      <p className="text-[10.5px] text-charcoal-400">
                        {order.orderNo} · {formatDate(order.createdAt)} ·{" "}
                        {order.status.replace("_", " ").toLowerCase()}
                      </p>
                    </div>
                    <p className="text-[12.5px] font-semibold text-charcoal tabular">
                      {formatINR(order.grossValue)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          {auctionsEnabled ? (
          <Panel>
            <PanelHeader title="Auctions closing soon" />
            {auctions.length === 0 ? (
              <EmptyState compact icon={<Gavel className="size-4" />} title="No live auctions" description="Timed lots appear here while bidding is open." />
            ) : (
              <ul className="divide-y divide-ivory-100">
                {auctions.map((auction) => {
                  const leader = leaders.get(auction.id);
                  return (
                    <li key={auction.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/buyer/auctions/${auction.id}`} className="truncate text-[12.5px] font-medium text-charcoal hover:text-forest-700">
                            {auction.listing.commodity}
                          </Link>
                          <p className="text-[10.5px] text-charcoal-400">
                            {formatNumber(auction.quantity)} kg · {auction._count.bids} bid
                            {auction._count.bids === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-semibold text-gold-700 tabular">
                            {formatINR(leader?.amount ?? auction.startingPrice)}/kg
                          </p>
                          <Countdown endsAt={auction.endsAt.toISOString()} compact className="text-[10.5px] text-charcoal-400" />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          ) : null}

          <Panel className="p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              Your buying profile
            </p>
            {preferred.length > 0 ? (
              <>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
                  You buy: {preferred.join(", ")}
                </p>
                {businessProfile?.typicalQuantityKg ? (
                  <p className="mt-1 text-[11.5px] text-charcoal-400">
                    Typical order ≈ {formatNumber(businessProfile.typicalQuantityKg)} kg
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
                Tell us what you usually buy and matching lots will be surfaced here.
              </p>
            )}
            <ButtonLink href="/buyer/profile" size="sm" variant="outline" className="mt-2.5">
              Edit preferences
            </ButtonLink>
          </Panel>
        </div>
      </div>
    </div>
  );
}
