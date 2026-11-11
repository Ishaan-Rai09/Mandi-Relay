"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { updateListingAction } from "@/lib/actions/listings";
import { IDLE } from "@/lib/schemas";

export interface EditableListing {
  id: string;
  commodity: string;
  variety: string | null;
  categorySlug: string;
  quantity: number;
  availableQuantity: number;
  askingPrice: number;
  availableFrom: string;
  location: string;
  district: string;
  state: string;
  description: string | null;
  grade: string | null;
  pickupOnly: boolean;
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ListingEditor({
  listing,
  categories,
}: {
  listing: EditableListing;
  categories: { slug: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateListingAction, IDLE);
  const committed = listing.quantity - listing.availableQuantity;

  return (
    <form action={action} className="space-y-3.5 p-4">
      <input type="hidden" name="listingId" value={listing.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Produce" htmlFor="edit-commodity" required error={state.errors?.commodity?.[0]}>
          <Input id="edit-commodity" name="commodity" defaultValue={listing.commodity} required />
        </Field>
        <Field label="Category" htmlFor="edit-category" required>
          <Select id="edit-category" name="categorySlug" defaultValue={listing.categorySlug}>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Total quantity"
          htmlFor="edit-quantity"
          hint="kg"
          required
          error={state.errors?.quantity?.[0]}
        >
          <Input
            id="edit-quantity"
            name="quantity"
            type="number"
            min={Math.max(1, committed)}
            step="1"
            defaultValue={listing.quantity}
            required
          />
        </Field>
        <Field label="Asking price" htmlFor="edit-price" hint="₹/kg" required>
          <Input
            id="edit-price"
            name="askingPrice"
            type="number"
            min="0.5"
            step="0.5"
            defaultValue={listing.askingPrice}
            required
          />
        </Field>
        <Field label="Unit" htmlFor="edit-unit">
          <Select id="edit-unit" name="unit" defaultValue="kg">
            <option value="kg">kg</option>
            <option value="quintal">quintal (100 kg)</option>
            <option value="tonne">tonne (1,000 kg)</option>
          </Select>
        </Field>
      </div>

      {committed > 0 ? (
        <p className="rounded-[4px] bg-ivory px-2.5 py-1.5 text-[11px] text-charcoal-500">
          {committed} kg is already committed to orders and stays committed. Available to new buyers
          will be {Math.max(0, Number(listing.quantity) - committed)} kg after this edit.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Available from" htmlFor="edit-available" required>
          <Input
            id="edit-available"
            name="availableFrom"
            type="datetime-local"
            defaultValue={toLocalInput(listing.availableFrom)}
            required
          />
        </Field>
        <Field label="Variety" htmlFor="edit-variety" hint="optional">
          <Input id="edit-variety" name="variety" defaultValue={listing.variety ?? ""} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <Field label="Pickup location" htmlFor="edit-location" required>
          <Input id="edit-location" name="location" defaultValue={listing.location} required />
        </Field>
        <Field label="District" htmlFor="edit-district" required>
          <Input id="edit-district" name="district" defaultValue={listing.district} required />
        </Field>
      </div>

      <input type="hidden" name="state" value={listing.state} />

      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field label="Grade" htmlFor="edit-grade">
          <Select id="edit-grade" name="grade" defaultValue={listing.grade ?? ""}>
            <option value="">Not stated</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </Select>
        </Field>
        <Field label="Description" htmlFor="edit-description" hint="optional">
          <Textarea
            id="edit-description"
            name="description"
            rows={2}
            defaultValue={listing.description ?? ""}
          />
        </Field>
      </div>

      <Checkbox
        name="pickupOnly"
        defaultChecked={listing.pickupOnly}
        label="Farm-gate pickup only"
        description="Buyers must arrange collection."
      />

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

      <Button type="submit" loading={pending} icon={<Check className="size-4" />}>
        Save changes
      </Button>
    </form>
  );
}
