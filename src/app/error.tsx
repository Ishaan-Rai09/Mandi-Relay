"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Server errors inside a page or action surface
 * here instead of a blank screen; `reset()` re-renders the segment without a
 * full reload.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side details are already logged; keep the browser console useful.
    console.error("Mandi Relay route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="grid size-11 place-items-center rounded-full border border-danger/25 bg-danger-soft text-danger">
          <CircleAlert className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-[22px] font-bold tracking-[-0.02em] text-charcoal">
          Something went wrong on this screen.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-charcoal-500">
          The rest of the app is still working. Try again — if it keeps failing, the database or a
          third-party service (price feed, speech-to-text) may be unavailable.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-charcoal-400">reference: {error.digest}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={reset} icon={<RotateCcw className="size-3.5" />}>
            Try again
          </Button>
          <Link
            href="/"
            className="text-[12.5px] font-medium text-forest-700 underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
