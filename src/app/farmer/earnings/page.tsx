import type { Metadata } from "next";
import { Info, Wallet } from "lucide-react";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLATFORM_FEE_RATE } from "@/lib/domain";
import { formatINR, formatNumber, round2 } from "@/lib/utils";

export const metadata: Metadata = { title: "Earnings" };
export const dynamic = "force-dynamic";

export default async function FarmerEarningsPage() {
  const user = await requireRole("FARMER");

  const orders = await db.order.findMany({
    where: { farmerId: user.id, status: { not: "CANCELLED" } },
    include: { listing: true },
    orderBy: { createdAt: "asc" },
  });

  const gross = orders.reduce((sum, order) => sum + order.grossValue, 0);
  const fees = orders.reduce((sum, order) => sum + order.platformFee, 0);
  const freight = orders.reduce((sum, order) => sum + order.transportCost, 0);
  const net = orders.reduce((sum, order) => sum + order.netToFarmer, 0);
  const kgSold = orders.reduce((sum, order) => sum + order.quantity, 0);

  const byCommodity = new Map<string, { kg: number; gross: number; net: number; orders: number }>();
  for (const order of orders) {
    const key = order.listing.commodity;
    const entry = byCommodity.get(key) ?? { kg: 0, gross: 0, net: 0, orders: 0 };
    entry.kg += order.quantity;
    entry.gross += order.grossValue;
    entry.net += order.netToFarmer;
    entry.orders += 1;
    byCommodity.set(key, entry);
  }

  const byMonth = new Map<string, { net: number; gross: number }>();
  for (const order of orders) {
    const key = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(order.createdAt);
    const entry = byMonth.get(key) ?? { net: 0, gross: 0 };
    entry.net += order.netToFarmer;
    entry.gross += order.grossValue;
    byMonth.set(key, entry);
  }
  const months = Array.from(byMonth.entries());
  const maxNet = Math.max(...months.map(([, value]) => value.net), 1);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Money"
        title="Earnings"
        description="What confirmed transactions are worth to you after the platform fee and any freight you agreed to bear. No payment is collected or held by Mandi Relay in this build."
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <Stat label="Gross sold" value={formatINR(gross)} sub={`${formatNumber(kgSold)} kg`} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Platform fee" value={formatINR(fees)} sub={`${(PLATFORM_FEE_RATE * 100).toFixed(1)}% of gross`} />
        </div>
        <div className="border-t border-ivory-200 p-4 sm:border-t-0">
          <Stat label="Freight borne" value={formatINR(freight)} />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 sm:border-l-0 sm:border-t-0">
          <Stat label="Net earnings" value={formatINR(net)} tone="forest" sub={kgSold > 0 ? `${formatINR(round2(net / kgSold), true)}/kg average` : undefined} />
        </div>
      </Panel>

      <div className="flex items-start gap-2 rounded-[6px] border border-info/20 bg-info-soft px-3.5 py-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p className="text-[11.5px] leading-relaxed text-charcoal-500">
          These figures are estimates derived from confirmed orders. Settlement happens directly
          between you and the buyer — this prototype processes no payments and holds no funds.
        </p>
      </div>

      {orders.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Wallet className="size-5" />}
            title="No earnings yet"
            description="Once an offer is accepted, the order contributes to these totals."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel>
            <PanelHeader title="By month" description="Net earnings per month of confirmed orders" />
            <div className="space-y-2.5 p-4">
              {months.map(([month, value]) => (
                <div key={month}>
                  <div className="flex items-baseline justify-between text-[11.5px]">
                    <span className="font-medium text-charcoal">{month}</span>
                    <span className="text-charcoal-500 tabular">
                      {formatINR(value.net)}
                      <span className="ml-1.5 text-[10px] text-charcoal-400">
                        of {formatINR(value.gross)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ivory-200">
                    <div
                      className="h-full rounded-full bg-forest-600"
                      style={{ width: `${Math.max(6, Math.round((value.net / maxNet) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="By commodity" description="Where the money came from" />
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ivory-200 bg-ivory/60">
                    {["Produce", "Orders", "Sold", "Net"].map((header) => (
                      <th key={header} scope="col" className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-100">
                  {Array.from(byCommodity.entries()).map(([commodity, value]) => (
                    <tr key={commodity} className="text-[12px]">
                      <td className="px-3.5 py-2 font-medium text-charcoal">{commodity}</td>
                      <td className="px-3.5 py-2 text-charcoal-500 tabular">{value.orders}</td>
                      <td className="px-3.5 py-2 text-charcoal-500 tabular">{formatNumber(value.kg)} kg</td>
                      <td className="px-3.5 py-2 font-semibold text-forest-800 tabular">{formatINR(value.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
