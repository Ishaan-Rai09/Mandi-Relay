import type { Metadata } from "next";
import { Mic } from "lucide-react";

import { MarketplaceBrowser, type MarketplaceQuery } from "@/components/marketplace/marketplace-browser";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Marketplace" };
export const dynamic = "force-dynamic";

export default async function BuyerMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<MarketplaceQuery>;
}) {
  const user = await requireRole("BUYER");
  const query = await searchParams;

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { lat: true, lng: true, district: true },
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal sm:text-[30px]">
            Find produce near {profile?.district ?? "you"}.
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-charcoal-500">
            Filter by commodity, distance, price and availability — or press{" "}
            <span className="inline-flex items-center gap-1 font-medium text-forest-700">
              <Mic className="size-3" aria-hidden /> Voice
            </span>{" "}
            and say what you need.
          </p>
        </div>
      </div>

      <MarketplaceBrowser
        query={query}
        basePath="/buyer/marketplace"
        viewerOrigin={{ lat: profile?.lat ?? null, lng: profile?.lng ?? null }}
        detailBasePath="/buyer/product"
      />
    </div>
  );
}
