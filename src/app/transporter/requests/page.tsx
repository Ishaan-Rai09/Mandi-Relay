import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";

import { QuoteForm } from "@/components/transporter/quote-form";
import { DemoTag, Panel, Pill } from "@/components/ui/panel";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRANSPORT_RATE_PER_KM_PER_TONNE } from "@/lib/domain";
import { formatDateTime, formatNumber, parseJsonArray, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Load board" };
export const dynamic = "force-dynamic";

export default async function TransporterRequestsPage() {
  const user = await requireRole("TRANSPORTER");

  const [requests, profile] = await Promise.all([
    db.deliveryRequest.findMany({
      where: { status: { in: ["REQUESTED", "QUOTED"] } },
      include: {
        requester: true,
        order: { include: { listing: true } },
        quotes: { include: { transporter: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.transporterProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const areas = parseJsonArray(profile?.serviceAreas);
  const capacity = profile?.capacityKg ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Load board"
        title="Available loads"
        description="Every load posted by a farmer or buyer whose order needs moving. Quote what you can actually deliver."
      />

      {requests.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<PackageSearch className="size-5" />}
            title="No open loads"
            description="Loads appear here when a farmer or buyer requests transport for a confirmed order."
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const myQuote = request.quotes.find((quote) => quote.transporterId === user.id);
            const tonnes = Math.max(request.quantityKg / 1000, 0.25);
            const suggested = Math.max(
              350,
              Math.round(((request.distanceKm ?? 40) * TRANSPORT_RATE_PER_KM_PER_TONNE * tonnes) / 50) * 50,
            );
            const tooHeavy = capacity > 0 && request.quantityKg > capacity;

            return (
              <Panel key={request.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-semibold text-charcoal">
                        {request.pickupLocation} → {request.dropLocation}
                      </p>
                      <Pill tone={request.status === "QUOTED" ? "info" : "gold"}>
                        {request.status === "QUOTED"
                          ? `${request.quotes.length} quote${request.quotes.length === 1 ? "" : "s"}`
                          : "Open"}
                      </Pill>
                    </div>
                    <p className="mt-1 text-[11.5px] text-charcoal-500">
                      {formatNumber(request.quantityKg)} kg
                      {request.distanceKm ? ` · ~${request.distanceKm} km` : ""}
                      {request.order ? ` · ${request.order.listing.commodity}` : ""}
                      {" · "}
                      {request.requester.name}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-charcoal-400">
                      Posted {timeAgo(request.createdAt)}
                      {request.pickupAt ? ` · pickup ${formatDateTime(request.pickupAt)}` : ""}
                      {request.order?.isDemo ? "" : ""}
                    </p>
                    {request.notes ? (
                      <p className="mt-1.5 rounded-[4px] bg-ivory px-2 py-1 text-[11px] leading-relaxed text-charcoal-500">
                        {request.notes}
                      </p>
                    ) : null}
                    {tooHeavy ? (
                      <p className="mt-1.5 text-[11px] text-warning">
                        Exceeds your declared {formatNumber(capacity)} kg capacity.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {myQuote ? (
                      <DemoTag className="opacity-70" />
                    ) : null}
                    <QuoteForm requestId={request.id} suggested={suggested} existing={myQuote?.amount ?? null} />
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-charcoal-400">
        Suggested quotes are indicative — they use ₹{TRANSPORT_RATE_PER_KM_PER_TONNE}/km per tonne as a
        planning guide, not a fixed rate. Your service areas: {areas.join(", ") || "not set"}.
      </p>
    </div>
  );
}
