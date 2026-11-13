import "server-only";

import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { latestReference, priceHistory } from "@/lib/queries/listings";

/**
 * Loads everything a listing detail page needs in one pass.
 *
 * A listing that is paused, rejected, sold or awaiting moderation is private: it
 * is only returned to the farmer who owns it or to an administrator. Without
 * `viewer`, only publicly visible lots are returned, so a guessed id cannot be
 * used to read a withdrawn lot.
 */
export async function getListingDetail(
  id: string,
  viewer?: { userId: string; role: string } | null,
) {
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      category: true,
      farmer: { include: { farm: true } },
      auction: true,
    },
  });

  if (!listing) return null;

  const isPublic =
    listing.moderationStatus === "APPROVED" &&
    (listing.status === "ACTIVE" || listing.status === "RESERVED");
  const canSeePrivate =
    viewer?.role === "ADMIN" || (viewer != null && listing.farmerId === viewer.userId);
  if (!isPublic && !canSeePrivate) return null;

  const [reference, history] = await Promise.all([
    latestReference(listing.commodity),
    priceHistory(listing.commodity, 7),
  ]);

  const similar = await db.listing.findMany({
    where: {
      id: { not: listing.id },
      status: "ACTIVE",
      categoryId: listing.categoryId,
    },
    select: { id: true, commodity: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return {
    listing: {
      id: listing.id,
      commodity: listing.commodity,
      variety: listing.variety,
      description: listing.description,
      quantity: listing.quantity,
      availableQuantity: listing.availableQuantity,
      unit: listing.unit,
      askingPrice: listing.askingPrice,
      availableFrom: listing.availableFrom,
      location: listing.location,
      district: listing.district,
      state: listing.state,
      lat: listing.lat,
      lng: listing.lng,
      imageUrl: listing.imageUrl,
      grade: listing.grade,
      gradeVerified: listing.gradeVerified,
      pickupOnly: listing.pickupOnly,
      status: listing.status,
      createdAt: listing.createdAt,
      category: { slug: listing.category.slug, name: listing.category.name },
      farmer: {
        id: listing.farmer.id,
        name: listing.farmer.name,
        verified: listing.farmer.verified,
        village: listing.farmer.village,
        district: listing.farmer.district,
        farmName: listing.farmer.farm?.farmName ?? null,
        sizeAcres: listing.farmer.farm?.sizeAcres ?? null,
        createdAt: listing.farmer.createdAt,
      },
      auction:
        auctionsEnabled && listing.auction
          ? {
              id: listing.auction.id,
              status: listing.auction.status,
              endsAt: listing.auction.endsAt,
            }
          : null,
    },
    reference,
    history,
    similar,
  };
}
