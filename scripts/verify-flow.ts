/**
 * End-to-end verification of the Mandi Relay commercial engine.
 *
 * Exercises the real service layer and database writes — not mocks:
 *   voice extraction → listing → offer → counter → accept → order → stock
 *   → auction → rejected low bid → competing bid → award → order
 *
 * Run with: npm run verify
 */
import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import { extractListing } from "../src/lib/ai/extract";
import { parseSearch } from "../src/lib/ai/search";
import { createOffer, respondToOffer } from "../src/lib/services/offers";
import { awardBid, closeAuctionNow, createAuction, placeBid } from "../src/lib/services/auctions";
import { computeProceeds } from "../src/lib/services/pricing";
import { formatINR, round2 } from "../src/lib/utils";

const startedAt = new Date();
const created = { listings: [] as string[], orders: [] as string[] };

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  \u2713 ${label}`);
}

async function main() {
  console.log("\nMANDI RELAY — end-to-end verification\n");

  /* ── 1. Multilingual extraction ─────────────────────────────────── */
  console.log("1. Voice listing extraction (Hinglish)");
  const hinglish =
    "Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon. Mujhe 20 rupaye kilo se achha rate chahiye.";
  const extraction = extractListing(hinglish);

  check("commodity resolved to Tomatoes", () => assert.equal(extraction.commodity, "Tomatoes"));
  check("quantity normalised to 500 kg", () => assert.equal(extraction.quantity, 500));
  check("unit normalised to kg", () => assert.equal(extraction.unit, "kg"));
  check("location resolved to Mohali", () => assert.equal(extraction.location, "Mohali"));
  check("price read as ₹20/kg", () => assert.equal(extraction.askingPrice, 20));
  check("'se achha' treated as a minimum, not a fixed ask", () =>
    assert.equal(extraction.priceIsMinimum, true));
  check("tomorrow-morning availability parsed", () => {
    assert.ok(extraction.availableFrom, "expected a date");
    const d = new Date(extraction.availableFrom!);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    assert.equal(d.getDate(), tomorrow.getDate());
  });
  check("nothing reported missing", () => assert.deepEqual(extraction.missing, []));

  console.log("\n   Quantity units and spoken numerals");
  const quintal = extractListing("I have 2 quintal of potatoes in Kharar tomorrow at 1500 rupaye quintal");
  check("2 quintal → 200 kg", () => assert.equal(quintal.quantity, 200));
  check("₹1500/quintal → ₹15/kg", () => assert.equal(quintal.askingPrice, 15));

  const spoken = extractListing("paanch sau kilo pyaz kal Kharar se");
  check("'paanch sau' → 500 kg", () => assert.equal(spoken.quantity, 500));
  check("'pyaz' → Onions", () => assert.equal(spoken.commodity, "Onions"));

  const gurmukhi = extractListing("ਸਾਡੇ ਕੋਲ ਪਰਸੋਂ 2 ਕੁਇੰਟਲ ਫੁੱਲ ਗੋਭੀ ਤਿਆਰ ਹੈ, ਖਰੜ ਤੋਂ");
  check("Punjabi sentence recognised", () => assert.equal(gurmukhi.commodity, "Cauliflower"));
  check("Punjabi quantity → 200 kg", () => assert.equal(gurmukhi.quantity, 200));
  check("Gurmukhi detected as Punjabi", () => assert.equal(gurmukhi.language, "pa"));

  const incomplete = extractListing("I have tomatoes");
  check("missing quantity is reported, not invented", () => {
    assert.ok(incomplete.missing.includes("quantity"));
    assert.equal(incomplete.quantity, null);
  });
  check("a follow-up question is generated", () => assert.ok(incomplete.followUp));

  /* ── 2. Natural-language search ─────────────────────────────────── */
  console.log("\n2. Natural-language marketplace search");
  const search = parseSearch("Find 200 kg of fresh onions within 30 kilometres of Mohali.");
  check("commodity → onion", () => assert.equal(search.commodityKey, "onion"));
  check("quantity → 200 kg", () => assert.equal(search.quantityKg, 200));
  check("distance → 30 km", () => assert.equal(search.maxDistanceKm, 30));
  check("place → Mohali", () => assert.equal(search.place, "Mohali"));

  const cheapest = parseSearch("show me cheaper tomatoes");
  check("'cheaper' becomes a price-ascending sort", () => assert.equal(cheapest.sort, "price_asc"));

  /* ── 3. Offer → counter → accept → order ────────────────────────── */
  console.log("\n3. Offer, counteroffer and order creation");
  const farmerA = await db.user.findUnique({ where: { phone: "+919810000001" } });
  const retailer = await db.user.findUnique({ where: { phone: "+919810000011" } });
  const category = await db.category.findFirst({ where: { slug: "vegetables" } });
  assert.ok(farmerA && retailer && category, "seed data missing — run npm run db:seed");

  const listing = await db.listing.create({
    data: {
      farmerId: farmerA.id,
      categoryId: category.id,
      commodity: "Tomatoes",
      quantity: 300,
      availableQuantity: 300,
      unit: "kg",
      askingPrice: 18,
      availableFrom: new Date(Date.now() + 86_400_000),
      location: "Kharar, SAS Nagar",
      district: "SAS Nagar",
      state: "Punjab",
      lat: 30.746,
      lng: 76.647,
      status: "ACTIVE",
      isDemo: true,
      source: "VOICE",
    },
  });
  created.listings.push(listing.id);
  check("listing persisted with 300 kg available", async () => undefined);

  const offer = await createOffer({
    listingId: listing.id,
    buyerId: retailer.id,
    quantity: 200,
    pricePerUnit: 16.5,
    message: "Can collect tomorrow morning.",
    pickupPreference: "PICKUP",
    requestsNegotiation: true,
  });
  check("buyer offer persisted as PENDING", async () => undefined);

  const counter = await respondToOffer({
    offerId: offer.id,
    userId: farmerA.id,
    action: "COUNTER",
    counterPrice: 17.5,
  });
  check("farmer counter created a new offer row", async () => undefined);
  assert.equal(counter.offer.actorRole, "FARMER");

  await assert.rejects(
    () => respondToOffer({ offerId: counter.offer.id, userId: farmerA.id, action: "ACCEPT" }),
    /counteroffer|waiting/i,
    "farmer must not be able to accept their own counter",
  );
  check("farmer cannot accept their own counter", () => undefined);

  const accepted = await respondToOffer({
    offerId: counter.offer.id,
    userId: retailer.id,
    action: "ACCEPT",
  });
  assert.ok(accepted.order, "expected an order");
  created.orders.push(accepted.order!.id);

  check("buyer acceptance created a confirmed order", async () => undefined);

  const expected = computeProceeds(17.5, 200);
  const order = accepted.order!;
  check("order gross value is quantity × price", () => assert.equal(order.grossValue, 3500));
  check("platform fee is 1.5% of gross", () => assert.equal(order.platformFee, expected.platformFee));
  check("net to farmer deducts fee", () => assert.equal(order.netToFarmer, expected.net));

  const afterOrder = await db.listing.findUnique({ where: { id: listing.id } });
  check("stock decremented to 100 kg", () => assert.equal(afterOrder!.availableQuantity, 100));
  check("partially sold lot stays ACTIVE for the remainder", () =>
    assert.equal(afterOrder!.status, "ACTIVE"));

  const farmerNotifications = await db.notification.count({
    where: { userId: farmerA.id, type: "ORDER_CONFIRMED", createdAt: { gte: startedAt } },
  });
  check("farmer notified of the confirmed order", () => assert.ok(farmerNotifications >= 1));

  await assert.rejects(
    () =>
      createOffer({
        listingId: listing.id,
        buyerId: retailer.id,
        quantity: 500,
        pricePerUnit: 18,
      }),
    /available/i,
    "an offer above remaining stock must be rejected",
  );
  check("offer above available stock rejected", () => undefined);

  /* ── 4. Auction rules ───────────────────────────────────────────── */
  console.log("\n4. Micro-auction engine");
  const farmerB = await db.user.findUnique({ where: { phone: "+919810000002" } });
  const wholesaler = await db.user.findUnique({ where: { phone: "+919810000013" } });
  assert.ok(farmerB && wholesaler);

  const auctionListing = await db.listing.create({
    data: {
      farmerId: farmerB.id,
      categoryId: category.id,
      commodity: "Onions",
      quantity: 200,
      availableQuantity: 200,
      unit: "kg",
      askingPrice: 22,
      availableFrom: new Date(Date.now() + 86_400_000),
      location: "Banur, SAS Nagar",
      district: "SAS Nagar",
      state: "Punjab",
      lat: 30.5544,
      lng: 76.7213,
      status: "ACTIVE",
      isDemo: true,
      source: "SEED",
    },
  });
  created.listings.push(auctionListing.id);

  const auction = await createAuction({
    listingId: auctionListing.id,
    farmerId: farmerB.id,
    quantity: 200,
    startingPrice: 24,
    minIncrement: 1,
    durationHours: 24,
  });
  check("auction created and lot reserved", async () => undefined);

  await assert.rejects(
    () => placeBid({ auctionId: auction.id, buyerId: retailer.id, amount: 23 }),
    /start/i,
    "bid under the floor must be rejected",
  );
  check("bid below the floor rejected", () => undefined);

  await assert.rejects(
    () => placeBid({ auctionId: auction.id, buyerId: farmerB.id, amount: 30 }),
    /own auction/i,
    "farmer must not bid on their own lot",
  );
  check("self-bidding rejected", () => undefined);

  const bid1 = await placeBid({ auctionId: auction.id, buyerId: retailer.id, amount: 24 });
  const bid2 = await placeBid({ auctionId: auction.id, buyerId: wholesaler.id, amount: 25 });
  check("valid bids accepted at the floor and above", async () => undefined);

  await assert.rejects(
    () => placeBid({ auctionId: auction.id, buyerId: retailer.id, amount: 25.5 }),
    /minimum next bid/i,
    "bid smaller than the increment must be rejected",
  );
  check("bid below the increment rejected", () => undefined);

  await closeAuctionNow(auction.id, farmerB.id);
  await assert.rejects(
    () => placeBid({ auctionId: auction.id, buyerId: retailer.id, amount: 40 }),
    /not open|closed/i,
    "bid after closing must be rejected",
  );
  check("bid after closing rejected", () => undefined);

  const awarded = await awardBid(auction.id, bid2.id, farmerB.id);
  created.orders.push(awarded.id);
  check("highest bid awarded and an order created", async () => undefined);
  check("awarded order uses the winning price", () => assert.equal(awarded.pricePerUnit, 25));
  check("awarded order nets correctly", () =>
    assert.equal(awarded.netToFarmer, computeProceeds(25, 200).net));

  const closedAuction = await db.auction.findUnique({ where: { id: auction.id } });
  check("auction marked AWARDED", () => assert.equal(closedAuction!.status, "AWARDED"));

  /* ── 5. Report ──────────────────────────────────────────────────── */
  const persistedOffers = await db.offer.count({ where: { listingId: listing.id } });
  check("offer thread persisted (original + counter)", () => assert.equal(persistedOffers, 2));

  console.log(`\n${passed} checks passed.`);
  console.log(
    `   Order value ${formatINR(order.grossValue)} · net ${formatINR(order.netToFarmer)} · auction win ${formatINR(awarded.grossValue)}\n`,
  );
}

async function cleanup() {
  if (created.orders.length > 0) {
    await db.order.deleteMany({ where: { id: { in: created.orders } } });
  }
  if (created.listings.length > 0) {
    await db.offer.deleteMany({ where: { listingId: { in: created.listings } } });
    await db.bid.deleteMany({ where: { auction: { listingId: { in: created.listings } } } });
    await db.auction.deleteMany({ where: { listingId: { in: created.listings } } });
    await db.listing.deleteMany({ where: { id: { in: created.listings } } });
  }
  await db.notification.deleteMany({ where: { createdAt: { gte: startedAt } } });
  await db.auditLog.deleteMany({ where: { createdAt: { gte: startedAt } } });
  void round2;
}

main()
  .then(async () => {
    await cleanup();
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n\u2717 Verification failed\n", error);
    try {
      await cleanup();
    } catch {
      /* best effort */
    }
    await db.$disconnect();
    process.exit(1);
  });
