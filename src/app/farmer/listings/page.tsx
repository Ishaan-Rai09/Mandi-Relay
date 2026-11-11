import Link from "next/link";
import type { Metadata } from "next";
import { Gavel, Mic, Package, Plus } from "lucide-react";

import { ListingActions } from "@/components/farmer/listing-actions";
import { ButtonLink } from "@/components/ui/button";
import { DemoTag, Panel, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { LISTING_STATUS_LABEL, type ListingStatus } from "@/lib/domain";
import { formatDate, formatINR, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "My produce" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "RESERVED", label: "Reserved" },
  { key: "SOLD", label: "Sold" },
  { key: "PAUSED", label: "Paused" },
] as const;

export default async function FarmerListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole("FARMER");
  const { status: statusFilter } = await searchParams;

  const listings = await db.listing.findMany({
    where: {
      farmerId: user.id,
      ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
    },
    include: {
      category: true,
      auction: true,
      _count: { select: { offers: true, orders: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const totals = listings.reduce(
    (acc, listing) => {
      acc.availableKg += listing.availableQuantity;
      acc.value += listing.availableQuantity * listing.askingPrice;
      return acc;
    },
    { availableKg: 0, value: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Produce"
        title="My produce"
        description={`${listings.length} lot${listings.length === 1 ? "" : "s"} · ${formatNumber(totals.availableKg)} kg available · ${formatINR(totals.value)} at asking prices`}
        action={
          <>
            <ButtonLink href="/farmer/voice-listing" variant="outline" size="sm" icon={<Mic className="size-3.5" />}>
              Voice
            </ButtonLink>
            <ButtonLink href="/farmer/voice-listing" size="sm" icon={<Plus className="size-3.5" />}>
              New listing
            </ButtonLink>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => {
          const active = (statusFilter ?? "all") === filter.key;
          return (
            <Link
              key={filter.key}
              href={filter.key === "all" ? "/farmer/listings" : `/farmer/listings?status=${filter.key}`}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                active
                  ? "border-forest bg-forest text-white"
                  : "border-ivory-300 bg-white text-charcoal-500 hover:border-forest/30"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <Panel>
        {listings.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title="No lots here yet"
            description="Publish a harvest by voice — it takes one sentence, and you review every field before it goes live."
            action={
              <ButtonLink href="/farmer/voice-listing" icon={<Mic className="size-4" />}>
                List produce by voice
              </ButtonLink>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-ivory-200 bg-ivory/60">
                  {["Produce", "Available", "Asking", "Lot value", "Status", "Interest", "Added", ""].map(
                    (header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {listings.map((listing) => (
                  <tr key={listing.id} className="text-[12.5px] transition-colors hover:bg-ivory/50">
                    <td className="px-3.5 py-2.5">
                      <Link
                        href={`/farmer/listings/${listing.id}`}
                        className="font-semibold text-charcoal hover:text-forest-700"
                      >
                        {listing.commodity}
                      </Link>
                      <span className="ml-1.5 text-[10.5px] text-charcoal-400">{listing.location}</span>
                      {listing.isDemo ? <DemoTag className="ml-1.5" /> : null}
                      <p className="text-[10.5px] text-charcoal-400">
                        {listing.category.name}
                        {listing.variety ? ` · ${listing.variety}` : ""}
                      </p>
                    </td>
                    <td className="px-3.5 py-2.5 text-charcoal-500 tabular">
                      {formatNumber(listing.availableQuantity)}
                      <span className="text-charcoal-400"> / {formatNumber(listing.quantity)} kg</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-charcoal tabular">
                      {formatINR(listing.askingPrice)}/kg
                    </td>
                    <td className="px-3.5 py-2.5 text-charcoal-500 tabular">
                      {formatINR(listing.availableQuantity * listing.askingPrice)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill
                        tone={
                          listing.status === "ACTIVE"
                            ? "success"
                            : listing.status === "RESERVED"
                              ? "gold"
                              : listing.status === "SOLD"
                                ? "neutral"
                                : "warning"
                        }
                      >
                        {listing.auction?.status === "LIVE"
                          ? "In auction"
                          : LISTING_STATUS_LABEL[listing.status as ListingStatus]}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2 text-[11px] text-charcoal-500">
                        {listing._count.offers > 0 ? (
                          <Link href="/farmer/offers" className="hover:text-forest-700">
                            {listing._count.offers} offer{listing._count.offers === 1 ? "" : "s"}
                          </Link>
                        ) : (
                          <span className="text-charcoal-400">—</span>
                        )}
                        {listing.auction ? (
                          <span className="inline-flex items-center gap-0.5 text-gold-700">
                            <Gavel className="size-3" aria-hidden /> auction
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[11px] text-charcoal-400">
                      <span title={formatDate(listing.createdAt)}>{timeAgo(listing.createdAt)}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <ListingActions
                        listingId={listing.id}
                        status={listing.status}
                        hasOrders={listing._count.orders > 0}
                        hasAuction={Boolean(listing.auction)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-[11px] leading-relaxed text-charcoal-400">
        Available quantity falls automatically as orders are confirmed. A lot with orders or an
        auction cannot be deleted — pause or mark it sold instead.
      </p>
    </div>
  );
}
