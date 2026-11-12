# Mandi Relay

**Your Produce. Your Market. Your Voice.**

A voice-first agricultural marketplace for India. A farmer speaks what they have
harvested; the app extracts a structured listing, puts it in front of nearby buyers, and
turns offers, counteroffers and orders into persistent records.

This is a working application, not a mock-up. There are **no demo accounts and no seeded
market data**: every listing, offer, order and notification in the database was created by
a real person using the app.

---

## Run it

```bash
npm install
npm run db:local     # Postgres 16 in Docker on port 5433 (or point DATABASE_URL at Supabase)
npm run db:push      # create the tables from prisma/schema.prisma
npm run db:seed      # produce categories only — no accounts, no listings
npm run dev          # http://localhost:3000
```

To use Supabase instead of the local container, put the project's pooled connection string
in `DATABASE_URL` and apply the RLS policies once:

```bash
npx prisma db push                                   # or: prisma migrate deploy
psql "$DATABASE_URL" -f supabase/policies.sql        # or paste into the Supabase SQL editor
```

### Authentication: phone number + one-time code

Sign-in is a phone number and a 6-digit SMS code, handled by Supabase Auth.

1. Supabase dashboard → **Authentication → Providers → Phone** → enable.
2. Configure an SMS provider (Twilio, Vonage, MessageBird or Textlocal) with its
   credentials. Supabase will not send a code without one.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

`/auth` sends the code client-side with the public key, then a server action maps the proven
phone number onto the application's own `User` row (where the role, district and profile
live) and hands out the role's workspace. New numbers choose a role first, verify, and land
on `/onboarding`.

If those two variables are absent the app falls back to a local development provider
(database session cookie + password) and says so on the sign-in screen — useful for
offline work, never used in production.

### Voice: Gnani (Vachana)

The browser records, downsamples to 16 kHz mono WAV and posts it to
`POST /api/voice/transcribe`, which calls Gnani's REST speech-to-text with a server-side
key. The key is never exposed to the client.

```bash
GNANI_API_KEY="..."             # create it at app.gnani.ai/voice
NEXT_PUBLIC_STT_PROVIDER="gnani" # "browser" falls back to the Web Speech API
```

Without a key the endpoint answers `503` and the interface asks the farmer to type; every
voice screen has a text path, so nothing is blocked.

### Reference prices: the official Agmarknet feed

Prices are never invented. `PriceReference` rows are written only by the ingestion service,
which reads the Agmarknet resource on data.gov.in (daily min/max/modal wholesale prices per
mandi) and keeps the market, variety, report date and source on every row.

```bash
AGMARKNET_API_KEY="..."   # free key from data.gov.in
npm run prices:sync       # or: POST /api/market-prices/sync with x-sync-secret
```

Agmarknet quotes ₹ per quintal; the interface converts to ₹/kg to compare with an asking
price. With no key the table stays empty and the UI says a quotation is not loaded rather
than showing a placeholder number.

### Feature switches

Live auctions are **paused**. `FEATURES.auctions` (`src/lib/features.ts`) is false unless
`NEXT_PUBLIC_ENABLE_AUCTIONS=true`; while paused the auction routes return 404, the nav
entries and dashboard panels are not rendered, no lot advertises a live auction, and the
auction server actions refuse to run. The service layer and its tests remain, so flipping
the flag is the whole re-enable story.

---

## Architecture

```
src/
  app/
    (public)/          landing page + public marketplace preview
    auth/ onboarding/  phone-OTP sign-in and profile completion
    api/               voice transcribe proxy, price sync, health
    farmer/            dashboard, voice listing, listings, offers, orders, earnings
    buyer/             dashboard, marketplace, product detail, offers, orders
    transporter/       load board, deliveries
    admin/             overview, users, listings, transactions, reports
    notifications/     in-app inbox
    offline/           service-worker fallback
  components/          design system (ui/) + feature components
  lib/
    ai/                lexicon, extraction, search parsing, LLM provider seam
    services/          offers, auctions, pricing, matching, market prices
    actions/           validated server actions ("use server")
    queries/           read models for pages
    supabase/          browser + server clients, config
  hooks/               Gnani recorder / Web Speech wrapper
prisma/schema.prisma   Postgres data model (Supabase)
supabase/policies.sql  Row Level Security for direct client access
public/sw.js           service worker
```

