import type { Metadata } from "next";
import { Truck } from "lucide-react";

import { DeliveryStatusControls } from "@/components/transporter/delivery-status-controls";
import { Panel, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DELIVERY_STATUS_LABEL, type DeliveryStatus } from "@/lib/domain";
import { formatDateTime, formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "My deliveries" };
export const dynamic = "force-dynamic";

const TONE: Record<string, "success" | "info" | "gold" | "neutral" | "danger"> = {
  ASSIGNED: "gold",
  PICKUP_SCHEDULED: "gold",
  PICKED_UP: "info",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export default async function TransporterDeliveriesPage() {
  const user = await requireRole("TRANSPORTER");

  const deliveries = await db.delivery.findMany({
    where: { transporterId: user.id },
    include: {
      request: { include: { requester: true } },
      order: { include: { listing: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const active = deliveries.filter((d) => d.status !== "DELIVERED" && d.status !== "CANCELLED");
  const done = deliveries.filter((d) => d.status === "DELIVERED");
  const value = deliveries.reduce((sum, d) => sum + d.amount, 0);
  const kg = deliveries.reduce((sum, d) => sum + d.request.quantityKg, 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Deliveries"
        title="My deliveries"
        description="Update the status at each step so the farmer and buyer can see where their produce is. These are manual updates, not GPS tracking."
      />

      <Panel className="grid grid-cols-3 divide-ivory-200 sm:divide-x">
        <div className="p-4">
          <Stat label="Active" value={active.length} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Completed" value={done.length} />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Quoted value" value={formatINR(value)} sub={`${formatNumber(kg)} kg moved`} tone="forest" />
        </div>
      </Panel>

      {deliveries.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Truck className="size-5" />}
            title="No deliveries assigned"
            description="Once a requester selects your quote, the delivery appears here with a status flow."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Panel key={delivery.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-charcoal">
                      {delivery.request.pickupLocation} → {delivery.request.dropLocation}
                    </p>
                    <Pill tone={TONE[delivery.status] ?? "neutral"}>
                      {DELIVERY_STATUS_LABEL[delivery.status as DeliveryStatus]}
                    </Pill>
                  </div>
                  <p className="mt-1 text-[11.5px] text-charcoal-500">
                    {formatNumber(delivery.request.quantityKg)} kg
                    {delivery.order ? ` · ${delivery.order.listing.commodity}` : ""} ·{" "}
                    {formatINR(delivery.amount)}
                    {delivery.request.distanceKm ? ` · ~${delivery.request.distanceKm} km` : ""}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-charcoal-400">
                    Requester: {delivery.request.requester.name}
                    {delivery.request.pickupAt ? ` · pickup ${formatDateTime(delivery.request.pickupAt)}` : ""}
                    {delivery.pickedUpAt ? ` · picked up ${formatDateTime(delivery.pickedUpAt)}` : ""}
                    {delivery.deliveredAt ? ` · delivered ${formatDateTime(delivery.deliveredAt)}` : ""}
                  </p>
                  {delivery.request.notes ? (
                    <p className="mt-1.5 rounded-[4px] bg-ivory px-2 py-1 text-[11px] leading-relaxed text-charcoal-500">
                      {delivery.request.notes}
                    </p>
                  ) : null}
                </div>
                <DeliveryStatusControls deliveryId={delivery.id} status={delivery.status} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
