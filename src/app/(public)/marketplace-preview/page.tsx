import type { Metadata } from "next";
import { Info } from "lucide-react";

import { MarketplaceBrowser, type MarketplaceQuery } from "@/components/marketplace/marketplace-browser";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Marketplace preview",
  description:
    "Browse open produce lots across Mohali, Banur, Kharar and Zirakpur. Filter by commodity, distance, price and availability.",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePreviewPage({
  searchParams,
}: {
  searchParams: Promise<MarketplaceQuery>;
}) {
  const query = await searchParams;

  return (
    <div className="container-x py-7 sm:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Marketplace preview</p>
          <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.03em] text-charcoal sm:text-[32px]">
            Fresh produce, straight from the farm.
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-charcoal-500">
            Browse without an account. Sending an offer needs a buyer account so the farmer knows
            who they are dealing with.
          </p>
        </div>
        <ButtonLink href="/auth?mode=signup&role=buyer" size="md">
          Register to make offers
        </ButtonLink>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-[6px] border border-info/20 bg-info-soft px-3.5 py-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p className="text-[11.5px] leading-relaxed text-charcoal-500">
          Read-only preview of lots published by registered farmers. Reference prices come from
          the official Agmarknet feed and describe a market, not a completed transaction.
        </p>
      </div>

      <div className="mt-4">
        <MarketplaceBrowser
          query={query}
          basePath="/marketplace-preview"
          detailBasePath="/marketplace-preview"
        />
      </div>
    </div>
  );
}
