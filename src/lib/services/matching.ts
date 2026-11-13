import "server-only";

import { db } from "@/lib/db";
import { distanceKm, maskPhone, parseJsonArray } from "@/lib/utils";

export interface BuyerMatch {
  userId: string;
  name: string;
  businessName: string | null;
  businessType: string;
  district: string | null;
  state: string | null;
  distance: number | null;
  matchScore: number;
  matchedOn: string[];
  verified: boolean;
  phoneMasked: string;
}

/**
 * Ranks buyers whose stated preferences fit the listing. Only marketplace-safe
 * profile fields are returned; direct phone numbers are never exposed.
 */
export async function findRelevantBuyers(
  listing: {
    commodity: string;
    categoryId?: string | null;
    district: string;
    state: string;
    lat: number | null;
    lng: number | null;
  },
  limit = 6,
): Promise<BuyerMatch[]> {
  const buyers = await db.user.findMany({
    where: { role: "BUYER" },
    include: { business: true },
    take: 60,
  });

  const commodity = listing.commodity.toLowerCase();

  const scored = buyers.map((buyer) => {
    const business = buyer.business;
    const preferred = parseJsonArray(business?.preferredCommodities).map((c) => c.toLowerCase());
    const areas = parseJsonArray(business?.deliveryLocations).map((a) => a.toLowerCase());
    const matchedOn: string[] = [];
    let score = 0;

    if (preferred.some((p) => p.includes(commodity) || commodity.includes(p))) {
      score += 50;
      matchedOn.push("Buys this commodity");
    }
    if (buyer.district && listing.district && buyer.district === listing.district) {
      score += 20;
      matchedOn.push("Same district");
    }
    if (areas.some((a) => a.includes(listing.district.toLowerCase()))) {
      score += 15;
      matchedOn.push("Delivers in this area");
    }
    const dist = distanceKm(
      { lat: buyer.lat, lng: buyer.lng },
      { lat: listing.lat, lng: listing.lng },
    );
    if (dist != null && dist < 60) {
      score += Math.max(0, 20 - dist / 3);
      matchedOn.push(`${dist} km away`);
    }
    if (buyer.verified) score += 5;

    return {
      userId: buyer.id,
      name: buyer.name,
      businessName: business?.businessName ?? null,
      businessType: business?.businessType ?? "OTHER",
      district: buyer.district,
      state: buyer.state,
      distance: dist,
      matchScore: Math.round(score),
      matchedOn,
      verified: buyer.verified,
      phoneMasked: maskPhone(buyer.phone),
    };
  });

  return scored
    .filter((b) => b.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/** Ranks listings for a buyer requirement (used by the buyer dashboard). */
export async function findRelevantListings(
  buyerId: string,
  limit = 5,
): Promise<{ listingId: string; reason: string }[]> {
  const buyer = await db.user.findUnique({
    where: { id: buyerId },
    include: { business: true },
  });
  if (!buyer?.business) return [];

  const preferred = parseJsonArray(buyer.business.preferredCommodities);
  if (preferred.length === 0) return [];

  const listings = await db.listing.findMany({
    where: {
      status: "ACTIVE",
      farmerId: { not: buyerId },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return listings
    .map((listing) => {
      const reason = preferred.find(
        (p) =>
          listing.commodity.toLowerCase().includes(p.toLowerCase()) ||
          p.toLowerCase().includes(listing.commodity.toLowerCase()),
      );
      return reason ? { listingId: listing.id, reason: `You buy ${reason}` } : null;
    })
    .filter((v): v is { listingId: string; reason: string } => v !== null)
    .slice(0, limit);
}
