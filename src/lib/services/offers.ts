import "server-only";

import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import type { NotificationType } from "@/lib/domain";
import { computeProceeds, estimateTransportCost } from "@/lib/services/pricing";
import { distanceKm, formatINR, formatNumber, makeOrderNo, round2 } from "@/lib/utils";

export class OfferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferError";
  }
}

type Action = "ACCEPT" | "REJECT" | "COUNTER" | "WITHDRAW";

interface OutboxItem {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}

interface RespondInput {
  offerId: string;
  userId: string;
  action: Action;
  counterPrice?: number;
  counterQuantity?: number;
  message?: string;
}

/**
 * The single entry point for every offer transition.
 *
 * Negotiation is turn-based: a row records who moved (`actorRole`), and only the
 * counterparty may accept, reject or counter it. All quantity, ownership and
 * state checks happen inside a transaction, so two browser tabs can never
 * oversell a lot. Notifications are queued and dispatched after commit —
 * writing them inside the transaction would contend for SQLite's single writer.
 */
export async function respondToOffer(input: RespondInput) {
  const { offerId, userId, action } = input;

  const result = await db.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({
      where: { id: offerId },
      include: { listing: true, buyer: true },
    });
    if (!offer) throw new OfferError("This offer no longer exists.");

    const isFarmer = offer.listing.farmerId === userId;
    const isBuyer = offer.buyerId === userId;
    if (!isFarmer && !isBuyer) throw new OfferError("You are not part of this negotiation.");

    const actorRole = isFarmer ? "FARMER" : "BUYER";
    const isMyTurn = offer.actorRole !== actorRole;
    const outbox: OutboxItem[] = [];

    if (action === "WITHDRAW") {
      if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
        throw new OfferError("This offer is already closed.");
      }
      if (offer.actorRole !== actorRole) {
        throw new OfferError("You cannot withdraw an offer that is awaiting the other side.");
      }
      const withdrawn = await tx.offer.update({
        where: { id: offer.id },
        data: { status: "WITHDRAWN" },
      });
      return { offer: withdrawn, order: null, outbox, message: "Offer withdrawn." };
    }

    if (!isMyTurn) {
      throw new OfferError(
        actorRole === "FARMER"
          ? "This is your counteroffer — waiting on the buyer."
          : "This is your offer — waiting on the farmer.",
      );
    }
    if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
      throw new OfferError("This offer is already closed.");
    }

    const counterparty = isFarmer ? offer.buyerId : offer.listing.farmerId;

    if (action === "REJECT") {
      const rejected = await tx.offer.update({
        where: { id: offer.id },
        data: { status: "REJECTED" },
      });
      outbox.push({
        userId: counterparty,
        type: "OFFER_REJECTED",
        title: isFarmer ? "Offer declined" : "Your counter was declined",
        body: `${formatNumber(offer.quantity)} kg of ${offer.listing.commodity} at ${formatINR(offer.pricePerUnit)}/kg was declined.`,
        href: isFarmer ? "/buyer/bids" : "/farmer/offers",
      });
      return { offer: rejected, order: null, outbox, message: "Offer declined." };
    }

    if (action === "COUNTER") {
      const price = input.counterPrice;
      if (!price || price <= 0) throw new OfferError("Enter a valid counter price.");
      const quantity = input.counterQuantity ?? offer.quantity;
      if (quantity <= 0) throw new OfferError("Enter a valid quantity.");
      if (quantity > offer.listing.availableQuantity) {
        throw new OfferError(
          `Only ${formatNumber(offer.listing.availableQuantity)} kg is still available.`,
        );
      }

      await tx.offer.update({ where: { id: offer.id }, data: { status: "COUNTERED" } });

      const counter = await tx.offer.create({
        data: {
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          quantity,
          pricePerUnit: round2(price),
          message: input.message?.trim().slice(0, 500) || null,
          pickupPreference: offer.pickupPreference,
          deliveryLocation: offer.deliveryLocation,
          requestsNegotiation: false,
          status: "PENDING",
          actorRole,
          parentOfferId: offer.id,
        },
      });

      outbox.push({
        userId: counterparty,
        type: "OFFER_COUNTER",
        title: isFarmer ? "Farmer sent a counteroffer" : "Buyer sent a counteroffer",
        body: `${formatNumber(quantity)} kg of ${offer.listing.commodity} at ${formatINR(counter.pricePerUnit)}/kg.`,
        href: isFarmer ? "/buyer/bids" : "/farmer/offers",
      });

      return { offer: counter, order: null, outbox, message: "Counteroffer sent." };
    }

    // ACCEPT
    if (offer.quantity > offer.listing.availableQuantity) {
      throw new OfferError(
        `Only ${formatNumber(offer.listing.availableQuantity)} kg of this lot is still available.`,
      );
    }

    const buyer = await tx.user.findUnique({ where: { id: offer.buyerId } });
    const accepted = await tx.offer.update({
      where: { id: offer.id },
      data: { status: "ACCEPTED" },
    });

    const distance = distanceKm(
      { lat: buyer?.lat ?? null, lng: buyer?.lng ?? null },
      { lat: offer.listing.lat, lng: offer.listing.lng },
    );
    const transport =
      offer.pickupPreference === "DELIVERY" ? estimateTransportCost(distance, offer.quantity) : 0;
    const proceeds = computeProceeds(offer.pricePerUnit, offer.quantity, {
      transportCost: transport,
    });

    const remaining = round2(offer.listing.availableQuantity - offer.quantity);

    const order = await tx.order.create({
      data: {
        orderNo: makeOrderNo(),
        listingId: offer.listingId,
        farmerId: offer.listing.farmerId,
        buyerId: offer.buyerId,
        offerId: offer.id,
        quantity: offer.quantity,
        pricePerUnit: offer.pricePerUnit,
        grossValue: proceeds.gross,
        transportCost: proceeds.transport,
        platformFee: proceeds.platformFee,
        netToFarmer: proceeds.net,
        pickupPreference: offer.pickupPreference,
        status: "CONFIRMED",
        isDemo: offer.isDemo || buyer?.isDemo || false,
      },
    });

    // A partially sold lot stays ACTIVE so the farmer can still sell the
    // remainder. RESERVED means "held for an auction", not "partly sold".
    await tx.listing.update({
      where: { id: offer.listingId },
      data: {
        availableQuantity: remaining,
        status: remaining <= 0 ? "SOLD" : "ACTIVE",
      },
    });

    outbox.push(
      {
        userId: offer.buyerId,
        type: "OFFER_ACCEPTED",
        title: "Offer accepted",
        body: `${formatNumber(offer.quantity)} kg of ${offer.listing.commodity} confirmed for ${formatINR(proceeds.gross)}.`,
        href: "/buyer/orders",
      },
      {
        userId: offer.listing.farmerId,
        type: "ORDER_CONFIRMED",
        title: "Order confirmed",
        body: `Order ${order.orderNo} — estimated net ${formatINR(proceeds.net)}.`,
        href: "/farmer/orders",
      },
    );

    return { offer: accepted, order, outbox, message: "Offer accepted and order created." };
  });

  if (result.outbox.length > 0) {
    await notify(result.outbox).catch(() => undefined);
  }

  return { offer: result.offer, order: result.order, message: result.message };
}

