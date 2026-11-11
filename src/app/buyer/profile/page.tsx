import type { Metadata } from "next";
import { BadgeCheck, ShieldQuestion } from "lucide-react";

import { ProfileForm } from "@/components/shared/profile-form";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { BUSINESS_TYPE_LABEL, VERIFICATION_LABEL, type BusinessType } from "@/lib/domain";
import { formatDate, maskPhone, parseJsonArray } from "@/lib/utils";

export const metadata: Metadata = { title: "Business profile" };
export const dynamic = "force-dynamic";

export default async function BuyerProfilePage() {
  const sessionUser = await requireRole("BUYER");

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { business: true },
  });
  if (!user) return null;

  const business = user.business;
  const verification = business?.verificationStatus ?? "UNVERIFIED";
  const preferred = parseJsonArray(business?.preferredCommodities);
  const areas = parseJsonArray(business?.deliveryLocations);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Profile"
        title="Business profile"
        description="What farmers see before they respond to your offer, and the preferences that drive your recommendations."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-forest text-[15px] font-bold text-white">
                {(business?.businessName ?? user.name).slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold text-charcoal">
                  {business?.businessName ?? user.name}
                </p>
                <p className="text-[11.5px] text-charcoal-400">
                  {business ? BUSINESS_TYPE_LABEL[business.businessType as BusinessType] : "Buyer"}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-charcoal-400">{maskPhone(user.phone)}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-ivory-200 pt-3 text-[12px]">
              <div className="flex items-center justify-between">
                <dt className="text-sage">Verification</dt>
                <dd>
                  <Pill tone={verification === "VERIFIED" ? "success" : verification === "PENDING" ? "warning" : "neutral"}>
                    {VERIFICATION_LABEL[verification]}
                  </Pill>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sage">Location</dt>
                <dd className="font-medium text-charcoal">
                  {[user.village, user.district, user.state].filter(Boolean).join(", ") || "Not set"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sage">Member since</dt>
                <dd className="font-medium text-charcoal">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>

            {preferred.length > 0 ? (
              <div className="mt-3 border-t border-ivory-200 pt-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-sage">Commodities</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preferred.map((item) => (
                    <span
                      key={item}
                      className="rounded-[3px] border border-ivory-300 bg-ivory px-1.5 py-0.5 text-[10.5px] text-charcoal-500"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {areas.length > 0 ? (
              <div className="mt-3 border-t border-ivory-200 pt-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-sage">Delivery areas</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {areas.map((item) => (
                    <span
                      key={item}
                      className="rounded-[3px] border border-ivory-300 bg-ivory px-1.5 py-0.5 text-[10.5px] text-charcoal-500"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-4">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              {user.verified ? (
                <BadgeCheck className="size-3.5 text-forest-600" aria-hidden />
              ) : (
                <ShieldQuestion className="size-3.5 text-sage" aria-hidden />
              )}
              What farmers see
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              Farmers see your business name, type, district and verification status beside your
              offers. Your phone number is only shared once an order is confirmed.
            </p>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Edit details" />
          <div className="p-4">
            <ProfileForm
              role="BUYER"
              defaults={{
                name: user.name,
                language: user.language,
                state: user.state ?? "Punjab",
                district: user.district ?? "",
                village: user.village ?? "",
                farmName: "",
                sizeAcres: "",
                primaryCrops: "",
                businessName: business?.businessName ?? "",
                businessType: business?.businessType ?? "RETAILER",
                preferredCommodities: preferred.join(", "),
                typicalQuantityKg: business?.typicalQuantityKg != null ? String(business.typicalQuantityKg) : "",
                deliveryLocations: areas.join(", "),
                vehicleType: "",
                capacityKg: "",
                registrationNo: "",
                serviceAreas: "",
              }}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
