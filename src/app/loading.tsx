import { Skeleton } from "@/components/ui/misc";

/**
 * Shared route skeleton. Every authenticated page queries Postgres on the
 * server, so this fills the gap between navigation and the first byte instead
 * of leaving the previous screen frozen.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[8px]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-[8px]" />
    </div>
  );
}
