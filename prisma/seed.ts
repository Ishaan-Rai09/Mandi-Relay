/**
 * Demo data for Mandi Relay.
 *
 * Everything created here is flagged `isDemo` and every price reference is
 * marked `isSample`, so the interface can label it honestly. The Mohali /
 * Banur / Zirakpur belt is used because the product is initially scoped to
 * Punjab and the NCR sourcing corridor.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

const PASSWORD = "demo1234";
const now = new Date();
const day = 24 * 60 * 60 * 1000;

function at(offsetDays: number, hour = 6) {
  const d = new Date(now.getTime() + offsetDays * day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Clearing existing data…");
  await db.auditLog.deleteMany();
  await db.voiceSession.deleteMany();
  await db.notification.deleteMany();
  await db.delivery.deleteMany();
  await db.deliveryQuote.deleteMany();
  await db.deliveryRequest.deleteMany();
  await db.order.deleteMany();
  await db.bid.deleteMany();
  await db.auction.deleteMany();
  await db.offer.deleteMany();
  await db.listingImage.deleteMany();
  await db.listing.deleteMany();
  await db.priceReference.deleteMany();
  await db.category.deleteMany();
  await db.session.deleteMany();
  await db.farm.deleteMany();
  await db.businessProfile.deleteMany();
  await db.transporterProfile.deleteMany();
  await db.user.deleteMany();

  console.log("Seeding categories…");
  const categories = [
    { slug: "vegetables", name: "Vegetables", nameHi: "सब्ज़ियाँ", namePa: "ਸਬਜ਼ੀਆਂ", sortOrder: 1 },
    { slug: "fruits", name: "Fruits", nameHi: "फल", namePa: "ਫਲ", sortOrder: 2 },
    { slug: "grains", name: "Grains", nameHi: "अनाज", namePa: "ਅਨਾਜ", sortOrder: 3 },
    { slug: "pulses", name: "Pulses", nameHi: "दालें", namePa: "ਦਾਲਾਂ", sortOrder: 4 },
    { slug: "spices", name: "Spices", nameHi: "मसाले", namePa: "ਮਸਾਲੇ", sortOrder: 5 },
    { slug: "other", name: "Other produce", nameHi: "अन्य उपज", namePa: "ਹੋਰ ਫ਼ਸਲ", sortOrder: 6 },
  ];
  const categoryRows = new Map<string, string>();
  for (const c of categories) {
    const row = await db.category.create({ data: c });
    categoryRows.set(c.slug, row.id);
  }

  console.log("Seeding users…");
  const passwordHash = hash(PASSWORD);

  const farmerA = await db.user.create({
    data: {
      phone: "+919810000001",
      name: "Gurpreet Singh",
      role: "FARMER",
      passwordHash,
      language: "pa",
      state: "Punjab",
      district: "SAS Nagar",
      village: "Kharar",
      lat: 30.746,
      lng: 76.647,
      verified: true,
      isDemo: true,
      farm: {
        create: {
          farmName: "Singh Family Farm",
          sizeAcres: 7.5,
          primaryCrops: JSON.stringify(["Tomatoes", "Potatoes", "Capsicum"]),
          farmingPractice: "Conventional, drip irrigated",
          verificationStatus: "VERIFIED",
        },
      },
    },
  });

  const farmerB = await db.user.create({
    data: {
      phone: "+919810000002",
      name: "Harjit Kaur",
      role: "FARMER",
      passwordHash,
      language: "hi",
      state: "Punjab",
      district: "SAS Nagar",
      village: "Banur",
      lat: 30.5544,
      lng: 76.7213,
      verified: true,
      isDemo: true,
      farm: {
        create: {
          farmName: "Kaur Growers",
          sizeAcres: 4,
          primaryCrops: JSON.stringify(["Onions", "Cauliflower", "Wheat"]),
          farmingPractice: "Low-input, farmyard manure",
          verificationStatus: "VERIFIED",
        },
      },
    },
  });

  const farmerC = await db.user.create({
    data: {
      phone: "+919810000003",
      name: "Devinder Rana",
      role: "FARMER",
      passwordHash,
      language: "hi",
      state: "Punjab",
      district: "SAS Nagar",
      village: "Zirakpur",
      lat: 30.6425,
      lng: 76.8173,
      verified: false,
      isDemo: true,
      farm: {
        create: {
          farmName: "Rana Polyhouse",
          sizeAcres: 2,
          primaryCrops: JSON.stringify(["Capsicum", "Cucumber"]),
          verificationStatus: "PENDING",
        },
      },
    },
  });

  const retailer = await db.user.create({
    data: {
      phone: "+919810000011",
      name: "Amit Verma",
      role: "BUYER",
      passwordHash,
      language: "hi",
      state: "Punjab",
      district: "SAS Nagar",
      village: "Zirakpur",
      lat: 30.6425,
      lng: 76.8173,
      verified: true,
      isDemo: true,
      business: {
        create: {
          businessName: "Verma Fresh Vegetables",
          businessType: "RETAILER",
          preferredCommodities: JSON.stringify(["Tomatoes", "Onions", "Potatoes"]),
          typicalQuantityKg: 250,
          deliveryLocations: JSON.stringify(["Zirakpur", "SAS Nagar"]),
          verificationStatus: "VERIFIED",
        },
      },
    },
  });

  const restaurant = await db.user.create({
    data: {
      phone: "+919810000012",
      name: "Neha Kapoor",
      role: "BUYER",
      passwordHash,
      language: "en",
      state: "Chandigarh",
      district: "Chandigarh",
      village: "Sector 17",
      lat: 30.7398,
      lng: 76.7827,
      verified: true,
      isDemo: true,
      business: {
        create: {
          businessName: "Spice Route Kitchens",
          businessType: "RESTAURANT",
          preferredCommodities: JSON.stringify(["Tomatoes", "Capsicum", "Cauliflower"]),
          typicalQuantityKg: 80,
          deliveryLocations: JSON.stringify(["Chandigarh", "Mohali"]),
          verificationStatus: "VERIFIED",
        },
      },
    },
  });

  const wholesaler = await db.user.create({
    data: {
      phone: "+919810000013",
      name: "Rakesh Yadav",
      role: "BUYER",
      passwordHash,
      language: "hi",
      state: "Delhi",
      district: "Delhi",
      village: "Azadpur",
      lat: 28.7051,
      lng: 77.1706,
      verified: true,
      isDemo: true,
      business: {
        create: {
          businessName: "Yadav Wholesale Mandi",
          businessType: "WHOLESALER",
          preferredCommodities: JSON.stringify(["Tomatoes", "Onions", "Potatoes", "Cauliflower"]),
          typicalQuantityKg: 2000,
          deliveryLocations: JSON.stringify(["Delhi", "Gurugram"]),
          verificationStatus: "VERIFIED",
        },
      },
    },
  });

  const buyerD = await db.user.create({
    data: {
      phone: "+919810000014",
      name: "Simran Ahuja",
      role: "BUYER",
      passwordHash,
      language: "pa",
      state: "Punjab",
      district: "Patiala",
      village: "Rajpura",
      lat: 30.4845,
      lng: 76.5945,
      verified: false,
      isDemo: true,
      business: {
        create: {
          businessName: "Ahuja Fruit Corner",
          businessType: "RETAILER",
          preferredCommodities: JSON.stringify(["Kinnow", "Bananas", "Grapes"]),
          typicalQuantityKg: 400,
          deliveryLocations: JSON.stringify(["Patiala"]),
          verificationStatus: "UNVERIFIED",
        },
      },
    },
  });

  const transporter = await db.user.create({
    data: {
      phone: "+919810000021",
      name: "Balwinder Singh",
      role: "TRANSPORTER",
      passwordHash,
      language: "pa",
      state: "Punjab",
      district: "SAS Nagar",
      village: "Kharar",
      lat: 30.746,
      lng: 76.647,
      verified: true,
      isDemo: true,
      transporter: {
        create: {
          vehicleType: "TEMPO",
          capacityKg: 2500,
          registrationNo: "PB65 C 4821",
          serviceAreas: JSON.stringify(["SAS Nagar", "Chandigarh", "Patiala", "Ambala"]),
          ratePerKm: 28,
          verificationStatus: "VERIFIED",
        },
      },
    },
  });

  await db.user.create({
    data: {
      phone: "+919810000099",
      name: "Mandi Relay Admin",
      role: "ADMIN",
      passwordHash,
      language: "en",
      state: "Punjab",
      district: "SAS Nagar",
      verified: true,
      isDemo: true,
    },
  });

  console.log("Seeding listings…");
  type Seed = {
    farmerId: string;
    slug: string;
    commodity: string;
    variety?: string;
    quantity: number;
    price: number;
    location: string;
    district: string;
    lat: number;
    lng: number;
    availableInDays: number;
    description: string;
    grade?: string;
    pickupOnly?: boolean;
    status?: string;
    createdAtOffset?: number;
  };

  const seeds: Seed[] = [
    {
      farmerId: farmerA.id,
      slug: "vegetables",
      commodity: "Tomatoes",
      variety: "Hybrid — local red",
      quantity: 500,
      price: 18,
      location: "Kharar, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.746,
      lng: 76.647,
      availableInDays: 1,
      description:
        "Picked this morning, firm and uniform. Packed in crates of 20 kg. Can load a tempo at the farm gate.",
      grade: "A",
      createdAtOffset: -1,
    },
    {
      farmerId: farmerB.id,
      slug: "vegetables",
      commodity: "Onions",
      variety: "Nashik red",
      quantity: 300,
      price: 22,
      location: "Banur, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.5544,
      lng: 76.7213,
      availableInDays: 1,
      description:
        "Well cured, 45–55 mm size, stored in a ventilated shed. Sold in 50 kg mesh bags.",
      createdAtOffset: -2,
    },
    {
      farmerId: farmerA.id,
      slug: "vegetables",
      commodity: "Potatoes",
      variety: "Kufri Pukhraj",
      quantity: 200,
      price: 15,
      location: "Kharar, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.746,
      lng: 76.647,
      availableInDays: 2,
      description: "Graded, no greening. Ideal for retail packing.",
      grade: "A",
      createdAtOffset: -1,
    },
    {
      farmerId: farmerB.id,
      slug: "vegetables",
      commodity: "Cauliflower",
      quantity: 150,
      price: 25,
      location: "Banur, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.5544,
      lng: 76.7213,
      availableInDays: 1,
      description: "Tight curds, 800 g–1.2 kg heads. Cut to order in the early morning.",
      createdAtOffset: 0,
    },
    {
      farmerId: farmerC.id,
      slug: "vegetables",
      commodity: "Capsicum",
      variety: "Polyhouse green",
      quantity: 100,
      price: 40,
      location: "Zirakpur, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.6425,
      lng: 76.8173,
      availableInDays: 1,
      description: "Thick-walled, 70–90 g fruit. Graded and crated under polyhouse cover.",
      pickupOnly: true,
      createdAtOffset: 0,
    },
    {
      farmerId: farmerB.id,
      slug: "grains",
      commodity: "Wheat",
      variety: "HD-3086",
      quantity: 2000,
      price: 23.5,
      location: "Banur, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.5544,
      lng: 76.7213,
      availableInDays: 4,
      description: "Clean, machine-graded, moisture under 12%. Weighed at the farm.",
      grade: "B",
      createdAtOffset: -3,
    },
    {
      farmerId: farmerA.id,
      slug: "fruits",
      commodity: "Kinnow",
      quantity: 800,
      price: 32,
      location: "Kharar, SAS Nagar",
      district: "SAS Nagar",
      lat: 30.746,
      lng: 76.647,
      availableInDays: 3,
      description: "Juicy, thin-skinned. Packed in 10 kg wooden crates.",
      createdAtOffset: -2,
    },
  ];

  const listings: Record<string, string> = {};
  for (const seed of seeds) {
    const createdAt = new Date(now.getTime() + (seed.createdAtOffset ?? 0) * day);
    const listing = await db.listing.create({
      data: {
        farmerId: seed.farmerId,
        categoryId: categoryRows.get(seed.slug)!,
        commodity: seed.commodity,
        variety: seed.variety ?? null,
        quantity: seed.quantity,
        availableQuantity: seed.quantity,
        unit: "kg",
        askingPrice: seed.price,
        availableFrom: at(seed.availableInDays),
        location: seed.location,
        district: seed.district,
        state: "Punjab",
        lat: seed.lat,
        lng: seed.lng,
        description: seed.description,
        grade: seed.grade ?? null,
        gradeVerified: false,
        pickupOnly: seed.pickupOnly ?? false,
        status: seed.status ?? "ACTIVE",
        isDemo: true,
        source: "SEED",
        createdAt,
        updatedAt: createdAt,
      },
    });
    listings[`${seed.commodity}`] = listing.id;
  }

  console.log("Seeding offers…");
  const tomatoId = listings["Tomatoes"];
  const onionId = listings["Onions"];
  const cauliflowerId = listings["Cauliflower"];

  const offer1 = await db.offer.create({
    data: {
      listingId: tomatoId,
      buyerId: retailer.id,
      quantity: 200,
      pricePerUnit: 16.5,
      message: "Can pick up tomorrow at 7 am with my own tempo. Please confirm crate count.",
      pickupPreference: "PICKUP",
      requestsNegotiation: true,
      status: "PENDING",
      actorRole: "BUYER",
      isDemo: true,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
  });

  await db.offer.create({
    data: {
      listingId: tomatoId,
      buyerId: wholesaler.id,
      quantity: 400,
      pricePerUnit: 15,
      message: "Taking the full 400 kg but need delivery to Azadpur. Can settle today.",
      pickupPreference: "DELIVERY",
      deliveryLocation: "Azadpur mandi, Delhi",
      requestsNegotiation: true,
      status: "PENDING",
      actorRole: "BUYER",
      isDemo: true,
      createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
    },
  });

  await db.offer.create({
    data: {
      listingId: onionId,
      buyerId: restaurant.id,
      quantity: 60,
      pricePerUnit: 21,
      message: "Weekly restaurant order. Need 60 kg every Friday if quality holds.",
      pickupPreference: "PICKUP",
      status: "PENDING",
      actorRole: "BUYER",
      isDemo: true,
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    },
  });

  console.log("Seeding auction…");
  const auction = await db.auction.create({
    data: {
      listingId: cauliflowerId,
      farmerId: farmerB.id,
      quantity: 150,
      startingPrice: 24,
      minIncrement: 1,
      startsAt: new Date(now.getTime() - 40 * 60 * 1000),
      endsAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      status: "LIVE",
      pickupNote: "Farm gate pickup at Banur. Crates provided by the farm.",
      buyerCriteria: "Buyers within 120 km who can collect within 24 hours of award.",
      isDemo: true,
    },
  });
  await db.listing.update({ where: { id: cauliflowerId }, data: { status: "RESERVED" } });

  await db.bid.create({
    data: {
      auctionId: auction.id,
      buyerId: restaurant.id,
      amount: 25,
      quantity: 150,
      isDemo: true,
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
  });
  await db.bid.create({
    data: {
      auctionId: auction.id,
      buyerId: wholesaler.id,
      amount: 26.5,
      quantity: 150,
      isDemo: true,
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
  });

  console.log("Seeding confirmed order…");
  const historicOffer = await db.offer.create({
    data: {
      listingId: listings["Potatoes"],
      buyerId: retailer.id,
      quantity: 80,
      pricePerUnit: 14.5,
      pickupPreference: "PICKUP",
      status: "ACCEPTED",
      actorRole: "BUYER",
      isDemo: true,
      createdAt: new Date(now.getTime() - 2 * day),
    },
  });
  await db.order.create({
    data: {
      orderNo: "MR-2611-8K2P",
      listingId: listings["Potatoes"],
      farmerId: farmerA.id,
      buyerId: retailer.id,
      offerId: historicOffer.id,
      quantity: 80,
      pricePerUnit: 14.5,
      grossValue: 1160,
      platformFee: 17.4,
      transportCost: 0,
      netToFarmer: 1142.6,
      pickupPreference: "PICKUP",
      status: "DELIVERED",
      isDemo: true,
      createdAt: new Date(now.getTime() - 2 * day),
    },
  });
  await db.listing.update({
    where: { id: listings["Potatoes"] },
    data: { availableQuantity: 120, status: "ACTIVE" },
  });

  console.log("Seeding price references…");
  const refs = [
    { commodity: "Tomatoes", market: "Mohali (SAS Nagar) Mandi", modal: 1800, min: 1200, max: 2400 },
    { commodity: "Onions", market: "Mohali (SAS Nagar) Mandi", modal: 2100, min: 1500, max: 2600 },
    { commodity: "Potatoes", market: "Mohali (SAS Nagar) Mandi", modal: 1250, min: 900, max: 1600 },
    { commodity: "Cauliflower", market: "Mohali (SAS Nagar) Mandi", modal: 1600, min: 1000, max: 2200 },
    { commodity: "Capsicum", market: "Mohali (SAS Nagar) Mandi", modal: 3500, min: 2500, max: 4500 },
    { commodity: "Wheat", market: "Khanna Mandi", modal: 2325, min: 2200, max: 2450 },
    { commodity: "Kinnow", market: "Abohar Mandi", modal: 2800, min: 1900, max: 3400 },
  ];

  for (const ref of refs) {
    for (let d = 0; d < 7; d += 1) {
      const drift = 1 + Math.sin((d + ref.commodity.length) * 1.3) * 0.045;
      const modal = Math.round(ref.modal * drift);
      await db.priceReference.create({
        data: {
          commodity: ref.commodity,
          market: ref.market,
          district: "SAS Nagar",
          state: "Punjab",
          minPrice: Math.round(ref.min * drift),
          maxPrice: Math.round(ref.max * drift),
          modalPrice: modal,
          unit: "quintal",
          reportDate: new Date(now.getTime() - d * day),
          source: "Sample reference data — Agmarknet-format, not an official quotation",
          isSample: true,
        },
      });
    }
  }

  console.log("Seeding delivery request…");
  const transportRequest = await db.deliveryRequest.create({
    data: {
      requesterId: wholesaler.id,
      pickupLocation: "Kharar, SAS Nagar",
      dropLocation: "Azadpur mandi, Delhi",
      distanceKm: 268,
      quantityKg: 400,
      pickupAt: at(1, 7),
      status: "QUOTED",
      notes: "Tomato crates, 20 kg each. Need an open-body tempo.",
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
  });
  await db.deliveryQuote.create({
    data: {
      requestId: transportRequest.id,
      transporterId: transporter.id,
      amount: 5400,
      etaHours: 6,
      message: "Tempo available tomorrow morning. Loading included.",
      status: "PENDING",
    },
  });

  console.log("Seeding notifications…");
  await db.notification.createMany({
    data: [
      {
        userId: farmerA.id,
        type: "OFFER_NEW",
        title: "New offer received",
        body: `200 kg of Tomatoes at ₹16.50/kg from Verma Fresh Vegetables.`,
        href: "/farmer/offers",
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        userId: farmerA.id,
        type: "OFFER_NEW",
        title: "New offer received",
        body: `400 kg of Tomatoes at ₹15.00/kg from Yadav Wholesale Mandi.`,
        href: "/farmer/offers",
        createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
      },
      {
        userId: farmerB.id,
        type: "BID_NEW",
        title: "New bid received",
        body: `₹26.50/kg for 150 kg of Cauliflower.`,
        href: `/farmer/auctions/${auction.id}`,
        createdAt: new Date(now.getTime() - 6 * 60 * 1000),
      },
      {
        userId: retailer.id,
        type: "ORDER_CONFIRMED",
        title: "Order delivered",
        body: "Order MR-2611-8K2P for 80 kg of Potatoes was marked delivered.",
        href: "/buyer/orders",
        createdAt: new Date(now.getTime() - 1 * day),
      },
    ],
  });

  console.log("Creating voice session history…");
  await db.voiceSession.create({
    data: {
      userId: farmerA.id,
      kind: "LISTING",
      transcript:
        "Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon. Mujhe 20 rupaye kilo se achha rate chahiye.",
      language: "hi",
      parsed: JSON.stringify({
        commodity: "Tomatoes",
        quantity: 500,
        unit: "kg",
        location: "Mohali",
        asking_price: 20,
      }),
      provider: "rules",
    },
  });

  await db.auditLog.create({
    data: {
      action: "SEED",
      entity: "database",
      metadata: JSON.stringify({ demo: true, accounts: 9, listings: seeds.length }),
    },
  });

  console.log("\n✓ Seed complete\n");
  console.log("Demo accounts (password: demo1234)");
  console.log("  Farmer A      +919810000001  Gurpreet Singh, Kharar");
  console.log("  Farmer B      +919810000002  Harjit Kaur, Banur");
  console.log("  Retailer      +919810000011  Amit Verma, Verma Fresh Vegetables");
  console.log("  Restaurant    +919810000012  Neha Kapoor, Spice Route Kitchens");
  console.log("  Wholesaler    +919810000013  Rakesh Yadav, Yadav Wholesale Mandi");
  console.log("  Transporter   +919810000021  Balwinder Singh");
  console.log("  Administrator +919810000099  Mandi Relay Admin");
  void offer1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
