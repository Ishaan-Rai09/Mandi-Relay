import { PLATFORM_FEE_RATE, TRANSPORT_RATE_PER_KM_PER_TONNE } from "@/lib/domain";
import { round2 } from "@/lib/utils";

export interface ProceedsBreakdown {
  gross: number;
  platformFee: number;
  transport: number;
  net: number;
  perKgEffective: number;
}

/**
 * Estimated transport cost. This is a planning estimate for the farmer, not a
 * transporter quotation — the transporter module produces the binding number.
 */
export function estimateTransportCost(distanceKm: number | null, quantityKg: number): number {
  if (!distanceKm || distanceKm <= 0) return 0;
  const tonnes = Math.max(quantityKg / 1000, 0.25);
  const cost = distanceKm * TRANSPORT_RATE_PER_KM_PER_TONNE * tonnes;
  return Math.round(Math.max(cost, 350));
}

export function computeProceeds(
  pricePerUnit: number,
  quantity: number,
  opts: { transportCost?: number; includePlatformFee?: boolean } = {},
): ProceedsBreakdown {
  const gross = round2(pricePerUnit * quantity);
  const platformFee = opts.includePlatformFee === false ? 0 : round2(gross * PLATFORM_FEE_RATE);
  const transport = round2(opts.transportCost ?? 0);
  const net = round2(gross - platformFee - transport);
  return {
    gross,
    platformFee,
    transport,
    net,
    perKgEffective: quantity > 0 ? round2(net / quantity) : 0,
  };
}

/** Spread between the farmer's ask and the best available reference price. */
export function referenceGap(asking: number, modal: number) {
  if (!modal) return null;
  const diff = asking - modal;
  return {
    absolute: round2(diff),
    percent: round2((diff / modal) * 100),
    direction: diff > 0 ? "above" : diff < 0 ? "below" : "at",
  } as const;
}

export interface OfferLike {
  id: string;
  pricePerUnit: number;
  quantity: number;
  status: string;
  buyerName?: string;
  pickupPreference?: string;
}

export interface RankedOffer extends OfferLike {
  gross: number;
  platformFee: number;
  net: number;
  isBest: boolean;
}

/**
 * Ranks live offers by net proceeds rather than headline price, because a lower
 * price on a larger lot can still be the better deal.
 */
export function rankOffers(offers: OfferLike[], transportPerOfferKm?: number | null): RankedOffer[] {
  const ranked = offers.map((offer) => {
    const transport =
      offer.pickupPreference === "DELIVERY" && transportPerOfferKm
        ? estimateTransportCost(transportPerOfferKm, offer.quantity)
        : 0;
    const proceeds = computeProceeds(offer.pricePerUnit, offer.quantity, {
      transportCost: transport,
    });
    return {
      ...offer,
      gross: proceeds.gross,
      platformFee: proceeds.platformFee,
      net: proceeds.net,
      isBest: false,
    };
  });

  ranked.sort((a, b) => b.net - a.net);
  if (ranked.length > 0) ranked[0].isBest = true;
  return ranked;
}

/** Progress of an auction relative to its start value. */
export function auctionLift(currentPrice: number, startingPrice: number) {
  if (!startingPrice) return 0;
  return round2(((currentPrice - startingPrice) / startingPrice) * 100);
}
