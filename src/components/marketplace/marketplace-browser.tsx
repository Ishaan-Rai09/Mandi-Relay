import { PackageSearch } from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { SchematicMap, type MapPoint } from "@/components/marketplace/schematic-map";
import { EmptyState } from "@/components/ui/misc";
import { Panel } from "@/components/ui/panel";
import { categoryCounts, searchListings } from "@/lib/queries/listings";

export interface MarketplaceQuery {
  q?: string;
  category?: string;
  maxPrice?: string;
  minPrice?: string;
  minQty?: string;
  distance?: string;
  place?: string;
  availableBy?: string;
  sort?: string;
  view?: string;
}

const toNumber = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function MarketplaceBrowser({
  query,
  basePath,
  viewerOrigin,
  detailBasePath,
}: {
  query: MarketplaceQuery;
  basePath: string;
  viewerOrigin?: { lat: number | null; lng: number | null } | null;
  detailBasePath?: string;
}) {
  const defaultPlace = query.place ?? (query.distance ? "Mohali" : null);

  const [categories, result] = await Promise.all([
    categoryCounts(),
    searchListings({
      q: query.q ?? null,
      category: query.category ?? null,
      maxPrice: toNumber(query.maxPrice),
      minPrice: toNumber(query.minPrice),
      minQty: toNumber(query.minQty),
      distance: toNumber(query.distance),
      place: defaultPlace,
      availableBy: query.availableBy ?? null,
      sort: query.sort ?? null,
      origin: query.place ? null : viewerOrigin ?? null,
      limit: 60,
    }),
  ]);

  const view = query.view === "map" ? "map" : "list";
  const detailBase = detailBasePath ?? basePath;
  const mapOrigin =
    result.originCoords?.lat != null && result.originCoords?.lng != null
      ? { lat: result.originCoords.lat, lng: result.originCoords.lng }
      : null;

  const points: MapPoint[] = result.items.map((item) => ({
    id: item.id,
    commodity: item.commodity,
    lat: item.lat,
    lng: item.lng,
    price: item.askingPrice,
    quantity: item.availableQuantity,
    location: item.location,
    distance: item.distance,
    href: `${detailBase}/${item.id}`,
  }));

  return (
    <div className="space-y-4">
      <MarketplaceFilters
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count }))}
        basePath={basePath}
        view={view}
        total={result.total}
      />

      {result.total === 0 ? (
        <Panel>
          <EmptyState
            icon={<PackageSearch className="size-5" />}
            title="No lots match these filters"
            description="Try widening the distance, clearing the price ceiling, or searching a different commodity. New lots appear as farmers publish them."
          />
        </Panel>
      ) : view === "map" ? (
        <SchematicMap
          points={points}
          origin={mapOrigin}
          originLabel={result.originLabel ?? (query.place ?? null)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} href={`${detailBase}/${listing.id}`} />
          ))}
        </div>
      )}

      {result.total > 0 ? (
        <p className="text-[11px] text-charcoal-400">
          Showing {result.items.length} of {result.total} matching lots
          {result.originLabel ? ` · distances measured from ${result.originLabel}` : ""}
        </p>
      ) : null}
    </div>
  );
}