### Key decisions

**One database, and it is Postgres.** Prisma owns the tables and runs against Supabase
(pooled connection for the app, direct connection for migrations). `supabase/policies.sql`
adds what Prisma cannot express: RLS so a leaked anon key cannot read someone else's phone
number, offers, orders or address. The server connects as the owner role and scopes every
query in `src/lib/auth.ts`.

**Phone ownership is proven, not typed.** Supabase Auth verifies the number with an SMS
code; the application row stores `authUserId` and treats the phone as verified. Roles are
still ours: they are chosen at sign-up and enforced on the server for every route and
action, never trusted from the client.

**AI has a real fallback.** `AI_PROVIDER=rules` runs a deterministic multilingual parser
(Hindi, Punjabi, Hinglish, English) with a commodity lexicon, spoken numerals
(*paanch sau*, *dedh sau*), Indian units (quintal/tonne normalised to kg), relative dates
(*kal subah*, *parso*) and a place gazetteer for the Mohali belt. Set `AI_PROVIDER=llm` with
an OpenAI-compatible key and the same call routes through a model, validated against a
strict schema — falling back to the rules engine on any failure rather than erroring.

**Speech has a server-side key and a text path.** Gnani (Vachana Prisma) does the
transcription in ten Indian languages, including Punjabi; if the key or the network is
missing the farmer can type instead. Nothing claims to transcribe offline.

**Money is modelled honestly.** Offers are ranked by net proceeds, not headline price. The
platform fee (1.5%) and freight estimate (₹7.50/km/tonne) are always shown separately. No
payment is processed and no funds are held.

---

## What is real vs. what is estimated

| Real | Estimated / attributed |
| --- | --- |
| Listings, offers, counteroffers, orders, notifications (persisted) | Freight cost is a planning estimate, not a transporter quote |
| Server-enforced stock limits and negotiation turn-taking | Quality grades are *stated by the farmer* unless verified |
| Voice extraction and natural-language search | Distance map is schematic (coordinates are real, streets are not) |
| Role-based routing + provider-validated sessions | |
| Official Agmarknet reference prices, with source and report date | |

No testimonials, partnerships, demo accounts or transaction statistics are invented anywhere
in the UI.

---

## Verification

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
npm run verify       # 45 checks against the real database
```

`npm run verify` creates its own throwaway accounts (nothing is seeded), then drives the real
service layer: parse a Hinglish sentence, publish a listing, send an offer, counter it,
accept it, confirm stock decrement and order maths, and exercise the auction engine
(deliberately still covered while the feature is paused). It removes every row it created.

`GET /api/health` reports database reachability and which integrations are configured,
without exposing any secret.

---

## PWA

`manifest.webmanifest` declares the app, three icon sizes including a maskable variant, and
shortcuts to voice listing, marketplace and offers. `public/sw.js` precaches the offline page
and static build assets, uses network-first for navigations, and explicitly **never** caches
server actions or mutations. Drafts are stored on the device, shown with a sync status, and
published only when the user confirms after reconnecting.

## Limitations of this build

- No real payments, escrow or settlement.
- Live auctions are paused by design; re-enable with `NEXT_PUBLIC_ENABLE_AUCTIONS=true`.
- The price feed is a snapshot per sync — there is no scheduled job in this repo; point a
  cron at `POST /api/market-prices/sync` with `MARKET_PRICES_SYNC_SECRET`.
- Auction bid boards poll every 20 seconds — no WebSocket/Supabase Realtime subscription is
  configured, and the UI says so.
- Location tracking is manual status entry by the transporter, not GPS streaming.
- Phone sign-in needs an SMS provider configured in Supabase; without one Supabase returns an
  error that the sign-in screen surfaces verbatim.
