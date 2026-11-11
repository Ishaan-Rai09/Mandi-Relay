import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bike, MapPin, Package, Truck } from "lucide-react";

import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DELIVERY_STATUS_LABEL, VEHICLE_LABEL, type DeliveryStatus, type VehicleType } from "@/lib/domain";
import { formatDateTime, formatINR, formatNumber, parseJsonArray, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Transporter dashboard" };
export const dynamic = "force-dynamic";

export default async function TransporterDashboard() {
  const user = await requireRole("TRANSPORTER");

  const [profile, openRequests, myDeliveries, myQuotes] = await Promise.all([
    db.transporterProfile.findUnique({ where: { userId: user.id } }),
    db.deliveryRequest.findMany({
      where: { status: { in: ["REQUESTED", "QUOTED"] } },
      include: { requester: true, _count: { select: { quotes: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.delivery.findMany({
      where: { transporterId: user.id },
      include: { request: true, order: { include: { listing: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.deliveryQuote.findMany({
      where: { transporterId: user.id },
      select: { status: true, amount: true },
    }),
  ]);

  const active = myDeliveries.filter((delivery) => delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED");
  const completed = myDeliveries.filter((delivery) => delivery.status === "DELIVERED");
  const selected = myQuotes.filter((quote) => quote.status === "SELECTED");
  const earnings = selected.reduce((sum, quote) => sum + quote.amount, 0);
  const areas = parseJsonArray(profile?.serviceAreas);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        eyebrow={profile ? VEHICLE_LABEL[profile.vehicleType as VehicleType] : "Transporter workspace"}
        title={`${user.name.split(" ")[0]}'s loads`}
        description={
          profile
            ? `${formatNumber(profile.capacityKg)} kg capacity · ${areas.join(", ") || "service areas not set"}`
            : "Add your vehicle details to receive suitable loads."
        }
        action={<ButtonLink href="/transporter/requests" icon={<Package className="size-4" />}>Load board</ButtonLink>}
      />

      <Panel className="grid grid-cols-2 divide-ivory-200 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <Stat label="Open loads" value={openRequests.length} sub="available to quote" />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat label="Active deliveries" value={active.length} />
        </div>
        <div className="border-t border-ivory-200 p-4 sm:border-t-0">
          <Stat label="Completed" value={completed.length} />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 sm:border-l-0 sm:border-t-0">
          <Stat label="Quoted value" value={formatINR(earnings)} sub={`${selected.length} selected`} tone="forest" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Loads near your service area"
            action={
              <Link href="/transporter/requests" className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline">
                Load board <ArrowRight className="size-3" aria-hidden />
              </Link>
            }
          />
          {openRequests.length === 0 ? (
            <EmptyState compact icon={<Package className="size-4" />} title="No open loads" description="Farmers and buyers post loads here when an order needs moving." />
          ) : (
            <ul className="divide-y divide-ivory-100">
              {openRequests.map((request) => (
                <li key={request.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-charcoal">
                        {request.pickupLocation} → {request.dropLocation}
                      </p>
                      <p className="text-[10.5px] text-charcoal-400">
                        {formatNumber(request.quantityKg)} kg
                        {request.distanceKm ? ` · ~${request.distanceKm} km` : ""} ·{" "}
                        {request._count.quotes} quote{request._count.quotes === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Link
                      href="/transporter/requests"
                      className="shrink-0 rounded-[3px] border border-ivory-300 px-2 py-0.5 text-[10.5px] font-medium text-forest-700 hover:border-forest/30"
                    >
                      Quote
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Active deliveries"
            action={
              <Link href="/transporter/deliveries" className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline">
                All deliveries <ArrowRight className="size-3" aria-hidden />
              </Link>
            }
          />
          {myDeliveries.length === 0 ? (
            <EmptyState compact icon={<Truck className="size-4" />} title="No assignments yet" description="Once a requester selects your quote, the delivery appears here." />
          ) : (
            <ul className="divide-y divide-ivory-100">
              {myDeliveries.map((delivery) => (
                <li key={delivery.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-charcoal">
                        {delivery.order?.listing.commodity ?? "Load"} ·{" "}
                        {delivery.request.pickupLocation} → {delivery.request.dropLocation}
                      </p>
                      <p className="text-[10.5px] text-charcoal-400">
                        {formatINR(delivery.amount)} · assigned {timeAgo(delivery.createdAt)}
                      </p>
                    </div>
                    <Pill tone={delivery.status === "DELIVERED" ? "success" : delivery.status === "IN_TRANSIT" ? "info" : "gold"}>
                      {DELIVERY_STATUS_LABEL[delivery.status as DeliveryStatus]}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Bike className="mt-0.5 size-4 text-forest-600" aria-hidden />
            <div>
              <p className="text-[12.5px] font-medium text-charcoal">Location updates are manual</p>
              <p className="text-[11px] leading-relaxed text-charcoal-500">
                This build records the status you set at each step. It does not claim live GPS
                tracking — no location is streamed from your device.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10.5px] text-charcoal-400">
            <MapPin className="size-3" aria-hidden />
            {profile?.registrationNo ?? "Vehicle not registered"}
          </span>
        </div>
      </Panel>

      {active.length > 0 ? (
        <p className="text-[11px] text-charcoal-400">
          Next pickup: {active[0].request.pickupAt ? formatDateTime(active[0].request.pickupAt) : "not scheduled"} ·{" "}
          {active[0].request.pickupLocation}
        </p>
      ) : null}
    </div>
  );
}