/** Creates a new offer from a buyer, with server-side validation. */
export async function createOffer(params: {
  listingId: string;
  buyerId: string;
  quantity: number;
  pricePerUnit: number;
  message?: string;
  pickupPreference?: string;
  deliveryLocation?: string;
  requestsNegotiation?: boolean;
}) {
  const listing = await db.listing.findUnique({ where: { id: params.listingId } });
  if (!listing) throw new OfferError("Listing not found.");
  if (listing.farmerId === params.buyerId) throw new OfferError("You cannot bid on your own listing.");
  if (listing.status !== "ACTIVE") throw new OfferError("This listing is not open for offers.");
  if (params.quantity <= 0) throw new OfferError("Enter a quantity greater than zero.");
  if (params.quantity > listing.availableQuantity) {
    throw new OfferError(`Only ${formatNumber(listing.availableQuantity)} kg is available.`);
  }
  if (params.pricePerUnit <= 0) throw new OfferError("Enter a price greater than zero.");
  if (params.pricePerUnit > listing.askingPrice * 5) {
    throw new OfferError("That price looks like a typo — please check the amount.");
  }

  const buyer = await db.user.findUnique({ where: { id: params.buyerId } });

  const offer = await db.offer.create({
    data: {
      listingId: params.listingId,
      buyerId: params.buyerId,
      quantity: params.quantity,
      pricePerUnit: round2(params.pricePerUnit),
      message: params.message?.trim().slice(0, 500) || null,
      pickupPreference: params.pickupPreference === "DELIVERY" ? "DELIVERY" : "PICKUP",
      deliveryLocation: params.deliveryLocation?.trim() || null,
      requestsNegotiation: params.requestsNegotiation ?? false,
      status: "PENDING",
      actorRole: "BUYER",
      isDemo: buyer?.isDemo ?? false,
    },
  });

  await notify({
    userId: listing.farmerId,
    type: "OFFER_NEW",
    title: "New offer received",
    body: `${formatNumber(params.quantity)} kg of ${listing.commodity} at ${formatINR(params.pricePerUnit)}/kg.`,
    href: "/farmer/offers",
  }).catch(() => undefined);

  return offer;
}
