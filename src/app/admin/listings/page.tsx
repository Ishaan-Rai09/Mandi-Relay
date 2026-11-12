import Link from "next/link";
import type { Metadata } from "next";

import { ModerateListingButton } from "@/components/admin/admin-actions";
import { Panel, Pill } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatINR, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Listings" };
export const dynamic = "force-dynamic";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ moderation?: string }>;
}) {
  await requireRole("ADMIN");
  const { moderation } = await searchParams;

  const listings = await db.listing.findMany({
    where: moderation && moderation !== "ALL" ? { moderationStatus: moderation } : {},
    include: {
      farmer: true,
      category: true,
      auction: true,
      _count: { select: { offers: true, orders: true } },
    },
    orderBy: [{ moderationStatus: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const filters = ["ALL", "APPROVED", "PENDING", "REJECTED"] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Listings"
        description="Approve, hold or pause lots. Pausing a lot makes it invisible in the marketplace immediately."
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => {
          const active = (moderation ?? "ALL") === filter;
          return (
            <Link
              key={filter}
              href={filter === "ALL" ? "/admin/listings" : `/admin/listings?moderation=${filter}`}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                active
                  ? "border-forest bg-forest text-white"
                  : "border-ivory-300 bg-white text-charcoal-500 hover:border-forest/30"
              }`}
            >
              {filter === "ALL" ? "All lots" : filter.toLowerCase()}
            </Link>
          );
        })}
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-ivory-200 bg-ivory/60">
                {["Lot", "Farmer", "Quantity", "Ask", "State", "Moderation", "Listed", ""].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-charcoal-400">
                    No lots match this filter.
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
                  <tr key={listing.id} className="text-[12px] hover:bg-ivory/50">
                    <td className="px-3.5 py-2.5">
                      <Link
                        href={`/marketplace-preview/${listing.id}`}
                        className="font-medium text-charcoal hover:text-forest-700"
                      >
                        {listing.commodity}
                      </Link>
                      <span className="ml-1.5 text-[10.5px] text-charcoal-400">{listing.category.name}</span>
                      
                    </td>
                    <td className="px-3.5 py-2.5 text-charcoal-500">
                      {listing.farmer.name}
                      <span className="block text-[10px] text-charcoal-400">
                        {listing.farmer.verified ? "verified" : "unverified"}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-charcoal-500 tabular">
                      {formatNumber(listing.availableQuantity)} / {formatNumber(listing.quantity)} kg
                    </td>
                    <td className="px-3.5 py-2.5 text-charcoal-500 tabular">
                      {formatINR(listing.askingPrice)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill
                        tone={
                          listing.status === "ACTIVE"
                            ? "success"
                            : listing.status === "RESERVED"
                              ? "gold"
                              : "neutral"
                        }
                      >
                        {listing.auction?.status === "LIVE" ? "auction" : listing.status.toLowerCase()}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill
                        tone={
                          listing.moderationStatus === "APPROVED"
                            ? "neutral"
                            : listing.moderationStatus === "PENDING"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {listing.moderationStatus.toLowerCase()}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5 text-[10.5px] text-charcoal-400">
                      <span title={formatDate(listing.createdAt)}>{timeAgo(listing.createdAt)}</span>
                      <span className="block">
                        {listing._count.offers} offers · {listing._count.orders} orders
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <ModerateListingButton listingId={listing.id} moderationStatus={listing.moderationStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
