import type { Metadata } from "next";
import { BadgeCheck, ShieldQuestion } from "lucide-react";

import { ProfileForm } from "@/components/shared/profile-form";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { VERIFICATION_LABEL } from "@/lib/domain";
import { formatDate, maskPhone, parseJsonArray } from "@/lib/utils";

export const metadata: Metadata = { title: "Farm profile" };
export const dynamic = "force-dynamic";

export default async function FarmerProfilePage() {
  const sessionUser = await requireRole("FARMER");

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { farm: true },
  });
  if (!user) return null;

  const verification = user.farm?.verificationStatus ?? "UNVERIFIED";
  const crops = parseJsonArray(user.farm?.primaryCrops);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Profile"
        title="Farm profile"
        description="What buyers see about you, and the details that drive your defaults when listing."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-forest text-[15px] font-bold text-white">
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold text-charcoal">{user.name}</p>
                <p className="text-[11.5px] text-charcoal-400">
                  {user.farm?.farmName ?? "Individual producer"}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-charcoal-400">
                  {maskPhone(user.phone)}
                </p>
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
                <dt className="text-sage">Land</dt>
                <dd className="font-medium text-charcoal">
                  {user.farm?.sizeAcres ? `${user.farm.sizeAcres} acres` : "Not set"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sage">Member since</dt>
                <dd className="font-medium text-charcoal">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>

            {crops.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1 border-t border-ivory-200 pt-3">
                {crops.map((crop) => (
                  <span
                    key={crop}
                    className="rounded-[3px] border border-ivory-300 bg-ivory px-1.5 py-0.5 text-[10.5px] text-charcoal-500"
                  >
                    {crop}
                  </span>
                ))}
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
              What verification means
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              A verified badge means the platform has reviewed your phone number and basic profile
              details. It is not a quality certification for your produce, and buyers are told that
              grades are stated by you unless independently checked.
            </p>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Edit details" description="Saved changes apply to future listings and offers." />
          <div className="p-4">
            <ProfileForm
              role="FARMER"
              defaults={{
                name: user.name,
                language: user.language,
                state: user.state ?? "Punjab",
                district: user.district ?? "",
                village: user.village ?? "",
                farmName: user.farm?.farmName ?? "",
                sizeAcres: user.farm?.sizeAcres != null ? String(user.farm.sizeAcres) : "",
                primaryCrops: crops.join(", "),
                businessName: "",
                businessType: "",
                preferredCommodities: "",
                typicalQuantityKg: "",
                deliveryLocations: "",
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
