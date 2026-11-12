-- =====================================================================
-- Mandi Relay — Supabase Row Level Security
-- =====================================================================
-- Prisma owns the tables (`npx prisma db push` or `prisma migrate deploy`
-- against the Supabase connection string). This file adds only what Prisma
-- cannot express: who may read or write each row when a browser talks to
-- Postgres directly with the public anon key.
--
-- Apply after the tables exist:
--   psql "$DATABASE_URL" -f supabase/policies.sql
-- (or paste it into the Supabase SQL editor)
--
-- The Next.js server connects with the database owner role, which bypasses
-- RLS — that is intentional: every server query is already scoped by
-- `src/lib/auth.ts`. These policies exist so a leaked anon key cannot read
-- another person's offers, orders or phone number.
--
-- Safe to re-run: policies are dropped and recreated.
-- =====================================================================

-- ── Identity helpers ────────────────────────────────────────────────
-- The application stores Supabase's auth.users.id in "User"."authUserId".
-- Everything else resolves through it, so a policy never trusts a
-- client-supplied id.

create or replace function app_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.id from "User" u where u."authUserId" = auth.uid()::text limit 1;
$$;

create or replace function app_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role from "User" u where u."authUserId" = auth.uid()::text limit 1;
$$;

-- A listing is publicly visible only when a farmer has published it and
-- moderation has not blocked it.
create or replace function listing_is_public(listing_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from "Listing" l
    where l.id = listing_id
      and l."moderationStatus" = 'APPROVED'
      and l.status in ('ACTIVE', 'RESERVED')
  );
$$;

-- ── Enable RLS everywhere ───────────────────────────────────────────
alter table "User"               enable row level security;
alter table "Farm"               enable row level security;
alter table "BusinessProfile"    enable row level security;
alter table "TransporterProfile" enable row level security;
alter table "Category"           enable row level security;
alter table "Listing"            enable row level security;
alter table "ListingImage"       enable row level security;
alter table "Offer"              enable row level security;
alter table "Auction"            enable row level security;
alter table "Bid"                enable row level security;
alter table "Order"              enable row level security;
alter table "PriceReference"     enable row level security;
alter table "DeliveryRequest"    enable row level security;
alter table "DeliveryQuote"      enable row level security;
alter table "Delivery"           enable row level security;
alter table "Notification"       enable row level security;
alter table "VoiceSession"       enable row level security;
alter table "AuditLog"           enable row level security;
alter table "Session"            enable row level security;

-- ── Reference data: readable by anyone, writable by nobody ──────────
drop policy if exists categories_read on "Category";
create policy categories_read on "Category" for select using (true);

drop policy if exists prices_read on "PriceReference";
create policy prices_read on "PriceReference" for select using (true);

-- ── Account and profiles ────────────────────────────────────────────
-- A user can read and update only their own row. Role and verification are
-- changed by the server, never by the client.
drop policy if exists users_read_self on "User";
create policy users_read_self on "User" for select using ("authUserId" = auth.uid()::text);

drop policy if exists users_update_self on "User";
create policy users_update_self on "User" for update
  using ("authUserId" = auth.uid()::text)
  with check ("authUserId" = auth.uid()::text);

drop policy if exists farms_owner on "Farm";
create policy farms_owner on "Farm" for all
  using ("userId" = app_user_id())
  with check ("userId" = app_user_id());

drop policy if exists businesses_owner on "BusinessProfile";
create policy businesses_owner on "BusinessProfile" for all
  using ("userId" = app_user_id())
  with check ("userId" = app_user_id());

drop policy if exists transporters_owner on "TransporterProfile";
create policy transporters_owner on "TransporterProfile" for all
  using ("userId" = app_user_id())
  with check ("userId" = app_user_id());

-- ── Listings and images ─────────────────────────────────────────────
drop policy if exists listings_public_read on "Listing";
create policy listings_public_read on "Listing" for select
  using ("moderationStatus" = 'APPROVED' and status in ('ACTIVE', 'RESERVED'));

drop policy if exists listings_owner_all on "Listing";
create policy listings_owner_all on "Listing" for all
  using ("farmerId" = app_user_id())
  with check ("farmerId" = app_user_id());

drop policy if exists listing_images_read on "ListingImage";
create policy listing_images_read on "ListingImage" for select
  using (listing_is_public("listingId"));

drop policy if exists listing_images_owner on "ListingImage";
create policy listing_images_owner on "ListingImage" for all
  using (exists (select 1 from "Listing" l where l.id = "listingId" and l."farmerId" = app_user_id()))
  with check (exists (select 1 from "Listing" l where l.id = "listingId" and l."farmerId" = app_user_id()));

