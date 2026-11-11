# Mandi Relay

**Your Produce. Your Market. Your Voice.**

A voice-first agricultural marketplace PWA for India. A farmer speaks what they have
harvested; the app extracts a structured listing, puts it in front of nearby buyers, and
turns offers, counteroffers, micro-auctions and orders into persistent records.

This is a working application, not a mock-up. Every offer, bid, order and notification is
written to a real database, and the commercial rules (stock limits, bid increments,
turn-taking in negotiation) are enforced on the server.

---

## Run it

```bash
npm install
npm run db:push      # create the SQLite schema
npm run db:seed      # load the Mohali demonstration dataset
npm run dev          # http://localhost:3000
```

All demo accounts use the password **`demo1234`**:

| Account | Phone | Notes |
| --- | --- | --- |
| Farmer A — Gurpreet Singh | `+919810000001` | Kharar · 500 kg tomatoes, 200 kg potatoes |
| Farmer B — Harjit Kaur | `+919810000002` | Banur · onions, cauliflower (live auction) |
| Retailer — Verma Fresh Vegetables | `+919810000011` | Zirakpur |
| Restaurant — Spice Route Kitchens | `+919810000012` | Chandigarh |
| Wholesaler — Yadav Wholesale Mandi | `+919810000013` | Delhi |
| Transporter — Balwinder Singh | `+919810000021` | Tempo, 2,500 kg |
| Administrator | `+919810000099` | Moderation, users, reports |

The sign-in screen has one-tap buttons that fill these in.

---

## The demonstration sequence

1. Sign in as **Farmer A**, open **List by voice**.
2. Speak or type: *"Mere paas kal subah 500 kilo fresh tomatoes available hain. Main
   Mohali mein hoon. Mujhe 20 rupaye kilo se achha rate chahiye."*
3. Watch the parser extract produce, quantity, place, date and a **minimum** price.
   Edit any field, then publish.
4. Sign in as **Retailer**. The lot is in the marketplace; send an offer.
5. Back as **Farmer A**: review the offer, which is ranked by *net proceeds* with fee and
   freight deducted. Counter it, then accept the buyer's reply.
6. An order is created, stock is decremented, both parties are notified.
7. Open a lot → **Start auction** → set floor, increment and duration.
8. Sign in as the other demo buyers and bid. The server rejects bids below the increment,
   bids after the close, and self-bids.
9. Award the winning bid. The farmer keeps final control: closing alone creates nothing.

---

## Architecture

```
src/
  app/
    (public)/          landing page + public marketplace preview
    auth/ onboarding/  credential flow and profile completion
    farmer/            dashboard, voice listing, listings, offers, auctions, orders, earnings
    buyer/             dashboard, marketplace, product detail, offers, auctions, orders
    transporter/       load board, deliveries
    admin/             overview, users, listings, transactions, reports
    notifications/     in-app inbox
    offline/           service-worker fallback
  components/          design system (ui/) + feature components
  lib/
    ai/                lexicon, extraction, search parsing, LLM provider seam
    services/          offers, auctions, pricing, matching — all server-side rules
    actions/           validated server actions ("use server")
    queries/           read models for pages
  hooks/               Web Speech API wrappers
prisma/schema.prisma   local SQLite model
supabase/schema.sql    production Postgres + enums, constraints, RLS
public/sw.js           service worker
```

### Key decisions

**The database is provider-switched, not watered down.** The prototype runs SQLite so it
starts with zero external services and the entire demo sequence is reproducible offline.
`supabase/schema.sql` is the production target: the same entities with real enums, check
constraints, updated-at triggers and Row Level Security policies so a user can only read
their own offers, orders, quotes and notifications.

**AI has a real fallback.** `AI_PROVIDER=rules` runs a deterministic multilingual parser
(Hindi, Punjabi, Hinglish, English) with a commodity lexicon, spoken numerals
(*paanch sau*, *dedh sau*), Indian units (quintal/tonne normalised to kg), relative dates
(*kal subah*, *parso*) and a place gazetteer for the Mohali belt. Set `AI_PROVIDER=llm`
with an OpenAI-compatible key and the same call routes through a model, validated against
a strict schema — falling back to the rules engine on any failure rather than erroring.

**Speech is browser-native by default.** Web Speech API for recognition, SpeechSynthesis
for spoken summaries, gated behind `NEXT_PUBLIC_STT_PROVIDER` / `TTS_PROVIDER`. Microphone
access requires HTTPS or localhost and explicit permission; every voice action has a text
fallback. Nothing claims to transcribe offline.

**Money is modelled honestly.** Offers are ranked by net proceeds, not headline price.
The platform fee (1.5%) and freight estimate (₹7.50/km/tonne) are always shown separately.
No payment is processed and no funds are held.

---

## What is real vs. what is labelled

| Real | Labelled |
| --- | --- |
| Listings, offers, counteroffers, orders, bids, notifications (persisted) | Seeded records carry a **Demo** tag |
| Server-enforced auction rules and stock limits | Market prices are **sample data in Agmarknet format**, never called official |
| Voice extraction and natural-language search | Competing auction bidders come from demo accounts |
| Role-based routing + database-validated sessions | Quality grades are *stated by the farmer* unless verified |
| Audit log of privileged and commercial actions | Distance map is schematic (coordinates are real, streets are not) |

No testimonials, partnerships or transaction statistics are invented anywhere in the UI.

---

## Verification

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run verify       # exercises the full commercial flow against the database
```

`npm run verify` drives the real service layer: parse a Hinglish sentence, publish a
listing, send an offer, counter it, accept it, confirm stock decrement and order maths,
then run an auction with a rejected low bid and an awarded winner. It cleans up after
itself.

---

## PWA

`manifest.webmanifest` declares the app, three icon sizes including a maskable variant,
and shortcuts to voice listing, marketplace and offers. `public/sw.js` precaches the
offline page and static build assets, uses network-first for navigations, and explicitly
**never** caches server actions or mutations. Drafts are stored on the device, shown with
a sync status, and published only when the user confirms after reconnecting.

## Limitations of this build

- No real payments, escrow or settlement.
- Pricing is indicative; no official Agmarknet feed is connected (the seam is documented).
- Auction bid boards poll every 20 seconds — no WebSocket/Supabase Realtime subscription
  is configured, and the UI says so.
- Location tracking is manual status entry by the transporter, not GPS streaming.
- Browser speech recognition depends on the browser's engine and needs connectivity;
  Firefox and some mobile browsers lack support entirely, hence the text fallback.
