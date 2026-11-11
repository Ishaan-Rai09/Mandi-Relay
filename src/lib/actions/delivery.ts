"use server";

import { revalidatePath } from "next/cache";

import { assertRole, audit } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { deliveryQuoteSchema, deliveryRequestSchema, fieldErrors, type ActionState } from "@/lib/schemas";
import { formatINR } from "@/lib/utils";

export async function requestTransportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertRole(["FARMER", "BUYER"]).catch(() => null);
  if (!user) return { ok: false, message: "Sign in to request transport." };

  const parsed = deliveryRequestSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
    dropLocation: formData.get("dropLocation"),
    quantityKg: formData.get("quantityKg"),
    distanceKm: formData.get("distanceKm") || undefined,
    pickupAt: formData.get("pickupAt") || undefined,
    notes: formData.get("notes") || undefined,
    orderId: formData.get("orderId") || undefined,
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  if (data.orderId) {
    const order = await db.order.findUnique({ where: { id: data.orderId } });
    if (!order || (order.farmerId !== user.id && order.buyerId !== user.id)) {
      return { ok: false, message: "Order not found." };
    }
    const existing = await db.deliveryRequest.findFirst({ where: { orderId: order.id } });
    if (existing) {
      return { ok: false, message: "A transport request already exists for this order." };
    }
  }

  const request = await db.deliveryRequest.create({
    data: {
      requesterId: user.id,
      orderId: data.orderId ?? null,
      pickupLocation: data.pickupLocation,
      dropLocation: data.dropLocation,
      quantityKg: data.quantityKg,
      distanceKm: data.distanceKm ?? null,
      pickupAt: data.pickupAt ? new Date(data.pickupAt) : null,
      notes: data.notes?.trim() || null,
      status: "REQUESTED",
    },
  });

  await audit(user.id, "DELIVERY_REQUEST", "deliveryRequest", request.id);
  revalidatePath("/transporter/requests");
  revalidatePath("/farmer/orders");
  revalidatePath("/buyer/orders");
  return { ok: true, message: "Transport requested. Transporters can now quote on it." };
}

export async function submitQuoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertRole("TRANSPORTER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a transporter." };

  const parsed = deliveryQuoteSchema.safeParse({
    requestId: formData.get("requestId"),
    amount: formData.get("amount"),
    etaHours: formData.get("etaHours") || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const request = await db.deliveryRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request) return { ok: false, message: "Request not found." };
  if (request.status !== "REQUESTED" && request.status !== "QUOTED") {
    return { ok: false, message: "This load is no longer open for quotes." };
  }

  const existing = await db.deliveryQuote.findFirst({
    where: { requestId: request.id, transporterId: user.id },
  });
  if (existing) {
    await db.deliveryQuote.update({
      where: { id: existing.id },
      data: {
        amount: parsed.data.amount,
        etaHours: parsed.data.etaHours ?? null,
        message: parsed.data.message?.trim() || null,
      },
    });
  } else {
    await db.deliveryQuote.create({
      data: {
        requestId: request.id,
        transporterId: user.id,
        amount: parsed.data.amount,
        etaHours: parsed.data.etaHours ?? null,
        message: parsed.data.message?.trim() || null,
      },
    });
  }

  await db.deliveryRequest.update({ where: { id: request.id }, data: { status: "QUOTED" } });
  await notify({
    userId: request.requesterId,
    type: "DELIVERY_UPDATE",
    title: "Transport quote received",
    body: `${formatINR(parsed.data.amount)} for ${request.pickupLocation} → ${request.dropLocation}.`,
    href: "/farmer/orders",
  }).catch(() => undefined);

  await audit(user.id, "DELIVERY_QUOTE", "deliveryRequest", request.id, { amount: parsed.data.amount });
  revalidatePath("/transporter/requests");
  revalidatePath("/transporter/dashboard");
  return { ok: true, message: "Quote submitted." };
}

