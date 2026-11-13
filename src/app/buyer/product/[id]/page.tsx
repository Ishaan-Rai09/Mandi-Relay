import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ListingDetail } from "@/components/marketplace/listing-detail";
import { getListingDetail } from "@/lib/queries/listing-detail";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getListingDetail(id);
  if (!detail) return { title: "Lot not found" };
  return { title: `${detail.listing.commodity} · ${detail.listing.location}` };
}

export default async function BuyerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("BUYER");
  const { id } = await params;
  const detail = await getListingDetail(id, { userId: user.id, role: user.role });
  if (!detail) notFound();

  return (
    <ListingDetail
      listing={detail.listing}
      reference={detail.reference}
      history={detail.history}
      similar={detail.similar}
      viewerRole={user.role}
      backHref="/buyer/marketplace"
      baseHref="/buyer/product"
    />
  );
}
