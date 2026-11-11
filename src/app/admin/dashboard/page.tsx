import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowRight, Gavel, ShieldCheck, Truck, Users } from "lucide-react";

import { DemoTag, Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatINR, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireRole("ADMIN");

  const [
    users,
    listings,
    offers,
    orders,
    auctions,
    deliveries,
    pendingModeration,
    unverified,
    audits,
    recentUsers,
  ] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.offer.count(),
    db.order.findMany({ select: { grossValue: true, platformFee: true, netToFarmer: true, status: true } }),
    db.auction.groupBy({ by: ["status"], _count: { _all: true } }),
    db.deliveryRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.listing.count({ where: { moderationStatus: "PENDING" } }),
    db.user.count({ where: { verified: false } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: true } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { farm: true, business: true } }),
  ]);

  const userCount = (role: string) => users.find((row) => row.role === role)?._count._all ?? 0;
  const listingCount = (status: string) => listings.find((row) => row.status === status)?._count._all ?? 0;
  const liveAuctions = auctions.find((row) => row.status === "LIVE")?._count._all ?? 0;
  const gmv = orders.reduce((sum, order) => sum + order.grossValue, 0);
  const fees = orders.reduce((sum, order) => sum + order.platformFee, 0);
  const openLoads = deliveries
    .filter((row) => ["REQUESTED", "QUOTED"].includes(row.status))
    .reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Platform overview"
        description="Operational state of the marketplace. Demonstration records are counted separately wherever it matters."
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 lg:grid-cols-4 lg:divide-x">
        <div className="p-4">
          <Stat label="Users" value={userCount("FARMER") + userCount("BUYER") + userCount("TRANSPORTER") + userCount("ADMIN")} sub={`${userCount("FARMER")} farmers · ${userCount("BUYER")} buyers`} />
        </div>
        <div className="border-l border-ivory-200 p-4 lg:border-l-0">
          <Stat label="Active lots" value={listingCount("ACTIVE")} sub={`${listingCount("RESERVED")} reserved · ${listingCount("SOLD")} sold`} />
        </div>
        <div className="border-t border-ivory-200 p-4 lg:border-t-0">
          <Stat label="Offers" value={offers} sub={`${orders.length} orders`} />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 lg:border-l-0 lg:border-t-0">
          <Stat label="Gross merchandise value" value={formatINR(gmv)} sub={`${formatINR(fees)} platform fees`} tone="forest" />
        </div>
      </Panel>

      {pendingModeration > 0 ? (
        <Panel className="border-gold/40 bg-gold-50 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[12.5px] text-charcoal">
              <ShieldCheck className="size-4 text-gold-700" aria-hidden />
              {pendingModeration} listing{pendingModeration === 1 ? "" : "s"} awaiting moderation.
            </p>
            <Link href="/admin/listings" className="text-[12px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2">
              Review queue
            </Link>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Recent platform activity"
            description="Every privileged or commercial mutation is written to the audit log."
          />
          <ul className="divide-y divide-ivory-100">
            {audits.length === 0 ? (
              <li className="px-4 py-5 text-[12px] text-charcoal-400">No audit entries yet.</li>
            ) : (
              audits.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-charcoal">
                      {entry.action.replace(/_/g, " ").toLowerCase()}
                      <span className="ml-1.5 text-[10.5px] font-normal text-charcoal-400">
                        {entry.entity}
                      </span>
                    </p>
                    <p className="text-[10.5px] text-charcoal-400">
                      {entry.actor?.name ?? "system"} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-charcoal-400">{timeAgo(entry.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Operations" />
            <ul className="divide-y divide-ivory-100 text-[12px]">
              {[
                { label: "Live auctions", value: liveAuctions, href: "/admin/transactions", icon: Gavel },
                { label: "Open transport loads", value: openLoads, href: "/admin/transactions", icon: Truck },
                { label: "Unverified accounts", value: unverified, href: "/admin/users", icon: Users },
                { label: "Paused / rejected lots", value: listingCount("PAUSED"), href: "/admin/listings", icon: Activity },
              ].map((row) => (
                <li key={row.label}>
                  <Link href={row.href} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-ivory/60">
                    <span className="flex items-center gap-1.5 text-charcoal-500">
                      <row.icon className="size-3.5 text-sage" aria-hidden />
                      {row.label}
                    </span>
                    <span className="font-semibold text-charcoal tabular">{row.value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Newest accounts" />
            <ul className="divide-y divide-ivory-100">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-charcoal">{user.name}</p>
                    <p className="truncate text-[10.5px] text-charcoal-400">
                      {user.farm?.farmName ?? user.business?.businessName ?? user.role.toLowerCase()}
                      {user.district ? ` · ${user.district}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {user.isDemo ? <DemoTag /> : null}
                    <Pill tone={user.verified ? "success" : "neutral"}>
                      {user.verified ? "Verified" : "Unverified"}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-ivory-200 px-4 py-2">
              <Link href="/admin/users" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-forest-700 hover:underline">
                Manage users <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-charcoal-400">
        Counts include the seeded demonstration dataset. {formatNumber(orders.length)} orders worth{" "}
        {formatINR(gmv)} is prototype activity, not real market volume.
      </p>
    </div>
  );
}
