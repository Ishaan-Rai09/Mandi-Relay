"use client";

import { Crosshair, Loader2, MapPin } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { saveOnboardingAction } from "@/lib/actions/auth";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABEL, VEHICLE_LABEL, VEHICLE_TYPES, type Role } from "@/lib/domain";
import { IDLE } from "@/lib/schemas";

const STATES = [
  "Punjab",
  "Haryana",
  "Chandigarh",
  "Delhi",
  "Uttar Pradesh",
  "Rajasthan",
  "Himachal Pradesh",
  "Uttarakhand",
];

export function OnboardingForm({ role, defaultName }: { role: Role; defaultName: string }) {
  const [state, action, pending] = useActionState(saveOnboardingAction, IDLE);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("This browser cannot share a location. You can still fill the fields by hand.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Distance filters will use your district instead."
            : "Could not read your location. You can continue without it.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />

      <section className="rounded-[8px] border border-ivory-300 bg-white p-4 sm:p-5">
        <h2 className="font-display text-[15px] font-bold text-charcoal">Where are you based?</h2>
        <p className="mt-0.5 text-[12px] text-charcoal-500">
          This sets your default pickup location and how distances are calculated.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="State" htmlFor="state" error={state.errors?.state?.[0]} required>
            <Select id="state" name="state" defaultValue="Punjab" required>
              {STATES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="District" htmlFor="district" error={state.errors?.district?.[0]} required>
            <Input id="district" name="district" placeholder="SAS Nagar" required />
          </Field>
          <Field
            label="Village, town or city"
            htmlFor="village"
            error={state.errors?.village?.[0]}
            required
          >
            <Input id="village" name="village" placeholder="Kharar" required />
          </Field>
          <Field label="Preferred language" htmlFor="language" required>
            <Select id="language" name="language" defaultValue="hi">
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="en">English</option>
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[5px] border border-dashed border-sage/40 bg-ivory/60 px-3 py-2.5">
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex items-center gap-1.5 rounded-[4px] border border-ivory-300 bg-white px-2.5 py-1.5 text-[12px] font-medium text-charcoal transition-colors hover:border-forest/30"
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Crosshair className="size-3.5 text-forest-600" aria-hidden />
            )}
            {coords ? "Update precise location" : "Use my approximate location"}
          </button>
          <p className="text-[11px] leading-relaxed text-charcoal-400">
            {coords ? (
              <span className="inline-flex items-center gap-1 text-forest-700">
                <MapPin className="size-3" aria-hidden /> {coords.lat}, {coords.lng}
              </span>
            ) : (
              "Optional. Only the approximate point is stored, and it is never shown publicly."
            )}
          </p>
        </div>
        {locationError ? (
          <p className="mt-2 text-[11.5px] text-warning" role="status">
            {locationError}
          </p>
        ) : null}
      </section>

      {role === "FARMER" ? (
        <section className="rounded-[8px] border border-ivory-300 bg-white p-4 sm:p-5">
          <h2 className="font-display text-[15px] font-bold text-charcoal">About your farm</h2>
          <p className="mt-0.5 text-[12px] text-charcoal-500">
            Helps buyers understand what you usually bring to market.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Farm or producer name" htmlFor="farmName">
              <Input id="farmName" name="farmName" placeholder={`${defaultName}'s farm`} />
            </Field>
            <Field label="Area under cultivation" htmlFor="sizeAcres" hint="acres">
              <Input id="sizeAcres" name="sizeAcres" type="number" min="0" step="0.5" placeholder="6" />
            </Field>
            <Field
              label="Main produce categories"
              htmlFor="primaryCrops"
              hint="comma separated"
              className="sm:col-span-2"
            >
              <Input
                id="primaryCrops"
                name="primaryCrops"
                placeholder="Tomatoes, Potatoes, Capsicum"
              />
            </Field>
          </div>
        </section>
      ) : null}

      {role === "BUYER" ? (
        <section className="rounded-[8px] border border-ivory-300 bg-white p-4 sm:p-5">
          <h2 className="font-display text-[15px] font-bold text-charcoal">About your business</h2>
          <p className="mt-0.5 text-[12px] text-charcoal-500">
            We use this to surface lots you are likely to want.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Business name" htmlFor="businessName">
              <Input id="businessName" name="businessName" placeholder="Verma Fresh Vegetables" />
            </Field>
            <Field label="Business type" htmlFor="businessType">
              <Select id="businessType" name="businessType" defaultValue="RETAILER">
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BUSINESS_TYPE_LABEL[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Commodities you buy"
              htmlFor="preferredCommodities"
              hint="comma separated"
              className="sm:col-span-2"
            >
              <Input
                id="preferredCommodities"
                name="preferredCommodities"
                placeholder="Tomatoes, Onions, Potatoes"
              />
            </Field>
            <Field label="Typical quantity per order" htmlFor="typicalQuantityKg" hint="kg">
              <Input id="typicalQuantityKg" name="typicalQuantityKg" type="number" min="0" placeholder="250" />
            </Field>
            <Field label="Delivery locations" htmlFor="deliveryLocations" hint="comma separated">
              <Input id="deliveryLocations" name="deliveryLocations" placeholder="Zirakpur, Mohali" />
            </Field>
          </div>
        </section>
      ) : null}

      {role === "TRANSPORTER" ? (
        <section className="rounded-[8px] border border-ivory-300 bg-white p-4 sm:p-5">
          <h2 className="font-display text-[15px] font-bold text-charcoal">Your vehicle</h2>
          <p className="mt-0.5 text-[12px] text-charcoal-500">
            Used to match you with loads you can actually carry.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Vehicle type" htmlFor="vehicleType">
              <Select id="vehicleType" name="vehicleType" defaultValue="TEMPO">
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {VEHICLE_LABEL[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Capacity" htmlFor="capacityKg" hint="kg">
              <Input id="capacityKg" name="capacityKg" type="number" min="0" placeholder="2500" />
            </Field>
            <Field label="Registration number" htmlFor="registrationNo">
              <Input id="registrationNo" name="registrationNo" placeholder="PB65 C 4821" />
            </Field>
            <Field label="Service areas" htmlFor="serviceAreas" hint="comma separated">
              <Input id="serviceAreas" name="serviceAreas" placeholder="SAS Nagar, Chandigarh, Patiala" />
            </Field>
          </div>
        </section>
      ) : null}

      {state.message && !state.ok ? (
        <p role="alert" className="rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-charcoal-400">
          You can change all of this later from your profile.
        </p>
        <Button type="submit" size="lg" loading={pending}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
