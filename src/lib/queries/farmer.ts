import "server-only";

import { db } from "@/lib/db";
import type { OfferView } from "@/components/farmer/offer-card";
import { PLATFORM_FEE_RATE } from "@/lib/domain";
import { estimateTransportCost } from "@/lib/services/pricing";
import { distanceKm, round2 } from "@/lib/utils";

export async function loadFarmerDashboard(userId: string) {
  const [farm, listings, offers, orders] = await Promise.all([
    db.farm.findUnique({ where: { userId } }),
    db.listing.findMany({
      where: { farmerId: userId },
      include: { category: true, auction: true, _count: { select: { offers: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.offer.findMany({
      where: {
        listing: { farmerId: userId },
        status: { in: ["PENDING", "COUNTERED"] },
        actorRole: "BUYER",
      },
      include: {
        buyer: { include: { business: true } },
        listing: true,
        parent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.order.findMany({
      where: { farmerId: userId },
      include: { buyer: true, listing: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const commodities = Array.from(
    new Set(listings.map((listing) => listing.commodity)),
  ).slice(0, 4);

  const [references, matchedBuyers] = await Promise.all([
    db.priceReference.findMany({
      where: { commodity: { in: commodities } },
      orderBy: { reportDate: "desc" },
    }),
    listings[0]
      ? db.user.findMany({
          where: { role: "BUYER", district: listings[0].district },
          include: { business: true },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  const latestRefs = commodities
    .map((commodity) => references.find((row) => row.commodity === commodity))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const offerViews: OfferView[] = offers.map((offer) => {
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
      isDemo: offer.isDemo,
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

  // Net proceeds decide which offer is genuinely best — a bigger tonnage at a
  // lower rate can beat a small lot at the headline price.
  const netOf = (offer: OfferView) =>
    round2(offer.quantity * offer.pricePerUnit * (1 - PLATFORM_FEE_RATE) - offer.transportEstimate);
  const bestNet = offerViews.reduce((max, offer) => Math.max(max, netOf(offer)), 0);
  const withBest = offerViews.map((offer) => ({
    ...offer,
    isBest: bestNet > 0 && netOf(offer) === bestNet,
  }));

  const activeListings = listings.filter((listing) => listing.status === "ACTIVE");
  const reservedListings = listings.filter((listing) => listing.status === "RESERVED");
  const confirmedOrders = orders.filter((order) => order.status !== "CANCELLED");
  const grossConfirmed = confirmedOrders.reduce((sum, order) => sum + order.grossValue, 0);
  const netConfirmed = confirmedOrders.reduce((sum, order) => sum + order.netToFarmer, 0);
  const pipelineValue = offerViews.reduce(
    (sum, offer) => sum + offer.quantity * offer.pricePerUnit * (1 - PLATFORM_FEE_RATE),
    0,
  );

  return {
    farm,
    listings,
    activeListings,
    reservedListings,
    offers: withBest,
    orders,
    latestRefs,
    matchedBuyers,
    stats: {
      activeCount: activeListings.length + reservedListings.length,
      availableKg: activeListings.reduce((sum, listing) => sum + listing.availableQuantity, 0),
      pendingOffers: withBest.length,
      pipelineValue: round2(pipelineValue),
      grossConfirmed: round2(grossConfirmed),
      netConfirmed: round2(netConfirmed),
      orderCount: confirmedOrders.length,
    },
  };
}
