"use server";

import { revalidatePath } from "next/cache";

import { assertRole, audit } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";

/**
 * Admin actions are guarded twice: `assertRole("ADMIN")` here and the route
 * layout. Every mutation is written to the audit log with the acting admin.
 */

export async function setUserVerifiedAction(userId: string, verified: boolean) {
  const admin = await assertRole("ADMIN").catch(() => null);
  if (!admin) return { ok: false, message: "Administrator access required." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "User not found." };

  await db.user.update({
    where: { id: userId },
    data: {
      verified,
      verificationNote: verified ? "Verified by platform team" : "Verification withdrawn",
    },
  });

  await db.farm.updateMany({
    where: { userId },
    data: { verificationStatus: verified ? "VERIFIED" : "UNVERIFIED" },
  });
  await db.businessProfile.updateMany({
    where: { userId },
    data: { verificationStatus: verified ? "VERIFIED" : "UNVERIFIED" },
  });
  await db.transporterProfile.updateMany({
    where: { userId },
    data: { verificationStatus: verified ? "VERIFIED" : "UNVERIFIED" },
  });

  await notify({
    userId,
    type: "OFFER_NEW",
    title: verified ? "Your account is verified" : "Verification withdrawn",
    body: verified
      ? "Buyers and farmers now see a verified badge on your profile."
      : "Your verified badge has been removed. Contact support for details.",
    href: "/notifications",
  }).catch(() => undefined);

  await audit(admin.id, verified ? "ADMIN_VERIFY_USER" : "ADMIN_UNVERIFY_USER", "user", userId);
  revalidatePath("/admin/users");
  return { ok: true, message: verified ? "User verified." : "Verification withdrawn." };
}

export async function setListingModerationAction(listingId: string, status: string) {
  const admin = await assertRole("ADMIN").catch(() => null);
  if (!admin) return { ok: false, message: "Administrator access required." };
  if (!["APPROVED", "PENDING", "REJECTED"].includes(status)) {
    return { ok: false, message: "Unsupported moderation state." };
  }

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) return { ok: false, message: "Listing not found." };

  await db.listing.update({
    where: { id: listingId },
    data: {
      moderationStatus: status,
      status: status === "REJECTED" ? "PAUSED" : listing.status === "PAUSED" ? "ACTIVE" : listing.status,
    },
  });

  await notify({
    userId: listing.farmerId,
    type: "OFFER_NEW",
    title: status === "REJECTED" ? "Listing paused by moderation" : "Listing moderation updated",
    body:
      status === "REJECTED"
        ? `${listing.commodity}: this lot was paused after review. Contact support if you think this is wrong.`
        : `${listing.commodity}: moderated as ${status.toLowerCase()}.`,
    href: "/farmer/listings",
  }).catch(() => undefined);

  await audit(admin.id, "ADMIN_MODERATE_LISTING", "listing", listingId, { status });
  revalidatePath("/admin/listings");
  revalidatePath("/marketplace-preview");
  return { ok: true, message: `Listing marked ${status.toLowerCase()}.` };
}

export async function addMarketPriceAction(_prev: unknown, _formData: FormData) {
  const admin = await assertRole("ADMIN").catch(() => null);
  if (!admin) return { ok: false, message: "Administrator access required." };
  return { ok: false, message: "Price ingestion runs from an official feed, not manual entry." };
}
