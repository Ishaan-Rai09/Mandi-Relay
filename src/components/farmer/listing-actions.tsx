"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { deleteListingAction, setListingStatusAction } from "@/lib/actions/listings";

export function ListingActions({
  listingId,
  status,
  hasOrders,
  hasAuction,
}: {
  listingId: string;
  status: string;
  hasOrders: boolean;
  hasAuction: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast.success(result.message ?? "Updated");
      else toast.error("Could not update", result.message);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={pending}
        aria-label="Listing actions"
        aria-expanded={open}
        className="grid size-7 place-items-center rounded-[4px] text-charcoal-400 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-4" />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-[5px] border border-ivory-300 bg-white py-1 shadow-[var(--shadow-e3)]">
            <a
              href={`/farmer/listings/${listingId}`}
              className="block px-3 py-1.5 text-[12.5px] text-charcoal-500 hover:bg-ivory hover:text-charcoal"
            >
              Manage &amp; edit
            </a>
            {status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => run(() => setListingStatusAction(listingId, "PAUSED"))}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] text-charcoal-500 hover:bg-ivory hover:text-charcoal"
              >
                Pause listing
              </button>
            ) : status !== "SOLD" ? (
              <button
                type="button"
                onClick={() => run(() => setListingStatusAction(listingId, "ACTIVE"))}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] text-charcoal-500 hover:bg-ivory hover:text-charcoal"
              >
                Reactivate listing
              </button>
            ) : null}
            {!hasOrders && !hasAuction ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this listing? This cannot be undone.")) {
                    run(() => deleteListingAction(listingId));
                  }
                }}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] text-danger hover:bg-danger-soft"
              >
                Delete listing
              </button>
            ) : (
              <p className="px-3 py-1.5 text-[10.5px] leading-relaxed text-charcoal-400">
                {hasOrders ? "Has orders — cannot delete" : "In an auction — cannot delete"}
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
