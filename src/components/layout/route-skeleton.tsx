import { Skeleton } from "@/components/ui/misc";

/**
 * Placeholder for a workspace page while its server render is in flight.
 *
 * It lives inside each role segment rather than at the root, so the sidebar,
 * header and mobile tab bar stay mounted and only the content area swaps. A
 * root-level boundary would replace the whole shell and read as a page reload
 * on every click.
 */
export function RouteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-[8px] sm:h-24" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-[8px] border border-ivory-300 bg-white">
            <Skeleton className="m-4 h-5 w-32" />
            <div className="space-y-3 px-4 pb-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="hidden h-56 rounded-[8px] lg:block" />
      </div>
    </div>
  );
}
