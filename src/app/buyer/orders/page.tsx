import type { Metadata } from "next";
import { ClipboardList, Truck } from "lucide-react";

import { TransportRequestButton } from "@/components/shared/transport-request";
import { TransportQuotes } from "@/components/shared/transport-quotes";
import { Panel, Pill } from "@/components/ui/panel";
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

export default async function BuyerOrdersPage() {
  const user = await requireRole("BUYER");

  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    include: {
      farmer: { include: { farm: true } },
      listing: true,
      delivery: { include: { transporter: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const [transportRequests, buyerCoords] = await Promise.all([
    db.deliveryRequest.findMany({
      where: { requesterId: user.id },
      include: {
        quotes: {
          include: { transporter: { include: { transporter: true } } },
          orderBy: { amount: "asc" },
        },
      },
    }),
    db.user.findUnique({ where: { id: user.id }, select: { lat: true, lng: true } }),
  ]);

  const committed = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.grossValue, 0);
  const kg = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + order.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Transactions"
        title="Orders"
        description="Confirmed purchases. Inspect and weigh the lot at pickup — Mandi Relay records the agreement, it does not guarantee the produce."
      />

      <Panel className="grid grid-cols-3 divide-ivory-200 sm:divide-x">
        <div className="p-4">
          <Stat label="Orders" value={orders.length} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Committed value" value={formatINR(committed)} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Quantity" value={`${formatNumber(kg)} kg`} tone="forest" />
        </div>
      </Panel>

      {orders.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="No orders yet"
            description="When a farmer accepts your offer, or you win an auction, the confirmed order appears here."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const transportRequest = transportRequests.find((request) => request.orderId === order.id);
            const hasRequest = Boolean(transportRequest);
            const distance = distanceKm(
              { lat: order.listing.lat, lng: order.listing.lng },
              { lat: buyerCoords?.lat ?? null, lng: buyerCoords?.lng ?? null },
            );
            return (
              <Panel key={order.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-200 px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-[11.5px] font-medium text-charcoal">{order.orderNo}</p>
                    <Pill tone={STATUS_TONE[order.status] ?? "neutral"}>
                      {order.status.replace("_", " ").toLowerCase()}
                    </Pill>
                    
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
                      Farmer: {order.farmer.farm?.farmName ?? order.farmer.name}
                      {order.farmer.district ? ` · ${order.farmer.district}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-charcoal-400">
                      Pickup: {order.listing.location}
                      {order.pickupPreference === "DELIVERY" ? " · you requested delivery" : ""}
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
                          defaultDrop={[user.village, user.district].filter(Boolean).join(", ")}
                          quantityKg={order.quantity}
                          distanceKm={distance}
                          hasRequest={hasRequest}
                        />
                      </div>
                    )}
                  </div>

                  <dl className="space-y-1 rounded-[5px] bg-ivory/70 p-2.5 text-[11.5px]">
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">Lot value</dt>
                      <dd className="font-medium text-charcoal tabular">{formatINR(order.grossValue)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-charcoal-500">Freight (est.)</dt>
                      <dd className="text-charcoal-500 tabular">{formatINR(order.transportCost)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-ivory-300 pt-1">
                      <dt className="font-semibold text-charcoal">You pay farmer</dt>
                      <dd className="font-display text-[14px] font-bold text-forest-800 tabular">
                        {formatINR(order.grossValue)}
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