-- ── Offers: visible to the two parties only ─────────────────────────
drop policy if exists offers_parties on "Offer";
create policy offers_parties on "Offer" for select
  using (
    "buyerId" = app_user_id()
    or exists (select 1 from "Listing" l where l.id = "listingId" and l."farmerId" = app_user_id())
  );

drop policy if exists offers_buyer_insert on "Offer";
create policy offers_buyer_insert on "Offer" for insert
  with check ("buyerId" = app_user_id() and listing_is_public("listingId"));

drop policy if exists offers_parties_update on "Offer";
create policy offers_parties_update on "Offer" for update
  using (
    "buyerId" = app_user_id()
    or exists (select 1 from "Listing" l where l.id = "listingId" and l."farmerId" = app_user_id())
  )
  with check (
    "buyerId" = app_user_id()
    or exists (select 1 from "Listing" l where l.id = "listingId" and l."farmerId" = app_user_id())
  );

-- ── Auctions (feature paused; policies keep the data private) ───────
drop policy if exists auctions_read on "Auction";
create policy auctions_read on "Auction" for select
  using (
    "farmerId" = app_user_id()
    or (status = 'LIVE' and exists (select 1 from "Listing" l where l.id = "listingId" and listing_is_public(l.id)))
  );

drop policy if exists auctions_owner_write on "Auction";
create policy auctions_owner_write on "Auction" for all
  using ("farmerId" = app_user_id())
  with check ("farmerId" = app_user_id());

drop policy if exists bids_read on "Bid";
create policy bids_read on "Bid" for select
  using (
    "buyerId" = app_user_id()
    or exists (select 1 from "Auction" a where a.id = "auctionId" and a."farmerId" = app_user_id())
  );

drop policy if exists bids_buyer_insert on "Bid";
create policy bids_buyer_insert on "Bid" for insert
  with check ("buyerId" = app_user_id());

-- ── Orders ──────────────────────────────────────────────────────────
drop policy if exists orders_parties on "Order";
create policy orders_parties on "Order" for select
  using ("buyerId" = app_user_id() or "farmerId" = app_user_id());

-- ── Transport ───────────────────────────────────────────────────────
drop policy if exists delivery_requests_parties on "DeliveryRequest";
create policy delivery_requests_parties on "DeliveryRequest" for select
  using (
    "requesterId" = app_user_id()
    or app_user_role() = 'TRANSPORTER'
    or exists (select 1 from "Order" o where o.id = "orderId" and (o."buyerId" = app_user_id() or o."farmerId" = app_user_id()))
  );

drop policy if exists delivery_requests_requester_write on "DeliveryRequest";
create policy delivery_requests_requester_write on "DeliveryRequest" for all
  using ("requesterId" = app_user_id())
  with check ("requesterId" = app_user_id());

drop policy if exists delivery_quotes_parties on "DeliveryQuote";
create policy delivery_quotes_parties on "DeliveryQuote" for select
  using (
    "transporterId" = app_user_id()
    or exists (select 1 from "DeliveryRequest" r where r.id = "requestId" and r."requesterId" = app_user_id())
  );

drop policy if exists delivery_quotes_transporter_write on "DeliveryQuote";
create policy delivery_quotes_transporter_write on "DeliveryQuote" for all
  using ("transporterId" = app_user_id())
  with check ("transporterId" = app_user_id());

drop policy if exists deliveries_parties on "Delivery";
create policy deliveries_parties on "Delivery" for select
  using (
    "transporterId" = app_user_id()
    or exists (select 1 from "DeliveryRequest" r where r.id = "requestId" and r."requesterId" = app_user_id())
  );

drop policy if exists deliveries_transporter_write on "Delivery";
create policy deliveries_transporter_write on "Delivery" for all
  using ("transporterId" = app_user_id())
  with check ("transporterId" = app_user_id());

-- ── Private by default ──────────────────────────────────────────────
drop policy if exists notifications_self on "Notification";
create policy notifications_self on "Notification" for all
  using ("userId" = app_user_id())
  with check ("userId" = app_user_id());

drop policy if exists voice_sessions_self on "VoiceSession";
create policy voice_sessions_self on "VoiceSession" for all
  using ("userId" = app_user_id())
  with check ("userId" = app_user_id());

-- No policies on "AuditLog" or "Session": they are server-only. With RLS
-- enabled and no policy, every client request is denied.
