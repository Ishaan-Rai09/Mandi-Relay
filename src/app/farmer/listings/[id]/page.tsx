import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Gavel, Handshake } from "lucide-react";

import { AuctionForm } from "@/components/farmer/auction-form";
import { ListingEditor } from "@/components/farmer/listing-editor";
import { OfferCard, type OfferView } from "@/components/farmer/offer-card";
import { PriceReferencePanel } from "@/components/marketplace/price-reference";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { BackLink } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { LISTING_STATUS_LABEL, type ListingStatus } from "@/lib/domain";
import { latestReference, priceHistory } from "@/lib/queries/listings";
import { estimateTransportCost } from "@/lib/services/pricing";
import { distanceKm, formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage lot" };
export const dynamic = "force-dynamic";

export default async function FarmerListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("FARMER");

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      category: true,
      auction: { include: { _count: { select: { bids: true } } } },
      _count: { select: { offers: true, orders: true } },
    },
  });

  if (!listing || listing.farmerId !== user.id) notFound();

  const [categories, offers, reference, history] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.offer.findMany({
      where: {
        listingId: listing.id,
        status: { in: ["PENDING", "COUNTERED"] },
        actorRole: "BUYER",
      },
      include: { buyer: { include: { business: true } }, parent: true },
      orderBy: { createdAt: "desc" },
    }),
    latestReference(listing.commodity),
    priceHistory(listing.commodity, 7),
  ]);

  const offerViews: OfferView[] = offers.map((offer) => {
    const distance = distanceKm(
      { lat: offer.buyer.lat, lng: offer.buyer.lng },
      { lat: listing.lat, lng: listing.lng },
    );
    return {
      id: offer.id,
      quantity: offer.quantity,
      pricePerUnit: offer.pricePerUnit,
      status: offer.status,
      actorRole: offer.actorRole,
      message: offer.message,
      pickupPreference: offer.pickupPreference,
      deliveryLocation: offer.deliveryLocation,
      requestsNegotiation: offer.requestsNegotiation,
      createdAt: offer.createdAt.toISOString(),
      buyer: {
        name: offer.buyer.name,
        businessName: offer.buyer.business?.businessName ?? null,
        verified: offer.buyer.verified,
        district: offer.buyer.district,
      },
      listing: {
        id: listing.id,
        commodity: listing.commodity,
        askingPrice: listing.askingPrice,
        unit: listing.unit,
        availableQuantity: listing.availableQuantity,
        location: listing.location,
      },
      transportEstimate:
        offer.pickupPreference === "DELIVERY"
          ? estimateTransportCost(distance, offer.quantity)
          : 0,
    };
  });

  const auctionable =
    listing.status === "ACTIVE" && !listing.auction && listing._count.orders === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <BackLink href="/farmer/listings">My produce</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="forest">{listing.category.name}</Pill>
            <Pill
              tone={
                listing.status === "ACTIVE"
                  ? "success"
                  : listing.status === "RESERVED"
                    ? "gold"
                    : listing.status === "SOLD"
                      ? "neutral"
                      : "warning"
              }
            >
              {listing.auction?.status === "LIVE"
                ? "In auction"
                : LISTING_STATUS_LABEL[listing.status as ListingStatus]}
            </Pill>
            
          </div>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
            {listing.commodity}
            {listing.variety ? (
              <span className="ml-2 text-[15px] font-medium text-charcoal-400">{listing.variety}</span>
            ) : null}
          </h1>
          <p className="mt-1 text-[12.5px] text-charcoal-500">
            {formatNumber(listing.availableQuantity)} of {formatNumber(listing.quantity)} kg available ·{" "}
            {formatINR(listing.askingPrice)}/kg · {listing.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/farmer/offers" size="sm" variant="outline">
            All offers ({listing._count.offers})
          </ButtonLink>
          <ButtonLink href={`/marketplace-preview/${listing.id}`} size="sm" variant="ghost" icon={<ArrowRight className="size-3.5" />}>
            Buyer view
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <PanelHeader title="Edit listing" description="Changes are visible to buyers immediately." />
            <ListingEditor
              listing={{
                id: listing.id,
                commodity: listing.commodity,
                variety: listing.variety,
                categorySlug: listing.category.slug,
                quantity: listing.quantity,
                availableQuantity: listing.availableQuantity,
                askingPrice: listing.askingPrice,
                availableFrom: listing.availableFrom.toISOString(),
                location: listing.location,
                district: listing.district,
                state: listing.state,
                description: listing.description,
                grade: listing.grade,
                pickupOnly: listing.pickupOnly,
              }}
              categories={categories}
            />
          </Panel>

          <Panel>
            <PanelHeader
              title="Live offers on this lot"
              description={`${offerViews.length} open · ${listing._count.orders} order${listing._count.orders === 1 ? "" : "s"} confirmed`}
            />
            {offerViews.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-5 text-[12.5px] text-charcoal-400">
                <Handshake className="size-4" aria-hidden /> No open offers on this lot right now.
              </p>
            ) : (
              <div className="space-y-2.5 p-3">
                {offerViews.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} viewer="FARMER" />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {auctionsEnabled ? (
          <Panel className="overflow-hidden">
            <PanelHeader
              title="Micro-auction"
              description={
                listing.auction
                  ? "This lot is already in an auction."
                  : "Let buyers bid against each other."
              }
            />
            {listing.auction ? (
              <div className="space-y-2 p-4">
                <p className="text-[12.5px] text-charcoal-500">
                  Status: <span className="font-semibold text-charcoal">{listing.auction.status}</span> ·{" "}
                  {listing.auction._count.bids} bid{listing.auction._count.bids === 1 ? "" : "s"} · starts
                  at {formatINR(listing.auction.startingPrice)}/kg
                </p>
                <ButtonLink href={`/farmer/auctions/${listing.auction.id}`} size="sm" variant="gold" icon={<Gavel className="size-3.5" />}>
                  Open auction console
                </ButtonLink>
              </div>
            ) : auctionable ? (
              <AuctionForm
                listingId={listing.id}
                availableQuantity={listing.availableQuantity}
                askingPrice={listing.askingPrice}
              />
            ) : (
              <p className="px-4 py-5 text-[12px] leading-relaxed text-charcoal-400">
                {listing._count.orders > 0
                  ? "This lot already has confirmed orders. Create a separate lot to auction it."
                  : "Only active lots without an auction can be converted."}
              </p>
            )}
          </Panel>
          ) : null}

          <PriceReferencePanel
            reference={reference}
            askingPerKg={listing.askingPrice}
            history={history}
          />

          <Panel className="p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              Delivery estimates
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              Freight is estimated at ₹7.50 per km per tonne from the pickup point. Buyers requesting
              delivery see the same estimate, and it is deducted from your net proceeds when you
              accept.
            </p>
            <Link
              href="/transporter/requests"
              className="mt-2 inline-block text-[11.5px] font-medium text-forest-700 hover:underline"
            >
              Transporters can quote on loads →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
