import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/layout/wordmark";

export const metadata: Metadata = {
  title: "Not found",
  description: "That page does not exist on Mandi Relay.",
};

/**
 * Used for unknown URLs and for paused features (the auction routes call
 * `notFound()` while `FEATURES.auctions` is false), so the copy stays generic.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <div className="px-5 py-4 sm:px-8">
        <Wordmark compact />
      </div>

      <main id="main" className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-ivory-300 bg-white text-forest-600">
            <PackageSearch className="size-5" aria-hidden />
          </div>
          <p className="eyebrow mt-5">404</p>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
            This page is not available.
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-500">
            The link may be old, or the section may be closed while the marketplace is still being
            finished. Nothing was lost — your account and listings are untouched.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <ButtonLink href="/" size="md">
              Back to home
            </ButtonLink>
            <ButtonLink href="/marketplace-preview" size="md" variant="outline">
              Browse the marketplace
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
