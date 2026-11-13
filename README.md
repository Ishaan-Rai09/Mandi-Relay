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
npm run db:push      # create the tables in Supabase from prisma/schema.prisma
npm run db:seed      # produce categories only — no accounts, no listings
npm run dev          # http://localhost:3000
```

The database is Supabase Postgres; there is no local database to start. Put the project's
connection string in `DATABASE_URL` (Project Settings → Database) and apply the RLS policies
once:

```bash
npx prisma db push                                   # schema, no migration files
npx prisma db execute --file supabase/policies.sql --schema prisma/schema.prisma
```

### Authentication: email + password, or Google

No Supabase Auth and no phone OTP — the database is plain Postgres and the app
owns identity. Two ways in, one session:

- **Email + password.** scrypt hash (random salt, constant-time compare) in
  `User.passwordHash`, 8-character minimum, rate limited per IP and per address.
- **Google OAuth 2.0.** Authorization code + PKCE via
  `/api/auth/google` → `/api/auth/google/callback`, hand-rolled with no extra
  dependency. Only Google-verified addresses are accepted.

To enable Google: Google Cloud console → **APIs & Services → Credentials** →
Create OAuth client ID (Web application), with the authorised redirect URI
`http://localhost:3000/api/auth/google/callback` (and your production domain),
then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Without them the button
is hidden and the page says so.

Both paths end in the same place: a random token in an httpOnly `mr_session`
cookie, stored in the `Session` table with an expiry. `src/lib/auth.ts` resolves
it on every page and server action, so a forged cookie reaches a redirect and
never data.

### Password reset

`/forgot-password` sends the link, `/reset-password?token=…` sets the new
password. The link carries a 32-byte random token and the database keeps only
its SHA-256 (`PasswordResetToken`), so a leaked table cannot be turned back into
working links. A link lives 60 minutes, works once, and requesting another one
deletes the previous one. Saving a new password also deletes every `Session`
row for that account and issues a fresh one, so a reset signs out anyone else
who was holding the account.

Delivery goes through Resend's HTTP API — one POST, no SDK:

```bash
RESEND_API_KEY="re_..."                          # resend.com → API Keys
EMAIL_FROM="MANDI RELAY <no-reply@your-domain>"   # optional; needs a verified domain
```

The form answers identically whether or not the address has an account, so it
cannot be used to discover who is registered. With no key, a development build
shows the link on the page instead of emailing it; a production build logs the
failure and shows the same neutral message.

Administrators come from `ADMIN_EMAILS` (comma separated). Roles are chosen by
the person and enforced server-side; an allowlisted email is an ADMIN whatever
the form said, and nothing is seeded, so without that variable nobody can reach
`/admin`.

## Voice: Gnani (Vachana)

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
    auth/ onboarding/  email + Google sign-in and profile completion
    forgot-password/   request a single-use reset link
    reset-password/    set a new password from the emailed link
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
    auth/              sessions, Google OAuth, reset tokens, admin allowlist
  hooks/               Gnani recorder / Web Speech wrapper
prisma/schema.prisma   Postgres data model (Supabase)
supabase/policies.sql  Row Level Security for direct client access
public/sw.js           service worker
```

### Key decisions

**One database, and it is Postgres.** Prisma owns the tables and runs against Supabase
(pooled connection for the app, direct connection for migrations). `supabase/policies.sql`
adds what Prisma cannot express: RLS on every table with no policy and no grants for the
`anon`/`authenticated` roles, so a leaked anon key can read nothing at all — not a phone
number, offer, order or address. The server connects as the owner role and scopes every
query in `src/lib/auth.ts`.

**The password is never stored, only its hash.** scrypt with a per-password salt and a
constant-time comparison; sign-in returns the same answer for an unknown email as for a
wrong password, and the hash comparison runs either way. Roles are still ours: they are
chosen by the person and enforced on the server for every route and action, never trusted
from the client.

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
- Password reset needs `RESEND_API_KEY`; without it no email leaves the app. A development
  build shows the link on the page, a production build shows the neutral message and logs
  the failure, so a forgotten password still needs the provider configured.
