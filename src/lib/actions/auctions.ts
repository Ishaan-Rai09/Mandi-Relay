"use server";

import { revalidatePath } from "next/cache";

import { assertRole, audit } from "@/lib/auth";
import {
  AuctionError,
  awardBid,
  closeAuctionNow,
  createAuction,
  placeBid,
} from "@/lib/services/auctions";
import { auctionSchema, bidSchema, fieldErrors, type ActionState } from "@/lib/schemas";

export async function createAuctionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer to run an auction." };

  const parsed = auctionSchema.safeParse({
    listingId: formData.get("listingId"),
    quantity: formData.get("quantity"),
    startingPrice: formData.get("startingPrice"),
    minIncrement: formData.get("minIncrement"),
    durationHours: formData.get("durationHours"),
    pickupNote: formData.get("pickupNote") || undefined,
    buyerCriteria: formData.get("buyerCriteria") || undefined,
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const auction = await createAuction({ ...parsed.data, farmerId: user.id });
    await audit(user.id, "AUCTION_CREATE", "auction", auction.id, {
      listingId: auction.listingId,
      durationHours: parsed.data.durationHours,
    });
    revalidatePath("/farmer/auctions");
    revalidatePath("/buyer/auctions");
    revalidatePath("/farmer/listings");
    return { ok: true, message: "Auction started. Buyers can bid while the clock runs.", data: { auctionId: auction.id } };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AuctionError ? error.message : "Could not start the auction.",
    };
  }
}

export async function placeBidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("BUYER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a buyer to place a bid." };

  const parsed = bidSchema.safeParse({
    auctionId: formData.get("auctionId"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const bid = await placeBid({ ...parsed.data, buyerId: user.id });
    await audit(user.id, "BID_PLACE", "bid", bid.id, {
      auctionId: parsed.data.auctionId,
      amount: bid.amount,
    });
    revalidatePath(`/buyer/auctions/${parsed.data.auctionId}`);
    revalidatePath("/buyer/auctions");
    revalidatePath("/farmer/auctions");
    return { ok: true, message: `Bid placed at ₹${bid.amount}/kg.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AuctionError ? error.message : "Could not place the bid.",
    };
  }
}

export async function awardBidAction(auctionId: string, bidId: string) {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer." };
  try {
    const order = await awardBid(auctionId, bidId, user.id);
    await audit(user.id, "AUCTION_AWARD", "auction", auctionId, { bidId, orderId: order.id });
    revalidatePath(`/farmer/auctions/${auctionId}`);
    revalidatePath("/farmer/auctions");
    revalidatePath("/farmer/orders");
    return { ok: true, message: `Lot awarded. Order ${order.orderNo} created.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AuctionError ? error.message : "Could not award the lot.",
    };
  }
}

export async function closeAuctionAction(auctionId: string) {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer." };
  try {
    await closeAuctionNow(auctionId, user.id);
    revalidatePath(`/farmer/auctions/${auctionId}`);
    revalidatePath("/farmer/auctions");
    revalidatePath("/buyer/auctions");
    return { ok: true, message: "Bidding closed. You can now award a bid." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AuctionError ? error.message : "Could not close the auction.",
    };
  }
}
