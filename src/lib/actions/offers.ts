"use server";

import { revalidatePath } from "next/cache";

import { assertRole, audit } from "@/lib/auth";
import { createOffer, OfferError, respondToOffer } from "@/lib/services/offers";
import { offerResponseSchema, offerSchema, fieldErrors, type ActionState } from "@/lib/schemas";

export async function createOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole("BUYER").catch(() => null);
  if (!user) {
    return { ok: false, message: "Sign in as a buyer to send an offer." };
  }

  const parsed = offerSchema.safeParse({
    listingId: formData.get("listingId"),
    quantity: formData.get("quantity"),
    pricePerUnit: formData.get("pricePerUnit"),
    message: formData.get("message") || undefined,
    pickupPreference: formData.get("pickupPreference") || "PICKUP",
    deliveryLocation: formData.get("deliveryLocation") || undefined,
    requestsNegotiation: formData.get("requestsNegotiation") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  try {
    const offer = await createOffer({ ...parsed.data, buyerId: user.id });
    await audit(user.id, "OFFER_CREATE", "offer", offer.id, {
      listingId: offer.listingId,
      price: offer.pricePerUnit,
      quantity: offer.quantity,
    });
    revalidatePath("/buyer/bids");
    revalidatePath("/farmer/offers");
    revalidatePath(`/buyer/product/${parsed.data.listingId}`);
    return { ok: true, message: "Offer sent to the farmer." };
  } catch (error) {
    if (error instanceof OfferError) return { ok: false, message: error.message };
    return { ok: false, message: "Could not send the offer. Please try again." };
  }
}

export async function respondOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole(["FARMER", "BUYER"]).catch(() => null);
  if (!user) return { ok: false, message: "Please sign in to respond to offers." };

  const parsed = offerResponseSchema.safeParse({
    offerId: formData.get("offerId"),
    action: formData.get("action"),
    counterPrice: formData.get("counterPrice") || undefined,
    counterQuantity: formData.get("counterQuantity") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const result = await respondToOffer({
      offerId: parsed.data.offerId,
      userId: user.id,
      action: parsed.data.action,
      counterPrice: parsed.data.counterPrice,
      counterQuantity: parsed.data.counterQuantity,
      message: parsed.data.message,
    });

    await audit(user.id, `OFFER_${parsed.data.action}`, "offer", parsed.data.offerId, {
      orderId: result.order?.id ?? null,
    });

    revalidatePath("/farmer/offers");
    revalidatePath("/farmer/dashboard");
    revalidatePath("/farmer/orders");
    revalidatePath("/buyer/bids");
    revalidatePath("/buyer/orders");
    revalidatePath("/buyer/dashboard");

    return {
      ok: true,
      message: result.message,
      data: result.order ? { orderNo: result.order.orderNo, orderId: result.order.id } : undefined,
    };
  } catch (error) {
    if (error instanceof OfferError) return { ok: false, message: error.message };
    return { ok: false, message: "Could not update this offer. Please refresh and try again." };
  }
}

export async function withdrawOfferAction(offerId: string) {
  const user = await assertRole("BUYER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in to manage offers." };
  try {
    await respondToOffer({ offerId, userId: user.id, action: "WITHDRAW" });
    revalidatePath("/buyer/bids");
    return { ok: true, message: "Offer withdrawn." };
  } catch (error) {
    return { ok: false, message: error instanceof OfferError ? error.message : "Could not withdraw." };
  }
}
