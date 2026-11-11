import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

import { Wordmark } from "@/components/layout/wordmark";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-5">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Wordmark />
        </div>
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-ivory-300 bg-white text-forest-600 shadow-[var(--shadow-e1)]">
          <CloudOff className="size-6" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-[24px] font-bold tracking-[-0.03em] text-charcoal">
          You are offline.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-charcoal-500">
          Pages you already opened are still available from this device. Live lots, offers,
          auctions, transcription and AI extraction all need a connection.
        </p>

        <div className="mt-6 rounded-[6px] border border-ivory-300 bg-white p-3.5 text-left">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">
            What still works offline
          </p>
          <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-charcoal-500">
            <li>· Previously opened pages and cached images</li>
            <li>· A produce draft you saved on this device</li>
            <li>· Reading your own notes and prices already loaded</li>
          </ul>
          <p className="mt-2 text-[10.5px] leading-relaxed text-charcoal-400">
            A saved draft is never published automatically — it waits for your confirmation once
            you are back online.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-[5px] bg-forest px-3.5 py-2 text-[13px] font-medium text-white hover:bg-forest-700"
          >
            Try again
          </Link>
          <Link
            href="/offline"
            className="rounded-[5px] border border-forest/25 bg-white px-3.5 py-2 text-[13px] font-medium text-forest-800"
          >
            Reload this page
          </Link>
        </div>
      </div>
    </div>
  );
}
