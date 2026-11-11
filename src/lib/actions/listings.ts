"use server";

import { revalidatePath } from "next/cache";

import { assertRole, audit } from "@/lib/auth";
import { db } from "@/lib/db";
import { UNIT_TO_KG } from "@/lib/domain";
import { notify } from "@/lib/notifications";
import { fieldErrors, listingDraftSchema, type ActionState } from "@/lib/schemas";
import { formatINR, formatNumber, parseJsonArray } from "@/lib/utils";

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer to publish a listing." };

  const parsed = listingDraftSchema.safeParse({
    commodity: formData.get("commodity"),
    categorySlug: formData.get("categorySlug") ?? "vegetables",
    variety: formData.get("variety") || undefined,
    quantity: formData.get("quantity"),
    unit: formData.get("unit") ?? "kg",
    askingPrice: formData.get("askingPrice"),
    availableFrom: formData.get("availableFrom"),
    location: formData.get("location"),
    district: formData.get("district"),
    state: formData.get("state"),
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    description: formData.get("description") || undefined,
    grade: formData.get("grade") || undefined,
    pickupOnly: formData.get("pickupOnly") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error), message: "Check the highlighted fields." };
  }

  const data = parsed.data;
  const category = await db.category.findUnique({ where: { slug: data.categorySlug } });
  if (!category) return { ok: false, message: "Choose a produce category." };

  const availableFrom = new Date(data.availableFrom);
  if (Number.isNaN(availableFrom.getTime())) {
    return { ok: false, message: "Enter a valid availability date." };
  }

  // Everything is normalised to kilograms so filters and price comparisons stay
  // honest regardless of whether the farmer spoke in quintals or tonnes.
  const factor = UNIT_TO_KG[data.unit] ?? 1;
  const quantityKg = Math.round(data.quantity * factor * 100) / 100;

  const listing = await db.listing.create({
    data: {
      farmerId: user.id,
      categoryId: category.id,
      commodity: data.commodity,
      variety: data.variety ?? null,
      quantity: quantityKg,
      availableQuantity: quantityKg,
      unit: "kg",
      askingPrice: data.askingPrice,
      availableFrom,
      location: data.location,
      district: data.district,
      state: data.state,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      description: data.description ?? null,
      grade: data.grade ?? null,
      gradeVerified: false,
      pickupOnly: data.pickupOnly ?? false,
      status: "ACTIVE",
      moderationStatus: "APPROVED",
      source: formData.get("source") === "VOICE" ? "VOICE" : "MANUAL",
    },
  });

  await audit(user.id, "LISTING_CREATE", "listing", listing.id, {
    commodity: listing.commodity,
    quantityKg,
    askingPrice: listing.askingPrice,
  });

  // Notify buyers who registered interest in this commodity.
  const buyers = await db.user.findMany({
    where: { role: "BUYER", id: { not: user.id } },
    include: { business: true },
    take: 50,
  });
  const interested = buyers
    .filter((buyer) => {
      const preferred = parseJsonArray(buyer.business?.preferredCommodities);
      return preferred.some(
        (item) =>
          item.toLowerCase().includes(listing.commodity.toLowerCase()) ||
          listing.commodity.toLowerCase().includes(item.toLowerCase()),
      );
    })
    .slice(0, 8);

  if (interested.length > 0) {
    await notify(
      interested.map((buyer) => ({
        userId: buyer.id,
        type: "OFFER_NEW" as const,
        title: `New lot near you: ${listing.commodity}`,
        body: `${formatNumber(listing.availableQuantity)} kg at ${formatINR(listing.askingPrice)}/kg in ${listing.location}.`,
        href: `/buyer/product/${listing.id}`,
      })),
    ).catch(() => undefined);
  }

  revalidatePath("/farmer/listings");
  revalidatePath("/farmer/dashboard");
  revalidatePath("/buyer/marketplace");
  revalidatePath("/marketplace-preview");

  return {
    ok: true,
    message: "Listing published.",
    data: { listingId: listing.id },
  };
}

