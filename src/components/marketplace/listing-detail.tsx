import Link from "next/link";
import { CalendarDays, Gavel, MapPin, Package, ShieldAlert, Truck, Wheat } from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { OfferForm } from "@/components/marketplace/offer-form";
import { PriceReferencePanel, type ReferenceRow } from "@/components/marketplace/price-reference";
import { ProduceTile } from "@/components/ui/produce-art";
import { Panel, Pill, VerifiedBadge } from "@/components/ui/panel";
import { BackLink } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { auctionsEnabled } from "@/lib/features";
import type { ListingCardData } from "@/lib/queries/listings";
import { cn, formatDate, formatINR, formatNumber, timeAgo } from "@/lib/utils";

export interface ListingDetailData {
  id: string;
  commodity: string;
  variety: string | null;
  description: string | null;
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
  createdAt: Date;
  category: { slug: string; name: string };
  farmer: { id: string; name: string; verified: boolean; village: string | null; district: string | null; farmName: string | null; sizeAcres: number | null; createdAt: Date };
  auction: { id: string; status: string; endsAt: Date } | null;
}

export function ListingDetail({
  listing,
  reference,
  history,
  similar,
  viewerRole,
  backHref = "/marketplace-preview",
  baseHref = "/marketplace-preview",
}: {
  listing: ListingDetailData;
  reference: ReferenceRow | null;
  history: ReferenceRow[];
  similar: { id: string; commodity: string }[];
  viewerRole: "FARMER" | "BUYER" | "TRANSPORTER" | "ADMIN" | null;
  backHref?: string;
  baseHref?: string;
}) {
  const lotValue = listing.availableQuantity * listing.askingPrice;
  const closed = listing.status === "SOLD" || listing.availableQuantity <= 0;
  const isOwner = viewerRole === "FARMER";

  return (
    <div className="container-x py-5 sm:py-7">
      <BackLink href={backHref}>Marketplace</BackLink>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:gap-8">
        {/* ── Main column ── */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="forest">{listing.category.name}</Pill>
                {listing.status === "RESERVED" ? <Pill tone="gold">Reserved</Pill> : null}
                {closed ? <Pill tone="neutral">Sold out</Pill> : null}
                {auctionsEnabled && listing.auction?.status === "LIVE" ? (
                  <Pill tone="gold" dot>
                    Live auction
                  </Pill>
                ) : null}
              </div>
              <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.03em] text-charcoal sm:text-[34px]">
                {listing.commodity}
              </h1>
              <p className="mt-1 text-[13px] text-charcoal-500">
                {listing.variety ?? "Standard variety"} · {formatNumber(listing.availableQuantity)}{" "}
                {listing.unit} available
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-sage">Asking</p>
              <p className="font-display text-[28px] font-bold leading-none tracking-[-0.03em] text-forest-800 tabular">
                {formatINR(listing.askingPrice, true)}
              </p>
              <p className="mt-0.5 text-[11px] text-charcoal-400">per {listing.unit}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[8px] border border-ivory-300">
            <ProduceTile
              category={listing.category.slug}
              imageUrl={listing.imageUrl}
              alt={`${listing.commodity} lot at ${listing.location}`}
              className="aspect-[16/9] w-full"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-ivory-300 bg-ivory-300 sm:grid-cols-4">
            {[
              {
                label: "Available",
                value: `${formatNumber(listing.availableQuantity)} ${listing.unit}`,
                icon: Package,
              },
              { label: "Ready from", value: formatDate(listing.availableFrom), icon: CalendarDays },
              { label: "Total lot value", value: formatINR(lotValue), icon: Wheat },
              {
                label: "Handover",
                value: listing.pickupOnly ? "Farm gate pickup" : "Pickup or delivery",
                icon: Truck,
              },
            ].map((fact) => (
              <div key={fact.label} className="bg-white px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-sage">
                  <fact.icon className="size-3" aria-hidden /> {fact.label}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-charcoal">{fact.value}</p>
              </div>
            ))}
          </div>

          {listing.description ? (
            <section className="mt-6">
              <h2 className="font-display text-[14px] font-bold text-charcoal">About this lot</h2>
              <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-charcoal-500">
                {listing.description}
              </p>
            </section>
          ) : null}

          <section className="mt-6 rule pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[14px] font-bold text-charcoal">Location &amp; quality</h2>
              <span className="text-[11px] text-charcoal-400">
                Listed {timeAgo(listing.createdAt)}
              </span>
            </div>
            <dl className="mt-2.5 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-sage" aria-hidden />
                <div>
                  <dt className="text-sage">Pickup location</dt>
                  <dd className="font-medium text-charcoal">
                    {listing.location}, {listing.district}, {listing.state}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-sage" aria-hidden />
                <div>
                  <dt className="text-sage">Quality grade</dt>
                  <dd className="font-medium text-charcoal">
                    {listing.grade ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        Grade {listing.grade}
                        <span className="text-[11px] font-normal text-charcoal-400">
                          {listing.gradeVerified
                            ? "· independently checked"
                            : "· stated by the farmer, not independently certified"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-charcoal-400">Not stated</span>
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          {/* Seller */}
          <section className="mt-6">
            <h2 className="font-display text-[14px] font-bold text-charcoal">Seller</h2>
            <Panel className="mt-2 flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-forest text-[13px] font-bold text-white">
                  {listing.farmer.name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-charcoal">{listing.farmer.name}</p>
                  <p className="text-[11.5px] text-charcoal-400">
                    {listing.farmer.farmName ?? "Individual producer"}
                    {listing.farmer.sizeAcres ? ` · ${listing.farmer.sizeAcres} acres` : ""}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <VerifiedBadge verified={listing.farmer.verified} />
                    <span className="text-[11px] text-charcoal-400">
                      On Mandi Relay since {formatDate(listing.farmer.createdAt, { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-charcoal-400">Contact</p>
                <p className="text-[12px] font-medium text-charcoal-500">
                  Shared after an order is confirmed
                </p>
              </div>
            </Panel>
          </section>

          {auctionsEnabled && listing.auction?.status === "LIVE" ? (
            <section className="mt-6">
              <Panel className="flex flex-wrap items-center justify-between gap-3 border-gold/40 bg-gold-50 p-3.5">
                <div className="flex items-center gap-2">
                  <Gavel className="size-4 text-gold-700" aria-hidden />
                  <div>
                    <p className="text-[13px] font-semibold text-charcoal">This lot is in a live auction</p>
                    <p className="text-[11.5px] text-charcoal-500">
                      Bidding closes {formatDate(listing.auction.endsAt, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <ButtonLink
                  href={viewerRole === "FARMER" ? `/farmer/auctions/${listing.auction.id}` : `/buyer/auctions/${listing.auction.id}`}
                  size="sm"
                  variant="gold"
                >
                  Open auction
                </ButtonLink>
              </Panel>
            </section>
          ) : null}

          {similar.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-[14px] font-bold text-charcoal">Similar lots</h2>
              <div className="mt-2.5 grid gap-4 sm:grid-cols-3">
                {similar.map((item) => (
                  <Link
                    key={item.id}
                    href={`${baseHref}/${item.id}`}
                    className={cn(
                      "group rounded-[6px] border border-ivory-300 bg-white p-3 transition-colors hover:border-forest/25",
                    )}
                  >
                    <p className="text-[13px] font-semibold text-charcoal group-hover:text-forest-700">
                      {item.commodity}
                    </p>
                    <p className="mt-0.5 text-[11px] text-charcoal-400">View lot</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* ── Aside ── */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel className="p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
                {isOwner ? "Your listing" : "Make an offer"}
              </p>
              <span className="text-[11px] text-charcoal-400">No payment now</span>
            </div>

            {isOwner ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12.5px] leading-relaxed text-charcoal-500">
                  This is your own lot. Open the farmer workspace to edit it or review incoming
                  offers.
                </p>
                <ButtonLink href="/farmer/listings" size="sm" className="w-full">
                  Manage listing
                </ButtonLink>
              </div>
            ) : viewerRole === "BUYER" ? (
              <div className="mt-3">
                <OfferForm
                  listingId={listing.id}
                  askingPrice={listing.askingPrice}
                  availableQuantity={listing.availableQuantity}
                  unit={listing.unit}
                  disabled={closed || listing.auction?.status === "LIVE"}
                  disabledReason={
                    listing.auction?.status === "LIVE"
                      ? "This lot is being auctioned. Place a bid in the auction instead."
                      : "This lot is no longer available."
                  }
                />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-[12.5px] leading-relaxed text-charcoal-500">
                  Sign in as a buyer to send an offer with your quantity, price and pickup terms.
                </p>
                <ButtonLink href={`/auth?mode=signup&role=buyer&next=/buyer/product/${listing.id}`} size="sm" className="w-full">
                  Register as a buyer
                </ButtonLink>
                <ButtonLink href="/auth" size="sm" variant="outline" className="w-full">
                  Sign in
                </ButtonLink>
              </div>
            )}
          </Panel>

          <div className="mt-4">
            <PriceReferencePanel
              reference={reference}
              askingPerKg={listing.askingPrice}
              history={history}
            />
          </div>

          <Panel className="mt-4 p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              Before you trade
            </p>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              <li>· Inspect the lot before paying the farmer directly.</li>
              <li>· Weigh at pickup; the order records the agreed quantity.</li>
              <li>· Reference prices describe a mandi, not a guarantee.</li>
              <li>· Mandi Relay does not hold, move or guarantee money.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export function toReferenceRow(row: {
  commodity: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  reportDate: Date;
  source: string;
}): ReferenceRow {
  return {
    commodity: row.commodity,
    market: row.market,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    modalPrice: row.modalPrice,
    reportDate: row.reportDate,
    source: row.source,
  };
}

export type SimilarListing = ListingCardData;
