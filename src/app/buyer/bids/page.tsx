import type { Metadata } from "next";
import { Handshake } from "lucide-react";

import { OfferCard, type OfferView } from "@/components/farmer/offer-card";
import { Panel } from "@/components/ui/panel";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "My offers" };
export const dynamic = "force-dynamic";

export default async function BuyerBidsPage() {
  const user = await requireRole("BUYER");

  const offers = await db.offer.findMany({
    where: {
      buyerId: user.id,
      status: { in: ["PENDING", "COUNTERED"] },
    },
    include: { listing: { include: { farmer: true } }, buyer: { include: { business: true } }, parent: true },
    orderBy: { createdAt: "desc" },
  });

  const closed = await db.offer.findMany({
    where: { buyerId: user.id, status: { in: ["ACCEPTED", "REJECTED", "WITHDRAWN"] } },
    include: { listing: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const views: OfferView[] = offers.map((offer) => ({
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
    transportEstimate: 0,
    thread: offer.parent
      ? [
          {
            id: offer.parent.id,
            pricePerUnit: offer.parent.pricePerUnit,
            actorRole: offer.parent.actorRole,
            createdAt: offer.parent.createdAt.toISOString(),
            status: offer.parent.status,
          },
        ]
      : [],
  }));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Negotiation"
        title="My offers"
        description="Every offer you have sent, and any counteroffer the farmer has made. Accepting a counter creates a confirmed order."
        action={
          <ButtonLink href="/buyer/marketplace" size="sm" variant="outline">
            Find more produce
          </ButtonLink>
        }
      />

      {views.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Handshake className="size-5" />}
            title="No open offers"
            description="Open any lot in the marketplace and send your quantity, price and pickup terms."
            action={<ButtonLink href="/buyer/marketplace" size="sm">Browse the marketplace</ButtonLink>}
          />
        </Panel>
      ) : (
        <div className="space-y-2.5">
          {views.map((offer) => (
            <OfferCard key={offer.id} offer={offer} viewer="BUYER" />
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <Panel>
          <div className="border-b border-ivory-200 px-4 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              Closed offers
            </p>
          </div>
          <ul className="divide-y divide-ivory-100">
            {closed.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-charcoal">
                    {offer.listing.commodity}
                    <span className="ml-1.5 text-[11px] font-normal text-charcoal-400">
                      {offer.quantity} kg at {formatINR(offer.pricePerUnit)}/kg
                    </span>
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
