"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Handshake, Pencil } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { createOfferAction } from "@/lib/actions/offers";
import { IDLE } from "@/lib/schemas";
import { cn, formatINR, formatNumber, round2 } from "@/lib/utils";

export function OfferForm({
  listingId,
  askingPrice,
  availableQuantity,
  unit,
  disabled,
  disabledReason,
}: {
  listingId: string;
  askingPrice: number;
  availableQuantity: number;
  unit: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, action, pending] = useActionState(createOfferAction, IDLE);
  const [quantity, setQuantity] = useState(String(Math.min(availableQuantity, 100)));
  const [price, setPrice] = useState(String(askingPrice));
  const [pickup, setPickup] = useState("PICKUP");
  const [reviewing, setReviewing] = useState(false);

  const qty = Number(quantity) || 0;
  const rate = Number(price) || 0;
  const total = useMemo(() => round2(qty * rate), [qty, rate]);
  const delta = round2((rate - askingPrice) * qty);
  const valid = qty > 0 && qty <= availableQuantity && rate > 0;

  if (state.ok) {
    return (
      <div className="rounded-[6px] border border-success/25 bg-success-soft p-4">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <Check className="size-4" aria-hidden /> Offer sent
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-charcoal-500">
          {state.message} The farmer has been notified. You will see their response under My
          offers — nothing is binding until they accept.
        </p>
        <a
          href="/buyer/bids"
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2"
        >
          Track this offer <ArrowRight className="size-3" aria-hidden />
        </a>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="rounded-[6px] border border-ivory-300 bg-ivory p-4">
        <p className="text-[12.5px] leading-relaxed text-charcoal-500">
          {disabledReason ?? "This lot is not currently open for offers."}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3.5">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="pricePerUnit" value={price} />
      <input type="hidden" name="pickupPreference" value={pickup} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" htmlFor="offer-quantity" hint={unit}>
          <Input
            id="offer-quantity"
            type="number"
            inputMode="decimal"
            min="1"
            max={availableQuantity}
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={reviewing}
            required
          />
        </Field>
        <Field label="Your price" htmlFor="offer-price" hint={`₹/${unit}`}>
          <Input
            id="offer-price"
            type="number"
            inputMode="decimal"
            min="0.5"
            step="0.5"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            disabled={reviewing}
            required
          />
        </Field>
      </div>

      {state.errors ? (
        <p className="text-[11.5px] text-danger" role="alert">
          {Object.values(state.errors).flat()[0]}
        </p>
      ) : null}
      {state.message && !state.ok ? (
        <p className="text-[11.5px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="rounded-[5px] border border-ivory-300 bg-ivory/70 px-3 py-2.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-charcoal-500">Offer value</span>
          <span className="font-display text-[15px] font-bold text-charcoal tabular">{formatINR(total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="text-charcoal-400">Against asking price</span>
          <span className={cn("tabular", delta < 0 ? "text-danger" : "text-forest-700")}>
            {delta === 0 ? "at the ask" : `${delta < 0 ? "−" : "+"}${formatINR(Math.abs(delta))}`}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {reviewing ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="rounded-[5px] border border-forest/25 bg-forest-50 p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-forest-700">
                Confirm your offer
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-charcoal">
                {formatNumber(qty)} {unit} at {formatINR(rate)}/{unit} — total{" "}
                <span className="font-semibold">{formatINR(total)}</span>,{" "}
                {pickup === "PICKUP" ? "picked up from the farm" : "delivered to you"}.
              </p>
            </div>

            <Field label="Pickup or delivery" htmlFor="pickupPreference">
              <Select
                id="pickupPreference"
                value={pickup}
                onChange={(event) => setPickup(event.target.value)}
              >
                <option value="PICKUP">I will collect from the farm</option>
                <option value="DELIVERY">Ask the farmer to arrange delivery</option>
              </Select>
            </Field>

            {pickup === "DELIVERY" ? (
              <Field label="Delivery location" htmlFor="deliveryLocation">
                <Input
                  id="deliveryLocation"
                  name="deliveryLocation"
                  placeholder="Shop address, city"
                />
              </Field>
            ) : null}

            <Field label="Message to the farmer" htmlFor="message" hint="optional">
              <Textarea
                id="message"
                name="message"
                rows={2}
                placeholder="When you can pick up, crate preference, quality expectations…"
              />
            </Field>

            <Checkbox
              name="requestsNegotiation"
              label="I am open to negotiation"
              description="The farmer may reply with a counteroffer instead of declining."
            />

            <div className="flex items-center gap-2">
              <Button type="submit" loading={pending} className="flex-1" icon={<Handshake className="size-4" />}>
                Send offer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setReviewing(false)} icon={<Pencil className="size-3.5" />}>
                Edit
              </Button>
            </div>
            <p className="text-[10.5px] leading-relaxed text-charcoal-400">
              Sending an offer is a commercial intent, not a payment. No money moves through
              Mandi Relay in this build.
            </p>
          </motion.div>
        ) : (
          <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              type="button"
              className="w-full"
              disabled={!valid}
              onClick={() => setReviewing(true)}
              icon={<ArrowRight className="size-4" />}
            >
              Review offer
            </Button>
            <p className="mt-2 text-[10.5px] leading-relaxed text-charcoal-400">
              You will see a summary before anything is sent.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
