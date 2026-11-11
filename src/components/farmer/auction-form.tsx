"use client";

import { Gavel, Info } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createAuctionAction } from "@/lib/actions/auctions";
import { IDLE } from "@/lib/schemas";
import { formatINR } from "@/lib/utils";

export function AuctionForm({
  listingId,
  availableQuantity,
  askingPrice,
}: {
  listingId: string;
  availableQuantity: number;
  askingPrice: number;
}) {
  const [state, action, pending] = useActionState(createAuctionAction, IDLE);
  const [price, setPrice] = useState(String(askingPrice));
  const [quantity, setQuantity] = useState(String(availableQuantity));

  if (state.ok) {
    return (
      <div className="space-y-2 rounded-[6px] border border-gold/40 bg-gold-50 p-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-gold-700">
          <Gavel className="size-4" aria-hidden /> Auction is live
        </p>
        <p className="text-[12px] leading-relaxed text-charcoal-500">{state.message}</p>
        <a
          href={state.data?.auctionId ? `/farmer/auctions/${String(state.data.auctionId)}` : "/farmer/auctions"}
          className="inline-block text-[12px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2"
        >
          Open the auction console
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3 p-4">
      <input type="hidden" name="listingId" value={listingId} />

      <p className="text-[11.5px] leading-relaxed text-charcoal-500">
        Turn this lot into a timed auction. The listing moves to Reserved while bidding runs, and
        you choose whether to award the winning bid when it closes.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Lot quantity" htmlFor="auction-quantity" hint="kg" required error={state.errors?.quantity?.[0]}>
          <Input
            id="auction-quantity"
            name="quantity"
            type="number"
            min="1"
            max={availableQuantity}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </Field>
        <Field label="Starting price" htmlFor="auction-start" hint="₹/kg" required error={state.errors?.startingPrice?.[0]}>
          <Input
            id="auction-start"
            name="startingPrice"
            type="number"
            min="0.5"
            step="0.5"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </Field>
        <Field label="Minimum increment" htmlFor="auction-increment" hint="₹/kg" required>
          <Input id="auction-increment" name="minIncrement" type="number" min="0.5" step="0.5" defaultValue="1" required />
        </Field>
        <Field label="Duration" htmlFor="auction-duration" required>
          <Select id="auction-duration" name="durationHours" defaultValue="24">
            <option value="2">2 hours</option>
            <option value="6">6 hours</option>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
          </Select>
        </Field>
      </div>

      <Field label="Pickup note" htmlFor="auction-pickup" hint="optional">
        <Textarea
          id="auction-pickup"
          name="pickupNote"
          rows={2}
          placeholder="Where and when the winner collects, who provides crates…"
        />
      </Field>

      <Field label="Eligible buyer criteria" htmlFor="auction-criteria" hint="optional">
        <Input
          id="auction-criteria"
          name="buyerCriteria"
          placeholder="Within 100 km, collection within 24 hours"
        />
      </Field>

      <div className="rounded-[4px] bg-ivory px-2.5 py-2 text-[11px] leading-relaxed text-charcoal-500">
        <span className="flex items-start gap-1.5">
          <Info className="mt-0.5 size-3 shrink-0 text-sage" aria-hidden />
          At the starting price, the lot is worth {formatINR(Number(price || 0) * Number(quantity || 0))}.
          Every bid is validated on the server against the increment rule and the closing time.
        </span>
      </div>

      {state.message && !state.ok ? (
        <p className="rounded-[4px] bg-danger-soft px-2.5 py-1.5 text-[11.5px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="gold" loading={pending} icon={<Gavel className="size-4" />}>
        Start auction
      </Button>
    </form>
  );
}
