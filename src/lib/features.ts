/**
 * Feature switches.
 *
 * One flag per paused feature, read from the environment with a safe default.
 * Everything behind a flag stays in the codebase and keeps its tests; flipping
 * the flag is the whole re-enable story, which is why the auction surfaces are
 * guarded rather than deleted.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so both the server and the
 * client read the same constant.
 */

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;
  return value === "true" || value === "1";
}

export const FEATURES = {
  /**
   * Live auctions (farmer-run timed bidding). Paused for now: no auction
   * screen, nav entry, bid control or marketplace badge is rendered while this
   * is false, and the auction server actions refuse to run.
   *
   * Re-enable with NEXT_PUBLIC_ENABLE_AUCTIONS=true.
   */
  auctions: flag(process.env.NEXT_PUBLIC_ENABLE_AUCTIONS, false),
} as const;

export const auctionsEnabled = FEATURES.auctions;
