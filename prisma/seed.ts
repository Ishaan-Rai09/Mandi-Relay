/**
 * Reference data only.
 *
 * The database starts empty and stays empty until real people sign up: no demo
 * accounts, listings, offers, orders or invented prices. The only rows written
 * here are the produce categories, which are configuration rather than market
 * activity, and they are upserted so the script is safe to re-run.
 *
 * Price references come from the official Agmarknet feed (`npm run prices:sync`).
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CATEGORIES = [
  { slug: "vegetables", name: "Vegetables", nameHi: "सब्ज़ियाँ", namePa: "ਸਬਜ਼ੀਆਂ", sortOrder: 1 },
  { slug: "fruits", name: "Fruits", nameHi: "फल", namePa: "ਫਲ", sortOrder: 2 },
  { slug: "grains", name: "Grains", nameHi: "अनाज", namePa: "ਅਨਾਜ", sortOrder: 3 },
  { slug: "pulses", name: "Pulses", nameHi: "दालें", namePa: "ਦਾਲਾਂ", sortOrder: 4 },
  { slug: "spices", name: "Spices", nameHi: "मसाले", namePa: "ਮਸਾਲੇ", sortOrder: 5 },
  { slug: "other", name: "Other produce", nameHi: "अन्य उपज", namePa: "ਹੋਰ ਫ਼ਸਲ", sortOrder: 6 },
];

async function main() {
  console.log("Seeding produce categories…");

  for (const category of CATEGORIES) {
    await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        nameHi: category.nameHi,
        namePa: category.namePa,
        sortOrder: category.sortOrder,
      },
    });
  }

  const [categories, users, listings] = await Promise.all([
    db.category.count(),
    db.user.count(),
    db.listing.count(),
  ]);

  console.log(`Categories: ${categories}`);
  console.log(`Accounts:   ${users} (real accounts only — nothing is seeded here)`);
  console.log(`Listings:   ${listings}`);
  console.log("\nDone. Sign in with a phone number to create the first account.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
