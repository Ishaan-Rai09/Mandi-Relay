import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ListingDetail } from "@/components/marketplace/listing-detail";
import { getListingDetail } from "@/lib/queries/listing-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getListingDetail(id);
  if (!detail) return { title: "Lot not found" };
  return {
    title: `${detail.listing.commodity} · ${detail.listing.location}`,
    description: `${detail.listing.availableQuantity} kg of ${detail.listing.commodity} available from ${detail.listing.location}.`,
  };
}

export default async function PreviewListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getListingDetail(id);
  if (!detail) notFound();

  return (
    <ListingDetail
      listing={detail.listing}
      reference={detail.reference}
      history={detail.history}
      similar={detail.similar}
      viewerRole={null}
      backHref="/marketplace-preview"
      baseHref="/marketplace-preview"
    />
  );
}
