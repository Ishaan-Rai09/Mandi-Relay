import "server-only";

import { db } from "@/lib/db";
import { placeByName } from "@/lib/ai/extract";
import { distanceKm } from "@/lib/utils";

export interface MarketplaceFilters {
  q?: string | null;
  category?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minQty?: number | null;
  distance?: number | null;
  place?: string | null;
  sort?: string | null;
  availableBy?: string | null;
  origin?: { lat: number | null; lng: number | null } | null;
  limit?: number;
  includeDemo?: boolean;
}

export interface ListingCardData {
  id: string;
  commodity: string;
  variety: string | null;
  categorySlug: string;
  categoryName: string;
  quantity: number;
  availableQuantity: number;
  unit: string;
  askingPrice: number;
  availableFrom: Date;
  location: string;
  district: string;
  state: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  grade: string | null;
  gradeVerified: boolean;
  pickupOnly: boolean;
  status: string;
  isDemo: boolean;
  createdAt: Date;
  farmer: {
    id: string;
    name: string;
    verified: boolean;
    village: string | null;
    farmName: string | null;
  };
  distance: number | null;
  auctionId: string | null;
}

const SORTS: Record<string, (a: ListingCardData, b: ListingCardData) => number> = {
  price_asc: (a, b) => a.askingPrice - b.askingPrice,
  price_desc: (a, b) => b.askingPrice - a.askingPrice,
  newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  quantity: (a, b) => b.availableQuantity - a.availableQuantity,
};

/**
 * Single search path for every marketplace surface, so the public preview, the
 * buyer marketplace and natural-language search always agree.
 */
export async function searchListings(filters: MarketplaceFilters): Promise<{
  items: ListingCardData[];
  total: number;
  originLabel: string | null;
  originCoords: { lat: number | null; lng: number | null } | null;
}> {
  const place = filters.place ? placeByName(filters.place) : null;
  const origin = place
    ? { lat: place.lat, lng: place.lng }
    : filters.origin ?? null;

  const where: Record<string, unknown> = {
    status: { in: ["ACTIVE", "RESERVED"] },
    moderationStatus: "APPROVED",
  };

  if (filters.category) where.category = { slug: filters.category };
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.askingPrice = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.minQty != null) where.availableQuantity = { gte: filters.minQty };
  if (filters.availableBy) {
    where.availableFrom = { lte: new Date(filters.availableBy) };
  }
  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { commodity: { contains: q } },
      { variety: { contains: q } },
      { location: { contains: q } },
      { district: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const rows = await db.listing.findMany({
    where,
    include: {
      category: true,
      farmer: { include: { farm: true } },
      auction: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let items: ListingCardData[] = rows.map((row) => ({
    id: row.id,
    commodity: row.commodity,
    variety: row.variety,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    quantity: row.quantity,
    availableQuantity: row.availableQuantity,
    unit: row.unit,
    askingPrice: row.askingPrice,
    availableFrom: row.availableFrom,
    location: row.location,
    district: row.district,
    state: row.state,
    lat: row.lat,
    lng: row.lng,
    imageUrl: row.imageUrl,
    grade: row.grade,
    gradeVerified: row.gradeVerified,
    pickupOnly: row.pickupOnly,
    status: row.status,
    isDemo: row.isDemo,
    createdAt: row.createdAt,
    farmer: {
      id: row.farmer.id,
      name: row.farmer.name,
      verified: row.farmer.verified,
      village: row.farmer.village,
      farmName: row.farmer.farm?.farmName ?? null,
    },
    distance: distanceKm(origin ?? {}, { lat: row.lat, lng: row.lng }),
    auctionId: row.auction?.status === "LIVE" ? row.auction.id : null,
  }));

  if (origin && (filters.distance != null || filters.sort === "distance")) {
    items = items
      .map((item) => ({
        ...item,
        distance:
          item.distance ??
          distanceKm(origin, { lat: item.lat, lng: item.lng }),
      }))
      .filter((item) => {
        if (filters.distance == null) return true;
        return item.distance != null && item.distance <= filters.distance;
      });
  }

  const sortKey = filters.sort ?? (origin && filters.q ? "distance" : "newest");
  if (sortKey === "distance" && origin) {
    items.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  } else if (SORTS[sortKey]) {
    items.sort(SORTS[sortKey]);
  } else {
    items.sort(SORTS.newest);
  }

  const total = items.length;
  const limited = filters.limit ? items.slice(0, filters.limit) : items;

  return {
    items: limited,
    total,
    originLabel: place?.name ?? (filters.place || null),
    originCoords: origin,
  };
}

export async function categoryCounts() {
  const rows = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { listings: { where: { status: "ACTIVE" } } } },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    nameHi: row.nameHi,
    count: row._count.listings,
  }));
}

/** Reference price history for a commodity, newest first. */
export async function priceHistory(commodity: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.priceReference.findMany({
    where: { commodity, reportDate: { gte: since } },
    orderBy: { reportDate: "desc" },
  });
  return rows;
}

export async function latestReference(commodity: string) {
  return db.priceReference.findFirst({
    where: { commodity },
    orderBy: { reportDate: "desc" },
  });
}

export async function similarListings(listingId: string, categorySlug: string, limit = 3) {
  return db.listing.findMany({
    where: {
      id: { not: listingId },
      status: "ACTIVE",
      category: { slug: categorySlug },
    },
    include: { category: true, farmer: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
