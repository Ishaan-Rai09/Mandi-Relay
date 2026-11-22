import type { Metadata } from "next";
import { Mic } from "lucide-react";

import { VoiceStudio } from "@/components/farmer/voice-studio";
import { BackLink, PageHeader } from "@/components/ui/misc";
import { Pill } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "List produce by voice" };
export const dynamic = "force-dynamic";

export default async function VoiceListingPage() {
  const user = await requireRole("FARMER");
  const [categories, profile] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.user.findUnique({
      where: { id: user.id },
      select: { village: true, district: true, state: true, lat: true, lng: true, language: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <BackLink href="/farmer/dashboard">Dashboard</BackLink>
        <Pill tone="forest" dot>
          <Mic className="size-3" aria-hidden />
          Voice listing
        </Pill>
      </div>

      <PageHeader
        title="List produce by voice"
        description="Say what you have in Hindi, Punjabi or English. We pull out the produce, quantity, place and date — you check every field before it goes live."
      />

      <div className="mt-5">
        <VoiceStudio
          defaults={{
            village: profile?.village ?? "",
            district: profile?.district ?? "",
            state: profile?.state ?? "Punjab",
            lat: profile?.lat ?? null,
            lng: profile?.lng ?? null,
            language: profile?.language ?? "hi",
          }}
          categories={categories}
        />
      </div>
    </div>
  );
}
