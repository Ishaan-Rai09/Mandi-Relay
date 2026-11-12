"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Clock,
  Handshake,
  MessageSquare,
  Send,
  Star,
  Truck,
  X,
} from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Pill, VerifiedBadge } from "@/components/ui/panel";
import { respondOfferAction } from "@/lib/actions/offers";
import { IDLE } from "@/lib/schemas";
import { cn, formatINR, formatNumber, round2, timeAgo } from "@/lib/utils";

export interface OfferView {
  id: string;
  quantity: number;
  pricePerUnit: number;
  status: string;
  actorRole: string;
  message: string | null;
  pickupPreference: string;
  deliveryLocation: string | null;
  requestsNegotiation: boolean;
  createdAt: string;
  buyer: { name: string; businessName: string | null; verified: boolean; district: string | null };
  listing: {
    id: string;
    commodity: string;
    askingPrice: number;
    unit: string;
    availableQuantity: number;
    location: string;
  };
  transportEstimate: number;
  isBest?: boolean;
  thread?: { id: string; pricePerUnit: number; actorRole: string; createdAt: string; status: string }[];
}

type Mode = "idle" | "accept" | "counter" | "reject";

export function OfferCard({ offer, viewer }: { offer: OfferView; viewer: "FARMER" | "BUYER" }) {
  const [state, action, pending] = useActionState(respondOfferAction, IDLE);
  const [mode, setMode] = useState<Mode>("idle");
  const [price, setPrice] = useState(String(round2(offer.pricePerUnit * 1.03)));

  const gross = round2(offer.pricePerUnit * offer.quantity);
  const platformFee = round2(gross * 0.015);
  const net = round2(gross - platformFee - offer.transportEstimate);
  const delivery = offer.pickupPreference === "DELIVERY";

  const myRole = viewer;
  const myTurn = offer.actorRole !== myRole;
  const open = offer.status === "PENDING" || offer.status === "COUNTERED";
  const actionable = open && myTurn;

  if (state.ok) {
    return (
      <div className="rounded-[8px] border border-success/25 bg-success-soft p-4">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <Check className="size-4" aria-hidden /> {state.message}
        </p>
        {state.data?.orderNo ? (
          <p className="mt-1 text-[12px] text-charcoal-500">
            Order <span className="font-semibold text-charcoal">{String(state.data.orderNo)}</span> is
            confirmed. The buyer has been notified.
          </p>
        ) : null}
        <a
          href={viewer === "FARMER" ? "/farmer/orders" : "/buyer/orders"}
          className="mt-2 inline-block text-[12px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2"
        >
          View orders
        </a>
      </div>
    );
  }

  return (
    <article
      className={cn(
        "rounded-[8px] border bg-white transition-colors",
        offer.isBest && actionable ? "border-gold/60" : "border-ivory-300",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ivory-200 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-100 text-[10px] font-bold text-forest-700">
            {(offer.buyer.businessName ?? offer.buyer.name).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-charcoal">
              {offer.buyer.businessName ?? offer.buyer.name}
            </p>
            <p className="flex items-center gap-1.5 truncate text-[10.5px] text-charcoal-400">
              <VerifiedBadge verified={offer.buyer.verified} />
              {offer.buyer.district ? <span>· {offer.buyer.district}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {offer.isBest && actionable ? (
            <Pill tone="gold">
              <Star className="size-3" aria-hidden /> Highest net
            </Pill>
          ) : null}
          <Pill tone={offer.actorRole === myRole ? "neutral" : "info"}>
            {offer.actorRole === "BUYER" ? "Buyer offer" : "Your counter"}
          </Pill>
        </div>
      </div>

      <div className="grid gap-3 px-3.5 py-3 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[12px] text-charcoal-500">
            <span className="font-semibold text-charcoal">{formatNumber(offer.quantity)} kg</span>{" "}
            of {offer.listing.commodity} at{" "}
            <span className="font-semibold text-charcoal">{formatINR(offer.pricePerUnit)}/kg</span>
          </p>
          <p className="mt-0.5 text-[11px] text-charcoal-400">
            Asking {formatINR(offer.listing.askingPrice)}/kg ·{" "}
            {offer.pricePerUnit >= offer.listing.askingPrice ? (
              <span className="inline-flex items-center gap-0.5 text-forest-700">
                <ArrowUpRight className="size-3" aria-hidden />
                above ask
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-warning">
                <ArrowDownRight className="size-3" aria-hidden />
                {Math.round(((offer.listing.askingPrice - offer.pricePerUnit) / offer.listing.askingPrice) * 100)}% below ask
              </span>
            )}
            {delivery ? (
              <span className="ml-1.5 inline-flex items-center gap-0.5">
                <Truck className="size-3" aria-hidden /> delivery requested
              </span>
            ) : null}
          </p>

          {offer.message ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-[4px] bg-ivory px-2 py-1.5 text-[11.5px] leading-relaxed text-charcoal-500">
              <MessageSquare className="mt-0.5 size-3 shrink-0 text-sage" aria-hidden />
              {offer.message}
            </p>
          ) : null}

          {offer.thread && offer.thread.length > 0 ? (
            <div className="mt-2 space-y-0.5 border-l border-ivory-300 pl-2.5">
              {offer.thread.map((entry) => (
                <p key={entry.id} className="text-[10.5px] text-charcoal-400">
                  {entry.actorRole === "BUYER" ? "Buyer" : "Farmer"} offered{" "}
                  <span className="font-medium text-charcoal-500">{formatINR(entry.pricePerUnit)}/kg</span>{" "}
                  · {timeAgo(entry.createdAt)}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="sm:w-32 sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.06em] text-sage">Estimated net</p>
          <p className="font-display text-[17px] font-bold leading-none text-forest-800 tabular">
            {formatINR(net)}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-charcoal-400">
            {formatINR(gross)} − {formatINR(platformFee)} fee
            {offer.transportEstimate > 0 ? ` − ${formatINR(offer.transportEstimate)} freight` : ""}
          </p>
        </div>
      </div>

      {/* Actions */}
      {actionable ? (
        <div className="border-t border-ivory-200 px-3.5 py-2.5">
          {state.message && !state.ok ? (
            <p className="mb-2 rounded-[4px] bg-danger-soft px-2 py-1 text-[11.5px] text-danger" role="alert">
              {state.message}
            </p>
          ) : null}

          <AnimatePresence mode="wait">
            {mode === "accept" ? (
              <motion.div
                key="accept"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-[5px] border border-forest/25 bg-forest-50 p-2.5"
              >
                <p className="text-[11.5px] leading-relaxed text-charcoal">
                  Accept {formatNumber(offer.quantity)} kg at {formatINR(offer.pricePerUnit)}/kg? This
                  creates a confirmed order for{" "}
                  <span className="font-semibold">{formatINR(gross)}</span> (net{" "}
                  {formatINR(net)} after fee{offer.transportEstimate > 0 ? " and freight" : ""}).
                </p>
                <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <input type="hidden" name="action" value="ACCEPT" />
                  <Button type="submit" size="sm" loading={pending} icon={<Handshake className="size-3.5" />}>
                    Confirm acceptance
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>
                    Cancel
                  </Button>
                </form>
              </motion.div>
            ) : mode === "counter" ? (
              <motion.form
                key="counter"
                action={action}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-[5px] border border-gold/40 bg-gold-50 p-2.5"
              >
                <input type="hidden" name="offerId" value={offer.id} />
                <input type="hidden" name="action" value="COUNTER" />
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1">
                    <span className="block text-[10.5px] font-medium text-charcoal-500">
                      Your counter price (₹/kg)
                    </span>
                    <Input
                      name="counterPrice"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className="mt-0.5 h-8 text-[12.5px]"
                      required
                    />
                  </label>
                  <label className="flex-1">
                    <span className="block text-[10.5px] font-medium text-charcoal-500">
                      Quantity (kg)
                    </span>
                    <Input
                      name="counterQuantity"
                      type="number"
                      min="1"
                      max={offer.listing.availableQuantity}
                      defaultValue={offer.quantity}
                      className="mt-0.5 h-8 text-[12.5px]"
                    />
                  </label>
                  <Button type="submit" size="sm" loading={pending} icon={<Send className="size-3.5" />}>
                    Send counter
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>
                    Cancel
                  </Button>
                </div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-charcoal-400">
                  The buyer must accept your counter. Net at this price:{" "}
                  <span className="font-semibold text-charcoal">
                    {formatINR(round2(Number(price || 0) * offer.quantity * (1 - 0.015) - offer.transportEstimate))}
                  </span>
                </p>
              </motion.form>
            ) : mode === "reject" ? (
              <motion.div
                key="reject"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-[5px] border border-danger/25 bg-danger-soft p-2.5"
              >
                <p className="text-[11.5px] text-charcoal">
                  Decline this offer? The buyer will be notified and the lot stays open.
                </p>
                <form action={action} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <input type="hidden" name="action" value="REJECT" />
                  <Button type="submit" size="sm" variant="danger" loading={pending}>
                    Decline offer
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMode("idle")}>
                    Keep it
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setMode("accept")} icon={<Check className="size-3.5" />}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMode("counter")} icon={<ArrowUpRight className="size-3.5" />}>
                  Counter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode("reject")} icon={<X className="size-3.5" />}>
                  Decline
                </Button>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-charcoal-400">
                  <Clock className="size-3" aria-hidden /> {timeAgo(offer.createdAt)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ivory-200 px-3.5 py-2">
          <p className="text-[10.5px] text-charcoal-400">
            {!open
              ? offer.status === "ACCEPTED"
                ? "Accepted — order created"
                : offer.status === "REJECTED"
                  ? "Declined"
                  : offer.status === "WITHDRAWN"
                    ? "Withdrawn by the buyer"
                    : "Closed"
              : offer.actorRole === myRole
                ? "Waiting on the other side"
                : "Awaiting your response"}
          </p>
          <span className="flex items-center gap-1 text-[10px] text-charcoal-400">
            <Clock className="size-3" aria-hidden /> {timeAgo(offer.createdAt)}
          </span>
        </div>
      )}
    </article>
  );
}
