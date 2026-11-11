import type { Metadata } from "next";

import { ProfileForm } from "@/components/shared/profile-form";
import { Panel, PanelHeader, Pill } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { VEHICLE_LABEL, VERIFICATION_LABEL, type VehicleType } from "@/lib/domain";
import { formatNumber, maskPhone, parseJsonArray } from "@/lib/utils";

export const metadata: Metadata = { title: "Vehicle profile" };
export const dynamic = "force-dynamic";

export default async function TransporterProfilePage() {
  const sessionUser = await requireRole("TRANSPORTER");

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    include: { transporter: true },
  });
  if (!user) return null;

  const profile = user.transporter;
  const verification = profile?.verificationStatus ?? "UNVERIFIED";
  const areas = parseJsonArray(profile?.serviceAreas);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <PageHeader
        eyebrow="Profile"
        title="Vehicle profile"
        description="Capacity and service areas decide which loads appear on your board."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-charcoal text-[15px] font-bold text-ivory">
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold text-charcoal">{user.name}</p>
                <p className="text-[11.5px] text-charcoal-400">
                  {profile ? VEHICLE_LABEL[profile.vehicleType as VehicleType] : "Vehicle not set"}
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
                <dt className="text-sage">Capacity</dt>
                <dd className="font-medium text-charcoal">
                  {profile ? `${formatNumber(profile.capacityKg)} kg` : "Not set"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sage">Registration</dt>
                <dd className="font-mono text-[11.5px] font-medium text-charcoal">
                  {profile?.registrationNo ?? "—"}
                </dd>
              </div>
            </dl>

            {areas.length > 0 ? (
              <div className="mt-3 border-t border-ivory-200 pt-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-sage">Service areas</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {areas.map((area) => (
                    <span
                      key={area}
                      className="rounded-[3px] border border-ivory-300 bg-ivory px-1.5 py-0.5 text-[10.5px] text-charcoal-500"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
              What this profile does
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              Your phone number is shared with a requester only after they select your quote. Loads
              heavier than your declared capacity are flagged on the board rather than hidden.
            </p>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Edit vehicle details" />
          <div className="p-4">
            <ProfileForm
              role="TRANSPORTER"
              defaults={{
                name: user.name,
                language: user.language,
                state: user.state ?? "Punjab",
                district: user.district ?? "",
                village: user.village ?? "",
                farmName: "",
                sizeAcres: "",
                primaryCrops: "",
                businessName: "",
                businessType: "",
                preferredCommodities: "",
                typicalQuantityKg: "",
                deliveryLocations: "",
                vehicleType: profile?.vehicleType ?? "TEMPO",
                capacityKg: profile?.capacityKg != null ? String(profile.capacityKg) : "",
                registrationNo: profile?.registrationNo ?? "",
                serviceAreas: areas.join(", "),
              }}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
