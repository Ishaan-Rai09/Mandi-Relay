"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { LanguageOptions } from "@/components/i18n/language-options";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { saveProfileAction } from "@/lib/actions/auth";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABEL,
  VEHICLE_LABEL,
  VEHICLE_TYPES,
  type Role,
} from "@/lib/domain";
import { IDLE } from "@/lib/schemas";

export interface ProfileDefaults {
  name: string;
  language: string;
  state: string;
  district: string;
  village: string;
  farmName: string;
  sizeAcres: string;
  primaryCrops: string;
  businessName: string;
  businessType: string;
  preferredCommodities: string;
  typicalQuantityKg: string;
  deliveryLocations: string;
  vehicleType: string;
  capacityKg: string;
  registrationNo: string;
  serviceAreas: string;
}

export function ProfileForm({ role, defaults }: { role: Role; defaults: ProfileDefaults }) {
  const [state, action, pending] = useActionState(saveProfileAction, IDLE);

  return (
    <form action={action} className="space-y-5">
      <section className="space-y-3">
        <h2 className="font-display text-[14px] font-bold text-charcoal">Account</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" htmlFor="profile-name" required error={state.errors?.name?.[0]}>
            <Input id="profile-name" name="name" defaultValue={defaults.name} required />
          </Field>
          <Field label="Preferred language" htmlFor="profile-language">
            <Select id="profile-language" name="language" defaultValue={defaults.language}>
              <LanguageOptions />
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3 border-t border-ivory-200 pt-4">
        <h2 className="font-display text-[14px] font-bold text-charcoal">Location</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="State" htmlFor="profile-state" required>
            <Input id="profile-state" name="state" defaultValue={defaults.state} required />
          </Field>
          <Field label="District" htmlFor="profile-district" required>
            <Input id="profile-district" name="district" defaultValue={defaults.district} required />
          </Field>
          <Field label="Village / town" htmlFor="profile-village" required>
            <Input id="profile-village" name="village" defaultValue={defaults.village} required />
          </Field>
        </div>
      </section>

      {role === "FARMER" ? (
        <section className="space-y-3 border-t border-ivory-200 pt-4">
          <h2 className="font-display text-[14px] font-bold text-charcoal">Farm</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Farm name" htmlFor="profile-farm">
              <Input id="profile-farm" name="farmName" defaultValue={defaults.farmName} />
            </Field>
            <Field label="Area" htmlFor="profile-acres" hint="acres">
              <Input id="profile-acres" name="sizeAcres" type="number" min="0" step="0.5" defaultValue={defaults.sizeAcres} />
            </Field>
            <Field label="Main produce" htmlFor="profile-crops" hint="comma separated" className="sm:col-span-2">
              <Input id="profile-crops" name="primaryCrops" defaultValue={defaults.primaryCrops} />
            </Field>
          </div>
        </section>
      ) : null}

      {role === "BUYER" ? (
        <section className="space-y-3 border-t border-ivory-200 pt-4">
          <h2 className="font-display text-[14px] font-bold text-charcoal">Business</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" htmlFor="profile-business">
              <Input id="profile-business" name="businessName" defaultValue={defaults.businessName} />
            </Field>
            <Field label="Business type" htmlFor="profile-business-type">
              <Select id="profile-business-type" name="businessType" defaultValue={defaults.businessType || "RETAILER"}>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BUSINESS_TYPE_LABEL[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Commodities bought" htmlFor="profile-preferred" hint="comma separated" className="sm:col-span-2">
              <Input id="profile-preferred" name="preferredCommodities" defaultValue={defaults.preferredCommodities} />
            </Field>
            <Field label="Typical quantity" htmlFor="profile-typical" hint="kg">
              <Input id="profile-typical" name="typicalQuantityKg" type="number" min="0" defaultValue={defaults.typicalQuantityKg} />
            </Field>
            <Field label="Delivery locations" htmlFor="profile-delivery" hint="comma separated">
              <Input id="profile-delivery" name="deliveryLocations" defaultValue={defaults.deliveryLocations} />
            </Field>
          </div>
          <p className="text-[10.5px] leading-relaxed text-charcoal-400">
            These preferences drive which lots are surfaced in your dashboard and notifications.
          </p>
        </section>
      ) : null}

      {role === "TRANSPORTER" ? (
        <section className="space-y-3 border-t border-ivory-200 pt-4">
          <h2 className="font-display text-[14px] font-bold text-charcoal">Vehicle</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vehicle type" htmlFor="profile-vehicle">
              <Select id="profile-vehicle" name="vehicleType" defaultValue={defaults.vehicleType || "TEMPO"}>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {VEHICLE_LABEL[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Capacity" htmlFor="profile-capacity" hint="kg">
              <Input id="profile-capacity" name="capacityKg" type="number" min="0" defaultValue={defaults.capacityKg} />
            </Field>
            <Field label="Registration" htmlFor="profile-reg">
              <Input id="profile-reg" name="registrationNo" defaultValue={defaults.registrationNo} />
            </Field>
            <Field label="Service areas" htmlFor="profile-areas" hint="comma separated">
              <Input id="profile-areas" name="serviceAreas" defaultValue={defaults.serviceAreas} />
            </Field>
          </div>
        </section>
      ) : null}

      {state.message ? (
        <p
          className={`rounded-[4px] px-2.5 py-1.5 text-[11.5px] ${
            state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" loading={pending} icon={<Save className="size-4" />}>
        Save profile
      </Button>
      <p className="text-[10.5px] leading-relaxed text-charcoal-400">
        Changes to your name, district or verification do not affect orders already confirmed.
        Verification is reviewed by the platform team; self-declared details are shown as unverified.
      </p>
    </form>
  );
}
