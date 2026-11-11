import "server-only";

import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import type { NotificationType } from "@/lib/domain";
import { computeProceeds } from "@/lib/services/pricing";
import { formatINR, formatNumber, makeOrderNo, round2 } from "@/lib/utils";

export class AuctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuctionError";
  }
}

/**
 * Closes every auction whose window has elapsed. Called before auctions are
 * rendered so the UI never shows a "live" clock for a finished lot; the write
 * is guarded by status so concurrent requests cannot double-close.
 */
export async function syncExpiredAuctions() {
  const now = new Date();
  const expired = await db.auction.findMany({
    where: { status: "LIVE", endsAt: { lte: now } },
    select: { id: true, listingId: true, farmerId: true },
  });

  for (const auction of expired) {
    const closed = await db.auction.updateMany({
      where: { id: auction.id, status: "LIVE" },
      data: { status: "CLOSED" },
    });
    if (closed.count > 0) {
      await notify({
        userId: auction.farmerId,
        type: "AUCTION_CLOSING",
        title: "Auction closed",
        body: "Bidding has ended. Review the bids and award the lot, or hold it.",
        href: "/farmer/auctions",
      }).catch(() => undefined);
    }
  }
}

/** Current highest bid for each of the given auctions. */
export async function highestBids(auctionIds: string[]) {
  if (auctionIds.length === 0) return new Map<string, { amount: number; buyerId: string; id: string; createdAt: Date }>();
  const bids = await db.bid.findMany({
    where: { auctionId: { in: auctionIds } },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
  });
  const map = new Map<string, { amount: number; buyerId: string; id: string; createdAt: Date }>();
  for (const bid of bids) {
    if (!map.has(bid.auctionId)) {
      map.set(bid.auctionId, {
        amount: bid.amount,
        buyerId: bid.buyerId,
        id: bid.id,
        createdAt: bid.createdAt,
      });
    }
  }
  return map;
}

interface PlaceBidInput {
  auctionId: string;
  buyerId: string;
  amount: number;
}

/**
 * Places a bid. Every auction rule is enforced here on the server:
 * the window, the reserve price, the minimum increment, self-bidding and a
 * re-read of the current leader inside the write transaction.
 */
export async function placeBid(input: PlaceBidInput) {
  const result = await db.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: input.auctionId },
      include: { listing: true },
    });
    if (!auction) throw new AuctionError("Auction not found.");
    if (auction.farmerId === input.buyerId) {
      throw new AuctionError("You cannot bid on your own auction.");
    }

    const now = new Date();
    if (auction.status !== "LIVE") throw new AuctionError("This auction is not open for bids.");
    if (now < auction.startsAt) throw new AuctionError("Bidding has not started yet.");
    if (now > auction.endsAt) throw new AuctionError("Bidding has closed for this lot.");

    const leader = await tx.bid.findFirst({
      where: { auctionId: auction.id },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });

    const minimum = leader ? round2(leader.amount + auction.minIncrement) : auction.startingPrice;
    if (input.amount < minimum - 0.001) {
      throw new AuctionError(
        leader
          ? `Minimum next bid is ${formatINR(minimum)}/kg (current ${formatINR(leader.amount)}/kg + ${formatINR(auction.minIncrement)} step).`
          : `Bids start at ${formatINR(auction.startingPrice)}/kg.`,
      );
    }

    const buyer = await tx.user.findUnique({ where: { id: input.buyerId } });

    const bid = await tx.bid.create({
      data: {
        auctionId: auction.id,
        buyerId: input.buyerId,
        amount: round2(input.amount),
        quantity: auction.quantity,
        isDemo: buyer?.isDemo ?? false,
      },
    });

    return { bid, auction, previousLeaderId: leader?.buyerId ?? null };
  });

  const outbox: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    href?: string;
  }[] = [];

  if (result.previousLeaderId && result.previousLeaderId !== input.buyerId) {
    outbox.push({
      userId: result.previousLeaderId,
      type: "BID_NEW",
      title: "You have been outbid",
      body: `${formatINR(result.bid.amount)}/kg is now the leading bid on ${result.auction.listing.commodity}.`,
      href: `/buyer/auctions/${result.auction.id}`,
    });
  }
  outbox.push({
    userId: result.auction.farmerId,
    type: "BID_NEW",
    title: "New bid received",
    body: `${formatINR(result.bid.amount)}/kg for ${formatNumber(result.auction.quantity)} kg of ${result.auction.listing.commodity}.`,
    href: `/farmer/auctions/${result.auction.id}`,
  });

  await notify(outbox).catch(() => undefined);
  return result.bid;
}

interface CreateAuctionInput {
  listingId: string;
  farmerId: string;
  quantity: number;
  startingPrice: number;
  minIncrement: number;
  durationHours: number;
  pickupNote?: string;
  buyerCriteria?: string;
}

