import type { Metadata } from "next";
import { Handshake, Info } from "lucide-react";

import { OfferCard, type OfferView } from "@/components/farmer/offer-card";
import { Panel } from "@/components/ui/panel";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLATFORM_FEE_RATE } from "@/lib/domain";
import { estimateTransportCost } from "@/lib/services/pricing";
import { distanceKm, formatINR, round2 } from "@/lib/utils";

export const metadata: Metadata = { title: "Offers" };
export const dynamic = "force-dynamic";

export default async function FarmerOffersPage() {
  const user = await requireRole("FARMER");

  const offers = await db.offer.findMany({
    where: {
      listing: { farmerId: user.id },
      status: { in: ["PENDING", "COUNTERED"] },
      actorRole: "BUYER",
    },
    include: {
      buyer: { include: { business: true } },
      listing: true,
      parent: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const closed = await db.offer.findMany({
    where: {
      listing: { farmerId: user.id },
      status: { in: ["ACCEPTED", "REJECTED", "WITHDRAWN"] },
      actorRole: "BUYER",
    },
    include: { buyer: { include: { business: true } }, listing: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const views: OfferView[] = offers.map((offer) => {
    const distance = distanceKm(
      { lat: offer.buyer.lat, lng: offer.buyer.lng },
      { lat: offer.listing.lat, lng: offer.listing.lng },
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
        id: offer.listing.id,
        commodity: offer.listing.commodity,
        askingPrice: offer.listing.askingPrice,
        unit: offer.listing.unit,
        availableQuantity: offer.listing.availableQuantity,
        location: offer.listing.location,
      },
      transportEstimate:
        offer.pickupPreference === "DELIVERY"
          ? estimateTransportCost(distance, offer.quantity)
          : 0,
    };
  });

  const netOf = (offer: OfferView) =>
    round2(offer.quantity * offer.pricePerUnit * (1 - PLATFORM_FEE_RATE) - offer.transportEstimate);
  const bestNet = views.reduce((max, offer) => Math.max(max, netOf(offer)), 0);

  const grouped = new Map<string, OfferView[]>();
  for (const offer of views) {
    const key = offer.listing.commodity;
    grouped.set(key, [...(grouped.get(key) ?? []), offer]);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Negotiation"
        title="Offers"
        description="Every offer is ranked by what reaches you after the platform fee and any freight — not by the headline price."
      />

      <div className="flex items-start gap-2 rounded-[6px] border border-info/20 bg-info-soft px-3.5 py-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p className="text-[11.5px] leading-relaxed text-charcoal-500">
          Accepting an offer creates a confirmed order immediately and reserves the quantity.
          Countering keeps the lot open for other buyers. Nothing is accepted on your behalf.
        </p>
      </div>

      {views.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Handshake className="size-5" />}
            title="No open offers"
            description="Buyers see your lots in the marketplace. When one makes an offer, it lands here with the maths already done."
            action={<ButtonLink href="/farmer/listings" size="sm" variant="outline">Review my produce</ButtonLink>}
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([commodity, group]) => (
            <section key={commodity}>
              <h2 className="mb-2 flex items-baseline gap-2 font-display text-[14px] font-bold text-charcoal">
                {commodity}
                <span className="text-[11px] font-normal text-charcoal-400">
                  {group.length} open offer{group.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="space-y-2.5">
                {group.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={{ ...offer, isBest: bestNet > 0 && netOf(offer) === bestNet }}
                    viewer="FARMER"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <Panel>
          <div className="border-b border-ivory-200 px-4 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              Recently closed
            </p>
          </div>
          <ul className="divide-y divide-ivory-100">
            {closed.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-charcoal">
                    {offer.buyer.business?.businessName ?? offer.buyer.name}
                    <span className="ml-1.5 text-[11px] font-normal text-charcoal-400">
                      {offer.quantity} kg {offer.listing.commodity}
                    </span>
                  </p>
                  <p className="text-[10.5px] text-charcoal-400">
                    {formatINR(offer.pricePerUnit)}/kg · order value {formatINR(offer.pricePerUnit * offer.quantity)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                    offer.status === "ACCEPTED"
                      ? "bg-success-soft text-success"
                      : offer.status === "REJECTED"
                        ? "bg-danger-soft text-danger"
                        : "bg-ivory-200 text-charcoal-500"
                  }`}
                >
                  {offer.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
