"use client";

import { Truck } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { requestTransportAction } from "@/lib/actions/delivery";
import { IDLE } from "@/lib/schemas";

export function TransportRequestButton({
  orderId,
  pickupLocation,
  defaultDrop,
  quantityKg,
  distanceKm,
  hasRequest,
}: {
  orderId: string;
  pickupLocation: string;
  defaultDrop?: string;
  quantityKg: number;
  distanceKm?: number | null;
  hasRequest: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestTransportAction, IDLE);

  if (hasRequest) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] text-charcoal-400">
        <Truck className="size-3" aria-hidden /> Transport requested
      </span>
    );
  }

  if (state.ok) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-success">
        <Truck className="size-3" aria-hidden /> {state.message}
      </span>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-[3px] border border-ivory-300 px-1.5 py-0.5 text-[10.5px] font-medium text-charcoal-500 transition-colors hover:border-forest/30 hover:text-forest-700"
        >
          <Truck className="size-3" aria-hidden /> Request transport
        </button>
      ) : (
        <form action={action} className="mt-1.5 w-full max-w-md space-y-2 rounded-[5px] border border-ivory-300 bg-ivory/70 p-2.5">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="quantityKg" value={quantityKg} />
          <input type="hidden" name="distanceKm" value={distanceKm ?? ""} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Pickup" htmlFor={`pickup-${orderId}`} required>
              <Input id={`pickup-${orderId}`} name="pickupLocation" defaultValue={pickupLocation} className="h-8 text-[12px]" required />
            </Field>
            <Field label="Drop" htmlFor={`drop-${orderId}`} required>
              <Input id={`drop-${orderId}`} name="dropLocation" defaultValue={defaultDrop ?? ""} placeholder="Buyer address" className="h-8 text-[12px]" required />
            </Field>
          </div>
          <Field label="Pickup by" htmlFor={`pickupAt-${orderId}`} hint="optional">
            <Input id={`pickupAt-${orderId}`} name="pickupAt" type="datetime-local" className="h-8 text-[12px]" />
          </Field>
          <Field label="Notes" htmlFor={`notes-${orderId}`} hint="optional">
            <Textarea id={`notes-${orderId}`} name="notes" rows={2} placeholder="Crate count, loading help…" className="text-[12px]" />
          </Field>
          {state.message && !state.ok ? (
            <p className="text-[11px] text-danger" role="alert">
              {state.message}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" loading={pending}>
              Post to load board
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-[10px] leading-relaxed text-charcoal-400">
            Transporters quote on the load. You choose which quote to accept; nothing is booked
            automatically.
          </p>
        </form>
      )}
    </div>
  );
}
