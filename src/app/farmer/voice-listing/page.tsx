import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

import { VoiceStudio } from "@/components/farmer/voice-studio";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

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
        <Link
          href="/farmer/dashboard"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-charcoal-500 hover:text-forest-700"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Dashboard
        </Link>
        <p className="flex items-center gap-1.5 text-[11px] text-charcoal-400">
          <Info className="size-3.5" aria-hidden />
          Microphone needs HTTPS or localhost and your permission
        </p>
      </div>

      <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal sm:text-[30px]">
        List produce by voice
      </h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-charcoal-500">
        Say what you have in Hindi, Punjabi or English. We extract the produce, quantity, place and
        date — then you review every field before it goes live.
      </p>

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
