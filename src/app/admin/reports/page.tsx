import type { Metadata } from "next";

import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

/**
 * Every number on this page is derived from stored records. Nothing is
 * extrapolated, and prototype volume is labelled as such.
 */
export default async function AdminReportsPage() {
  await requireRole("ADMIN");

  const [listings, offers, orders, users, references, deliveryRequests] = await Promise.all([
    db.listing.findMany({ include: { category: true } }),
    db.offer.findMany({ select: { status: true, pricePerUnit: true } }),
    db.order.findMany({ include: { listing: true } }),
    db.user.findMany({ select: { role: true, verified: true, isDemo: true, createdAt: true } }),
    db.priceReference.findMany({ orderBy: { reportDate: "desc" } }),
    db.deliveryRequest.findMany({ select: { status: true } }),
  ]);

  const accepted = offers.filter((offer) => offer.status === "ACCEPTED").length;
  const decided = offers.filter((offer) =>
    ["ACCEPTED", "REJECTED", "COUNTERED", "WITHDRAWN"].includes(offer.status),
  ).length;
  const acceptanceRate = decided > 0 ? Math.round((accepted / decided) * 100) : null;

  const byCategory = new Map<string, { lots: number; kg: number; value: number }>();
  for (const listing of listings) {
    const entry = byCategory.get(listing.category.name) ?? { lots: 0, kg: 0, value: 0 };
    entry.lots += 1;
    entry.kg += listing.availableQuantity;
    entry.value += listing.availableQuantity * listing.askingPrice;
    byCategory.set(listing.category.name, entry);
  }

  const byDistrict = new Map<string, number>();
  for (const listing of listings) {
    byDistrict.set(listing.district, (byDistrict.get(listing.district) ?? 0) + 1);
  }

  const referenceByCommodity = new Map<string, number>();
  for (const reference of references) {
    if (!referenceByCommodity.has(reference.commodity)) {
      referenceByCommodity.set(reference.commodity, reference.modalPrice / 100);
    }
  }

  const realisation = orders
    .map((order) => {
      const modal = referenceByCommodity.get(order.listing.commodity);
      if (!modal) return null;
      return { commodity: order.listing.commodity, price: order.pricePerUnit, modal, gap: order.pricePerUnit - modal };
    })
    .filter((row): row is { commodity: string; price: number; modal: number; gap: number } => row !== null);

  const avgGap =
    realisation.length > 0
      ? realisation.reduce((sum, row) => sum + row.gap, 0) / realisation.length
      : null;

  const totalGross = orders.reduce((sum, order) => sum + order.grossValue, 0);

  const accountAges = users.map((user) => Date.now() - user.createdAt.getTime());
  const medianAgeDays =
    accountAges.length > 0
      ? Math.round(
          accountAges.sort((a, b) => a - b)[Math.floor(accountAges.length / 2)] / (24 * 3600 * 1000),
        )
      : 0;

  const notGrade = listings.filter((listing) => !listing.grade).length;
  const noCoords = listings.filter((listing) => listing.lat == null).length;
  const sampleRates = references.filter((reference) => reference.isSample).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Reports"
        description="Derived from stored records only. With a seeded dataset these describe the prototype, not the Indian market."
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 lg:grid-cols-4 lg:divide-x">
        <div className="p-4">
          <Stat label="Lots published" value={listings.length} sub={`${formatNumber(listings.reduce((s, l) => s + l.availableQuantity, 0))} kg available`} />
        </div>
        <div className="border-l border-ivory-200 p-4 lg:border-l-0">
          <Stat
            label="Offer acceptance"
            value={acceptanceRate != null ? `${acceptanceRate}%` : "—"}
            sub={`${decided} decided offers`}
          />
        </div>
        <div className="border-t border-ivory-200 p-4 lg:border-t-0">
          <Stat
            label="Price vs reference"
            value={avgGap != null ? `${avgGap > 0 ? "+" : ""}${avgGap.toFixed(2)}` : "—"}
            sub="₹/kg average gap on confirmed orders"
          />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 lg:border-l-0 lg:border-t-0">
          <Stat label="Ordered value" value={formatINR(totalGross)} sub={`${orders.length} orders`} tone="forest" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Lot mix by category" />
          <div className="space-y-3 p-4">
            {byCategory.size === 0 ? (
              <p className="text-[12px] text-charcoal-400">No listings yet.</p>
            ) : (
              Array.from(byCategory.entries())
                .sort((a, b) => b[1].lots - a[1].lots)
                .map(([category, value]) => {
                  const max = Math.max(...Array.from(byCategory.values()).map((v) => v.lots));
                  return (
                    <div key={category}>
                      <div className="flex items-baseline justify-between text-[11.5px]">
                        <span className="font-medium text-charcoal">{category}</span>
                        <span className="text-charcoal-500 tabular">
                          {value.lots} lots · {formatINR(value.value)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ivory-200">
                        <div
                          className="h-full rounded-full bg-forest-600"
                          style={{ width: `${Math.max(6, Math.round((value.lots / max) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Supply by district" />
          <ul className="divide-y divide-ivory-100">
            {Array.from(byDistrict.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([district, count]) => (
                <li key={district} className="flex items-center justify-between px-4 py-2.5 text-[12px]">
                  <span className="text-charcoal-500">{district}</span>
                  <span className="font-semibold text-charcoal tabular">{count}</span>
                </li>
              ))}
            {byDistrict.size === 0 ? (
              <li className="px-4 py-5 text-[12px] text-charcoal-400">No listings yet.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Realisation against reference" description="Confirmed order prices compared with the latest sample modal price" />
          {realisation.length === 0 ? (
            <p className="px-4 py-5 text-[12px] leading-relaxed text-charcoal-400">
              No confirmed orders for commodities with a loaded reference price yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ivory-200 bg-ivory/60">
                    {["Commodity", "Order", "Reference", "Gap"].map((header) => (
                      <th key={header} scope="col" className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-100">
                  {realisation.map((row, index) => (
                    <tr key={`${row.commodity}-${index}`} className="text-[12px]">
                      <td className="px-3.5 py-2 font-medium text-charcoal">{row.commodity}</td>
                      <td className="px-3.5 py-2 text-charcoal-500 tabular">{formatINR(row.price, true)}</td>
                      <td className="px-3.5 py-2 text-charcoal-500 tabular">{formatINR(row.modal, true)}</td>
                      <td className={`px-3.5 py-2 tabular ${row.gap > 0 ? "text-warning" : "text-success"}`}>
                        {row.gap > 0 ? "+" : ""}
                        {row.gap.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Data quality" description="Gaps that affect trust and matching" />
          <ul className="divide-y divide-ivory-100 text-[12px]">
            {[
              { label: "Listings without a stated grade", value: notGrade, tone: "neutral" as const },
              { label: "Listings without coordinates", value: noCoords, tone: "neutral" as const },
              { label: "Unverified accounts", value: users.filter((user) => !user.verified).length, tone: "warning" as const },
              { label: "Demonstration accounts", value: users.filter((user) => user.isDemo).length, tone: "neutral" as const },
              { label: "Sample price reference rows", value: sampleRates, tone: "warning" as const },
              { label: "Median account age (days)", value: medianAgeDays, tone: "neutral" as const },
              { label: "Transport requests", value: deliveryRequests.length, tone: "neutral" as const },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-charcoal-500">{row.label}</span>
                <Pill tone={row.tone}>{row.value}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="text-[11px] leading-relaxed text-charcoal-400">
        Price references in this environment are sample rows in Agmarknet format (
        {sampleRates} rows), not official quotations. Connecting an official feed replaces the
        sample flag and keeps the source and report date on every row.
      </p>
    </div>
  );
}
