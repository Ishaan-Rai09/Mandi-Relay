import type { Metadata } from "next";

import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auctionsEnabled } from "@/lib/features";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  await requireRole("ADMIN");

  const [orders, auctions, requests] = await Promise.all([
    db.order.findMany({
      include: { listing: true, farmer: true, buyer: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    auctionsEnabled
      ? db.auction.findMany({
          include: { listing: true, farmer: true, _count: { select: { bids: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    db.deliveryRequest.findMany({
      include: { requester: true, quotes: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const gmv = orders.reduce((sum, order) => sum + order.grossValue, 0);
  const fees = orders.reduce((sum, order) => sum + order.platformFee, 0);
  const freight = orders.reduce((sum, order) => sum + order.transportCost, 0);
  const nets = orders.reduce((sum, order) => sum + order.netToFarmer, 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Transactions"
        description="Confirmed orders and transport activity. No funds are held or moved by the platform in this build."
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 lg:grid-cols-4 lg:divide-x">
        <div className="p-4">
          <Stat label="Orders" value={orders.length} />
        </div>
        <div className="border-l border-ivory-200 p-4 lg:border-l-0">
          <Stat label="GMV" value={formatINR(gmv)} />
        </div>
        <div className="border-t border-ivory-200 p-4 lg:border-t-0">
          <Stat label="Fees + freight" value={formatINR(fees + freight)} />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 lg:border-l-0 lg:border-t-0">
          <Stat label="To farmers" value={formatINR(nets)} tone="forest" />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Orders" description="Newest first." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-ivory-200 bg-ivory/60">
                {["Order", "Lot", "Farmer → Buyer", "Qty", "Gross", "Fee", "Freight", "Net", "Status", "Date"].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-charcoal-400">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="text-[11.5px] hover:bg-ivory/50">
                    <td className="px-3 py-2 font-mono text-[10.5px] text-charcoal">
                      {order.orderNo}
                      
                    </td>
                    <td className="px-3 py-2 text-charcoal-500">{order.listing.commodity}</td>
                    <td className="px-3 py-2 text-charcoal-500">
                      {order.farmer.name}
                      <span className="text-charcoal-400"> → </span>
                      {order.buyer.name}
                    </td>
                    <td className="px-3 py-2 text-charcoal-500 tabular">{formatNumber(order.quantity)} kg</td>
                    <td className="px-3 py-2 text-charcoal tabular">{formatINR(order.grossValue)}</td>
                    <td className="px-3 py-2 text-charcoal-400 tabular">{formatINR(order.platformFee)}</td>
                    <td className="px-3 py-2 text-charcoal-400 tabular">{formatINR(order.transportCost)}</td>
                    <td className="px-3 py-2 font-medium text-forest-800 tabular">{formatINR(order.netToFarmer)}</td>
                    <td className="px-3 py-2">
                      <Pill tone={order.status === "DELIVERED" || order.status === "COMPLETED" ? "success" : "gold"}>
                        {order.status.replace("_", " ").toLowerCase()}
                      </Pill>
                    </td>
                    <td className="px-3 py-2 text-[10.5px] text-charcoal-400">{formatDate(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {auctionsEnabled ? (
        <Panel>
          <PanelHeader title="Auctions" />
          <ul className="divide-y divide-ivory-100">
            {auctions.length === 0 ? (
              <li className="px-4 py-5 text-[12px] text-charcoal-400">No auctions created.</li>
            ) : (
              auctions.map((auction) => (
                <li key={auction.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-charcoal">
                      {auction.listing.commodity}
                      <span className="ml-1.5 text-[10.5px] font-normal text-charcoal-400">
                        {auction.farmer.name}
                      </span>
                    </p>
                    <p className="text-[10.5px] text-charcoal-400">
                      {formatNumber(auction.quantity)} kg · {auction._count.bids} bids · floor{" "}
                      {formatINR(auction.startingPrice)}
                    </p>
                  </div>
                  <Pill tone={auction.status === "AWARDED" ? "success" : auction.status === "LIVE" ? "gold" : "neutral"}>
                    {auction.status.toLowerCase()}
                  </Pill>
                </li>
              ))
            )}
          </ul>
        </Panel>
        ) : null}

        <Panel>
          <PanelHeader title="Transport requests" />
          <ul className="divide-y divide-ivory-100">
            {requests.length === 0 ? (
              <li className="px-4 py-5 text-[12px] text-charcoal-400">No transport requests.</li>
            ) : (
              requests.map((request) => (
                <li key={request.id} className="px-4 py-2.5">
                  <p className="truncate text-[12px] font-medium text-charcoal">
                    {request.pickupLocation} → {request.dropLocation}
                  </p>
                  <p className="text-[10.5px] text-charcoal-400">
                    {formatNumber(request.quantityKg)} kg · {request.quotes.length} quote
                    {request.quotes.length === 1 ? "" : "s"} · {request.status.toLowerCase()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