export async function acceptQuoteAction(quoteId: string) {
  const user = await assertRole(["FARMER", "BUYER"]).catch(() => null);
  if (!user) return { ok: false, message: "Sign in to select a transporter." };

  const quote = await db.deliveryQuote.findUnique({
    where: { id: quoteId },
    include: { request: true },
  });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (quote.request.requesterId !== user.id) return { ok: false, message: "This is not your load." };
  if (quote.request.status === "ASSIGNED" || quote.request.status === "DELIVERED") {
    return { ok: false, message: "A transporter is already assigned to this load." };
  }

  await db.$transaction([
    db.deliveryQuote.updateMany({
      where: { requestId: quote.requestId, id: { not: quote.id } },
      data: { status: "DECLINED" },
    }),
    db.deliveryQuote.update({ where: { id: quote.id }, data: { status: "SELECTED" } }),
    db.deliveryRequest.update({
      where: { id: quote.requestId },
      data: { status: "ASSIGNED" },
    }),
    db.delivery.create({
      data: {
        requestId: quote.requestId,
        orderId: quote.request.orderId,
        transporterId: quote.transporterId,
        amount: quote.amount,
        status: "ASSIGNED",
      },
    }),
  ]);

  await notify({
    userId: quote.transporterId,
    type: "DELIVERY_UPDATE",
    title: "Load assigned to you",
    body: `${quote.request.pickupLocation} → ${quote.request.dropLocation} at ${formatINR(quote.amount)}.`,
    href: "/transporter/deliveries",
  }).catch(() => undefined);

  await audit(user.id, "DELIVERY_ASSIGN", "deliveryQuote", quote.id);
  revalidatePath("/transporter/requests");
  revalidatePath("/transporter/deliveries");
  revalidatePath("/farmer/orders");
  revalidatePath("/buyer/orders");
  return { ok: true, message: "Transporter selected. Pickup can now be scheduled." };
}

const NEXT_STATUSES = [
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export async function updateDeliveryStatusAction(deliveryId: string, status: string) {
  const user = await assertRole("TRANSPORTER").catch(() => null);
  if (!user) return { ok: false, message: "Sign in as a transporter." };
  if (!NEXT_STATUSES.includes(status as (typeof NEXT_STATUSES)[number])) {
    return { ok: false, message: "Unsupported delivery status." };
  }

  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.transporterId !== user.id) {
    return { ok: false, message: "Delivery not found." };
  }

  const now = new Date();
  await db.delivery.update({
    where: { id: deliveryId },
    data: {
      status,
      pickedUpAt: status === "PICKED_UP" ? now : delivery.pickedUpAt,
      deliveredAt: status === "DELIVERED" ? now : delivery.deliveredAt,
    },
  });

  await db.deliveryRequest.update({ where: { id: delivery.requestId }, data: { status } });

  if (delivery.orderId) {
    const orderStatus =
      status === "DELIVERED" ? "DELIVERED" : status === "IN_TRANSIT" || status === "PICKED_UP" ? "IN_TRANSIT" : null;
    if (orderStatus) {
      await db.order.update({ where: { id: delivery.orderId }, data: { status: orderStatus } });
    }
  }

  const request = await db.deliveryRequest.findUnique({ where: { id: delivery.requestId } });
  if (request) {
    await notify({
      userId: request.requesterId,
      type: "DELIVERY_UPDATE",
      title: "Delivery status updated",
      body: `${request.pickupLocation} → ${request.dropLocation} is now ${status.replace(/_/g, " ").toLowerCase()}.`,
      href: "/farmer/orders",
    }).catch(() => undefined);
  }

  await audit(user.id, "DELIVERY_STATUS", "delivery", deliveryId, { status });
  revalidatePath("/transporter/deliveries");
  revalidatePath("/transporter/dashboard");
  return { ok: true, message: `Marked ${status.replace(/_/g, " ").toLowerCase()}.` };
}