export async function createAuction(input: CreateAuctionInput) {
  const listing = await db.listing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw new AuctionError("Listing not found.");
  if (listing.farmerId !== input.farmerId) throw new AuctionError("This is not your listing.");
  if (listing.status !== "ACTIVE") throw new AuctionError("Only active listings can be auctioned.");
  const alreadyAuctioned = await db.auction.findUnique({ where: { listingId: listing.id } });
  if (alreadyAuctioned) throw new AuctionError("This listing is already in an auction.");

  const existingOrders = await db.order.count({ where: { listingId: listing.id } });
  if (existingOrders > 0) {
    throw new AuctionError("This listing already has a confirmed order. Create a new lot to auction it.");
  }

  const quantity = Math.min(input.quantity, listing.availableQuantity);
  if (quantity <= 0) throw new AuctionError("Enter a valid lot quantity.");
  if (input.startingPrice <= 0) throw new AuctionError("Enter a starting price.");
  if (input.minIncrement <= 0) throw new AuctionError("Enter a minimum bid increment.");
  if (input.durationHours < 0.25 || input.durationHours > 168) {
    throw new AuctionError("Auction duration must be between 15 minutes and 7 days.");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + input.durationHours * 60 * 60 * 1000);

  const auction = await db.auction.create({
    data: {
      listingId: listing.id,
      farmerId: input.farmerId,
      quantity,
      startingPrice: round2(input.startingPrice),
      minIncrement: round2(input.minIncrement),
      startsAt: now,
      endsAt,
      status: "LIVE",
      pickupNote: input.pickupNote?.trim() || null,
      buyerCriteria: input.buyerCriteria?.trim() || null,
      isDemo: listing.isDemo,
    },
  });

  await db.listing.update({
    where: { id: listing.id },
    data: { status: "RESERVED" },
  });

  return auction;
}

/**
 * Awards the lot to a bid. The farmer keeps final control: closing an auction
 * does not create an order, awarding a bid does.
 */
export async function awardBid(auctionId: string, bidId: string, farmerId: string) {
  const result = await db.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { listing: true },
    });
    if (!auction) throw new AuctionError("Auction not found.");
    if (auction.farmerId !== farmerId) throw new AuctionError("This is not your auction.");
    if (auction.status === "AWARDED") throw new AuctionError("This lot is already awarded.");

    const bid = await tx.bid.findUnique({ where: { id: bidId }, include: { buyer: true } });
    if (!bid || bid.auctionId !== auctionId) throw new AuctionError("Bid not found.");

    const leader = await tx.bid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    if (leader && bid.amount < leader.amount) {
      throw new AuctionError(
        `The leading bid is ${formatINR(leader.amount)}/kg. Award the highest bid or close without a sale.`,
      );
    }

    const quantity = Math.min(bid.quantity, auction.listing.availableQuantity);
    if (quantity <= 0) throw new AuctionError("This lot is no longer available.");

    const proceeds = computeProceeds(bid.amount, quantity);
    const remaining = round2(auction.listing.availableQuantity - quantity);

    const order = await tx.order.create({
      data: {
        orderNo: makeOrderNo(),
        listingId: auction.listingId,
        farmerId,
        buyerId: bid.buyerId,
        auctionId: auction.id,
        quantity,
        pricePerUnit: bid.amount,
        grossValue: proceeds.gross,
        transportCost: 0,
        platformFee: proceeds.platformFee,
        netToFarmer: proceeds.net,
        pickupPreference: "PICKUP",
        status: "CONFIRMED",
        notes: "Created from micro-auction award",
        isDemo: auction.isDemo || bid.buyer.isDemo,
      },
    });

    await tx.auction.update({
      where: { id: auction.id },
      data: { status: "AWARDED", awardedBidId: bidId },
    });

    await tx.listing.update({
      where: { id: auction.listingId },
      data: {
        availableQuantity: remaining,
        status: remaining <= 0 ? "SOLD" : "ACTIVE",
      },
    });

    return { order, bid, auction };
  });

  await notify([
    {
      userId: result.bid.buyerId,
      type: "OFFER_ACCEPTED",
      title: "You won the auction",
      body: `${formatNumber(result.order.quantity)} kg of ${result.auction.listing.commodity} at ${formatINR(result.bid.amount)}/kg.`,
      href: "/buyer/orders",
    },
    {
      userId: farmerId,
      type: "ORDER_CONFIRMED",
      title: "Auction awarded",
      body: `Order ${result.order.orderNo} — estimated net ${formatINR(result.order.netToFarmer)}.`,
      href: "/farmer/orders",
    },
  ]).catch(() => undefined);

  return result.order;
}

/** Closes bidding deliberately (before the clock runs out). */
export async function closeAuctionNow(auctionId: string, farmerId: string) {
  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new AuctionError("Auction not found.");
  if (auction.farmerId !== farmerId) throw new AuctionError("This is not your auction.");
  if (auction.status !== "LIVE") throw new AuctionError("This auction is not live.");

  await db.auction.update({
    where: { id: auctionId },
    data: { status: "CLOSED", endsAt: new Date() },
  });
  return true;
}