export async function updateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer." };

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.farmerId !== user.id) {
    return { ok: false, message: "Listing not found." };
  }

  const parsed = listingDraftSchema.safeParse({
    commodity: formData.get("commodity"),
    categorySlug: formData.get("categorySlug") ?? "vegetables",
    variety: formData.get("variety") || undefined,
    quantity: formData.get("quantity"),
    unit: formData.get("unit") ?? "kg",
    askingPrice: formData.get("askingPrice"),
    availableFrom: formData.get("availableFrom"),
    location: formData.get("location"),
    district: formData.get("district"),
    state: formData.get("state"),
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    description: formData.get("description") || undefined,
    grade: formData.get("grade") || undefined,
    pickupOnly: formData.get("pickupOnly") === "on",
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const category = await db.category.findUnique({ where: { slug: data.categorySlug } });
  if (!category) return { ok: false, message: "Choose a produce category." };

  const factor = UNIT_TO_KG[data.unit] ?? 1;
  const quantityKg = Math.round(data.quantity * factor * 100) / 100;
  const committed = listing.quantity - listing.availableQuantity;
  if (quantityKg < committed) {
    return {
      ok: false,
      message: `You have already committed ${formatNumber(committed)} kg to orders. The lot cannot be smaller than that.`,
    };
  }

  await db.listing.update({
    where: { id: listing.id },
    data: {
      categoryId: category.id,
      commodity: data.commodity,
      variety: data.variety ?? null,
      quantity: quantityKg,
      availableQuantity: quantityKg - committed,
      askingPrice: data.askingPrice,
      availableFrom: new Date(data.availableFrom),
      location: data.location,
      district: data.district,
      state: data.state,
      description: data.description ?? null,
      grade: data.grade ?? null,
      pickupOnly: data.pickupOnly ?? false,
    },
  });

  await audit(user.id, "LISTING_UPDATE", "listing", listing.id);
  revalidatePath(`/farmer/listings/${listing.id}`);
  revalidatePath("/farmer/listings");
  return { ok: true, message: "Listing updated." };
}

export async function setListingStatusAction(listingId: string, status: string) {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer." };

  const allowed = ["ACTIVE", "PAUSED", "RESERVED", "SOLD"];
  if (!allowed.includes(status)) return { ok: false, message: "Unsupported status." };

  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { auction: true } });
  if (!listing || listing.farmerId !== user.id) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing.auction?.status === "LIVE" && status !== listing.status) {
    return {
      ok: false,
      message: "This lot is in a live auction. Close the auction before changing its status.",
    };
  }

  await db.listing.update({ where: { id: listingId }, data: { status } });
  await audit(user.id, "LISTING_STATUS", "listing", listingId, { status });
  revalidatePath("/farmer/listings");
  revalidatePath(`/farmer/listings/${listingId}`);
  revalidatePath("/buyer/marketplace");
  return { ok: true, message: `Listing marked ${status.toLowerCase()}.` };
}

export async function deleteListingAction(listingId: string) {
  const user = await assertRole("FARMER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a farmer." };

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { _count: { select: { offers: true, orders: true } }, auction: true },
  });
  if (!listing || listing.farmerId !== user.id) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing._count.orders > 0) {
    return { ok: false, message: "This lot has orders and cannot be deleted. Mark it sold instead." };
  }
  if (listing.auction) {
    return { ok: false, message: "This lot has an auction attached and cannot be deleted." };
  }
  if (listing._count.offers > 0) {
    return {
      ok: false,
      message: "Buyers have offered on this lot. Pause it instead of deleting so they keep their thread.",
    };
  }

  await db.listing.delete({ where: { id: listingId } });
  await audit(user.id, "LISTING_DELETE", "listing", listingId);
  revalidatePath("/farmer/listings");
  return { ok: true, message: "Listing deleted." };
}
