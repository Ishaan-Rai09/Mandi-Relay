import type { Metadata } from "next";
import { ClipboardList, Truck } from "lucide-react";

import { TransportRequestButton } from "@/components/shared/transport-request";
import { TransportQuotes } from "@/components/shared/transport-quotes";
import { DemoTag, Panel, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { distanceKm, formatDate, formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "success" | "info" | "gold" | "neutral"> = {
  CONFIRMED: "gold",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export default async function FarmerOrdersPage() {
  const user = await requireRole("FARMER");

  const orders = await db.order.findMany({
    where: { farmerId: user.id },
    include: {
      buyer: { include: { business: true } },
      listing: true,
      delivery: { include: { transporter: true } },
      offer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const transportRequests = await db.deliveryRequest.findMany({
    where: { requesterId: user.id },
    include: {
      quotes: {
        include: { transporter: { include: { transporter: true } } },
        orderBy: { amount: "asc" },
      },
    },
  });

  const gross = orders.reduce((sum, order) => sum + order.grossValue, 0);
  const net = orders.reduce((sum, order) => sum + order.netToFarmer, 0);
  const fees = orders.reduce((sum, order) => sum + order.platformFee, 0);
  const freight = orders.reduce((sum, order) => sum + order.transportCost, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Transactions"
        title="Orders"
        description="Confirmed transactions created when you accept an offer or award an auction bid."
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <Stat label="Orders" value={orders.length} sub={`${formatDate(new Date())}`} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Gross value" value={formatINR(gross)} />
        </div>
        <div className="border-t border-ivory-200 p-4 sm:border-t-0">
          <Stat label="Fees + freight" value={formatINR(fees + freight)} sub="platform fee 1.5%" />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 sm:border-l-0 sm:border-t-0">
          <Stat label="Net to you" value={formatINR(net)} tone="forest" />
        </div>
      </Panel>

      {orders.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="No orders yet"
            description="Accept an offer or award an auction bid and the confirmed order appears here with its full cost breakdown."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const transportRequest = transportRequests.find((request) => request.orderId === order.id);
            const hasRequest = Boolean(transportRequest);
            const distance = distanceKm(
              { lat: order.listing.lat, lng: order.listing.lng },
              { lat: order.buyer.lat, lng: order.buyer.lng },
            );
            return (
              <Panel key={order.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-200 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11.5px] font-medium text-charcoal">{order.orderNo}</p>
                    <Pill tone={STATUS_TONE[order.status] ?? "neutral"}>
                      {order.status.replace("_", " ").toLowerCase()}
                    </Pill>
                    {order.isDemo ? <DemoTag /> : null}
                    {order.auctionId ? <Pill tone="gold">from auction</Pill> : null}
                  </div>
                  <p className="text-[10.5px] text-charcoal-400">{formatDate(order.createdAt)}</p>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-[1.4fr_1fr]">
                  <div>
                    <p className="text-[13px] font-semibold text-charcoal">
                      {order.listing.commodity}
                      <span className="ml-1.5 text-[11.5px] font-normal text-charcoal-400">
                        {formatNumber(order.quantity)} kg at {formatINR(order.pricePerUnit)}/kg
                      </span>
                    </p>
                    <p className="mt-1 text-[11.5px] text-charcoal-500">
                      Buyer: {order.buyer.business?.businessName ?? order.buyer.name}
                      {order.buyer.district ? ` · ${order.buyer.district}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-charcoal-400">
                      {order.pickupPreference === "PICKUP"
                        ? `Pickup from ${order.listing.location}`
                        : "Delivery requested by the buyer"}
                      {distance != null ? ` · ${distance} km` : ""}
                    </p>

                    {order.delivery ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-[4px] bg-info-soft px-2 py-1 text-[11px] text-info">
                        <Truck className="size-3" aria-hidden />
                        {order.delivery.transporter.name} ·{" "}
                        {order.delivery.status.replace(/_/g, " ").toLowerCase()} ·{" "}
                        {formatINR(order.delivery.amount)}
                      </p>
                    ) : transportRequest && transportRequest.quotes.length > 0 ? (
                      <TransportQuotes
                        requestId={transportRequest.id}
                        status={transportRequest.status}
                        quotes={transportRequest.quotes.map((quote) => ({
                          id: quote.id,
                          amount: quote.amount,
                          etaHours: quote.etaHours,
                          message: quote.message,
                          status: quote.status,
                          transporter: {
                            name: quote.transporter.name,
                            verified: quote.transporter.verified,
                            vehicleType: quote.transporter.transporter?.vehicleType ?? null,
                          },
                        }))}
                      />
                    ) : (
                      <div className="mt-2">
                        <TransportRequestButton
                          orderId={order.id}
                          pickupLocation={order.listing.location}
                          defaultDrop={
                            order.buyer.village ?? order.buyer.district ?? undefined
                          }
                          quantityKg={order.quantity}
                          distanceKm={distance}
                          hasRequest={hasRequest}
                        />
                      </div>
                    )}
                  </div>

                  <dl className="space-y-1 rounded-[5px] bg-ivory/70 p-2.5 text-[11.5px]">
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">Gross</dt>
                      <dd className="font-medium text-charcoal tabular">{formatINR(order.grossValue)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">Platform fee</dt>
                      <dd className="text-charcoal-500 tabular">−{formatINR(order.platformFee)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">Freight</dt>
                      <dd className="text-charcoal-500 tabular">−{formatINR(order.transportCost)}</dd>
                    </div>
                    <div className="mt-1 flex justify-between border-t border-ivory-300 pt-1">
                      <dt className="font-semibold text-charcoal">Net to you</dt>
                      <dd className="font-display text-[14px] font-bold text-forest-800 tabular">
                        {formatINR(order.netToFarmer)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
