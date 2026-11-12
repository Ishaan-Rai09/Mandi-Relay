import Link from "next/link";
import { ArrowUpRight, Gavel, MapPin, Truck } from "lucide-react";

import { ProduceTile } from "@/components/ui/produce-art";
import { Pill, VerifiedBadge } from "@/components/ui/panel";
import { auctionsEnabled } from "@/lib/features";
import type { ListingCardData } from "@/lib/queries/listings";
import { cn, formatDate, formatINR, formatNumber, timeAgo } from "@/lib/utils";

export function ListingCard({
  listing,
  href,
  className,
  showSeller = true,
}: {
  listing: ListingCardData;
  href: string;
  className?: string;
  showSeller?: boolean;
}) {
  const soldOut = listing.availableQuantity <= 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[8px] border border-ivory-300 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-[var(--shadow-e2)]",
        className,
      )}
    >
      <Link href={href} className="flex flex-1 flex-col" aria-label={`${listing.commodity}, ${formatNumber(listing.availableQuantity)} kg at ${formatINR(listing.askingPrice)} per kg`}>
        <div className="relative">
          <ProduceTile
            category={listing.categorySlug}
            imageUrl={listing.imageUrl}
            alt={`${listing.commodity} available at ${listing.location}`}
            className="aspect-[4/3] w-full"
          />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {auctionsEnabled && listing.auctionId ? (
              <span className="inline-flex items-center gap-1 rounded-[3px] bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-charcoal shadow-sm">
                <Gavel className="size-3" aria-hidden /> Auction
              </span>
            ) : null}
            {listing.status === "RESERVED" ? (
              <span className="rounded-[3px] bg-charcoal/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ivory backdrop-blur">
                Reserved
              </span>
            ) : null}
            {soldOut ? (
              <span className="rounded-[3px] bg-charcoal/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ivory">
                Sold out
              </span>
            ) : null}
          </div>
          {listing.distance != null ? (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-[3px] bg-white/92 px-1.5 py-0.5 text-[10.5px] font-medium text-charcoal-500 backdrop-blur">
              <MapPin className="size-3" aria-hidden /> {listing.distance} km
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-bold leading-tight tracking-[-0.01em] text-charcoal">
                {listing.commodity}
              </h3>
              <p className="mt-0.5 truncate text-[11.5px] text-charcoal-400">
                {listing.variety ?? listing.categoryName}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-[16px] font-bold leading-none tracking-[-0.02em] text-forest-800 tabular">
                {formatINR(listing.askingPrice)}
              </p>
              <p className="mt-0.5 text-[10.5px] text-charcoal-400">per kg</p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-ivory-200 pt-2.5 text-[11.5px]">
            <div>
              <dt className="text-sage">Available</dt>
              <dd className="font-semibold text-charcoal tabular">
                {formatNumber(listing.availableQuantity)} {listing.unit}
              </dd>
            </div>
            <div>
              <dt className="text-sage">From</dt>
              <dd className="truncate font-medium text-charcoal">{formatDate(listing.availableFrom)}</dd>
            </div>
            <div className="col-span-2 flex items-center gap-1.5">
              <dt className="sr-only">Location</dt>
              <dd className="flex min-w-0 items-center gap-1 text-charcoal-500">
                <MapPin className="size-3 shrink-0 text-sage" aria-hidden />
                <span className="truncate">{listing.location}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            {showSeller ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-forest-100 text-[8.5px] font-bold text-forest-700">
                  {listing.farmer.name.slice(0, 1)}
                </span>
                <span className="truncate text-[11.5px] text-charcoal-500">{listing.farmer.name}</span>
                {listing.farmer.verified ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-forest-500" title="Verified farmer" />
                ) : null}
              </div>
            ) : null}
            <span className="flex shrink-0 items-center gap-1 text-[10.5px] text-charcoal-400">
              {listing.pickupOnly ? (
                <>
                  <Truck className="size-3" aria-hidden /> Farm gate
                </>
              ) : (
                timeAgo(listing.createdAt)
              )}
            </span>
          </div>

          {listing.grade ? (
            <div className="mt-2.5 flex items-center gap-1.5">
              <Pill tone="forest">
                Grade {listing.grade}
                {listing.gradeVerified ? " · verified" : " · stated by farmer"}
              </Pill>
            </div>
          ) : null}
        </div>
      </Link>

      <span className="pointer-events-none absolute right-3 top-[calc(100%-2.6rem)] hidden opacity-0 transition-opacity group-hover:opacity-100 sm:block">
        <ArrowUpRight className="size-4 text-forest-600" aria-hidden />
      </span>
    </article>
  );
}

export function ListingRow({
  listing,
  href,
  right,
}: {
  listing: ListingCardData;
  href: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ProduceTile
        category={listing.categorySlug}
        imageUrl={listing.imageUrl}
        alt={listing.commodity}
        className="size-11 shrink-0 rounded-[4px] border border-ivory-200"
      />
      <div className="min-w-0 flex-1">
        <Link href={href} className="block truncate text-[13px] font-semibold text-charcoal hover:text-forest-700">
          {listing.commodity}
        </Link>
        <p className="truncate text-[11.5px] text-charcoal-400">
          {formatNumber(listing.availableQuantity)} {listing.unit} · {listing.location}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12.5px] font-semibold text-charcoal tabular">{formatINR(listing.askingPrice)}/kg</p>
        {right}
      </div>
    </div>
  );
}

export function VerifiedNote({ verified }: { verified: boolean }) {
  return <VerifiedBadge verified={verified} />;
}
