/**
 * Pulls the official Agmarknet quotations into `PriceReference`.
 *
 *   npm run prices:sync
 *   npm run prices:sync -- --state Punjab --limit 500
 *
 * Needs AGMARKNET_API_KEY (free from data.gov.in). Without it the script exits
 * with a clear message and leaves the table untouched.
 */
import { syncMarketPrices } from "../src/lib/services/market-prices";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  console.log("\nMANDI RELAY — official market price sync\n");

  const state = arg("state");
  const limit = arg("limit") ? Number(arg("limit")) : undefined;

  console.log(
    `Source: Agmarknet (data.gov.in)${state ? ` · state=${state}` : ""}${
      limit ? ` · limit=${limit}` : ""
    }`,
  );

  try {
    const result = await syncMarketPrices({ state, limit });
    console.log(`Fetched:  ${result.fetched} quotations`);
    console.log(`Inserted: ${result.inserted}`);
    console.log(`Updated:  ${result.updated}`);
    console.log(`Skipped:  ${result.skipped} (unchanged or unusable)`);
    console.log(`Newest report date: ${result.newestReportDate ?? "—"}`);
    console.log("\nDone. Reference prices are ₹ per quintal, as published.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nSync failed: ${message}\n`);
    if (message.includes("AGMARKNET_API_KEY")) {
      console.error(
        "Get a free key at https://data.gov.in, then set AGMARKNET_API_KEY in .env and re-run.\n",
      );
    }
    process.exitCode = 1;
  }
}

void main();
