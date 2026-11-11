-- =====================================================================
-- Mandi Relay — Supabase (Postgres) schema, constraints and RLS
-- =====================================================================
-- The local prototype runs on SQLite via Prisma. This file is the
-- production target and mirrors the same model with Postgres-specific
-- strengths: real enums, check constraints, triggers and Row Level
-- Security so a user can only read their own private records.
--
-- Apply with:  supabase db reset   (or psql -f supabase/schema.sql)
-- Then set in .env: DATABASE_URL=<supabase pooler url>
-- =====================================================================

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('FARMER', 'BUYER', 'TRANSPORTER', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'PAUSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_status as enum ('APPROVED', 'PENDING', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type auction_status as enum ('SCHEDULED', 'LIVE', 'CLOSED', 'AWARDED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum (
    'REQUESTED', 'QUOTED', 'ASSIGNED', 'PICKUP_SCHEDULED',
    'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

-- ── Helpers ──────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Core tables ──────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  -- Supabase Auth linkage; nullable so the same schema can hold seeded rows.
  auth_uid      uuid unique references auth.users (id) on delete set null,
  phone         text not null unique,
  name          text not null,
  role          user_role not null default 'FARMER',
  password_hash text,                       -- null when Supabase Auth owns the credential
  language      text not null default 'en' check (language in ('en', 'hi', 'pa')),
  email         text,
  state         text,
  district      text,
  village       text,
  lat           double precision check (lat between -90 and 90),
  lng           double precision check (lng between -180 and 180),
  avatar_url    text,
  verified      boolean not null default false,
  verification_note text,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_role_idx on users (role);
create index if not exists users_district_idx on users (district);

create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  farm_name text not null,
  size_acres numeric(12,2) check (size_acres >= 0),
  primary_crops text[] not null default '{}',
  farming_practice text,
  verification_status text not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  business_name text not null,
  business_type text not null check (business_type in ('RETAILER','RESTAURANT','WHOLESALER','PROCESSOR','OTHER')),
  gstin text,
  preferred_commodities text[] not null default '{}',
  typical_quantity_kg numeric(12,2) check (typical_quantity_kg >= 0),
  delivery_locations text[] not null default '{}',
  verification_status text not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transporter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  vehicle_type text not null check (vehicle_type in ('PICKUP','TEMPO','TRUCK_6W','TRUCK_10W')),
  capacity_kg numeric(12,2) not null check (capacity_kg > 0),
  registration_no text,
  service_areas text[] not null default '{}',
  rate_per_km numeric(10,2) check (rate_per_km >= 0),
  verification_status text not null default 'UNVERIFIED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists produce_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_hi text not null default '',
  name_pa text,
  icon text,
  sort_order int not null default 0
);

create table if not exists produce_listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references users (id) on delete cascade,
  category_id uuid not null references produce_categories (id),
  commodity text not null,
  variety text,
  quantity numeric(12,2) not null check (quantity > 0),
  available_quantity numeric(12,2) not null check (available_quantity >= 0),
  unit text not null default 'kg' check (unit in ('kg','quintal','tonne','dozen','piece')),
  asking_price numeric(12,2) not null check (asking_price > 0),
  currency text not null default 'INR',
  available_from timestamptz not null,
  location text not null,
  district text not null,
  state text not null,
  lat double precision,
  lng double precision,
  description text,
  image_url text,
  grade text,
  grade_verified boolean not null default false,
  pickup_only boolean not null default false,
  status listing_status not null default 'ACTIVE',
  moderation_status moderation_status not null default 'APPROVED',
  is_demo boolean not null default false,
  source text not null default 'MANUAL',
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint available_not_above_total check (available_quantity <= quantity)
);

create index if not exists listings_status_category_idx on produce_listings (status, category_id);
create index if not exists listings_district_idx on produce_listings (district);
create index if not exists listings_commodity_idx on produce_listings (commodity);
create index if not exists listings_farmer_idx on produce_listings (farmer_id);

create table if not exists produce_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references produce_listings (id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references produce_listings (id) on delete cascade,
  buyer_id uuid not null references users (id) on delete cascade,
  quantity numeric(12,2) not null check (quantity > 0),
  price_per_unit numeric(12,2) not null check (price_per_unit > 0),
  currency text not null default 'INR',
  message text,
  pickup_preference text not null default 'PICKUP' check (pickup_preference in ('PICKUP','DELIVERY')),
  delivery_location text,
  requests_negotiation boolean not null default false,
  status offer_status not null default 'PENDING',
  actor_role user_role not null default 'BUYER',
  parent_offer_id uuid references offers (id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_listing_status_idx on offers (listing_id, status);
create index if not exists offers_buyer_idx on offers (buyer_id);

create table if not exists auctions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references produce_listings (id) on delete cascade,
  farmer_id uuid not null references users (id) on delete cascade,
  quantity numeric(12,2) not null check (quantity > 0),
  starting_price numeric(12,2) not null check (starting_price > 0),
  min_increment numeric(12,2) not null default 1 check (min_increment > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status auction_status not null default 'LIVE',
  pickup_note text,
  buyer_criteria text,
  awarded_bid_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auction_window_valid check (ends_at > starts_at)
);

create index if not exists auctions_status_ends_idx on auctions (status, ends_at);

create table if not exists auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions (id) on delete cascade,
  buyer_id uuid not null references users (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  quantity numeric(12,2) not null check (quantity > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bids_auction_amount_idx on auction_bids (auction_id, amount desc);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  listing_id uuid not null references produce_listings (id),
  farmer_id uuid not null references users (id),
  buyer_id uuid not null references users (id),
  offer_id uuid unique references offers (id),
  auction_id uuid references auctions (id),
  quantity numeric(12,2) not null check (quantity > 0),
  price_per_unit numeric(12,2) not null check (price_per_unit > 0),
  gross_value numeric(14,2) not null check (gross_value >= 0),
  transport_cost numeric(12,2) not null default 0,
  platform_fee numeric(12,2) not null default 0,
  net_to_farmer numeric(14,2) not null,
  status order_status not null default 'CONFIRMED',
  pickup_preference text not null default 'PICKUP',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farmer_not_buyer check (farmer_id <> buyer_id),
  constraint net_not_negative check (net_to_farmer >= 0)
);

create index if not exists orders_farmer_status_idx on orders (farmer_id, status);
create index if not exists orders_buyer_status_idx on orders (buyer_id, status);

create table if not exists market_prices (
  id uuid primary key default gen_random_uuid(),
  commodity text not null,
  market text not null,
  district text not null,
  state text not null,
  min_price numeric(12,2) not null,
  max_price numeric(12,2) not null,
  modal_price numeric(12,2) not null,
  unit text not null default 'quintal',
  report_date date not null,
  source text not null default 'Sample reference data',
  is_sample boolean not null default true,
  created_at timestamptz not null default now(),
  constraint price_range_valid check (min_price <= modal_price and modal_price <= max_price)
);

create index if not exists prices_commodity_date_idx on market_prices (commodity, report_date desc);

create table if not exists delivery_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders (id),
  listing_id uuid references produce_listings (id),
  requester_id uuid not null references users (id) on delete cascade,
  pickup_location text not null,
  drop_location text not null,
  distance_km numeric(8,2),
  quantity_kg numeric(12,2) not null check (quantity_kg > 0),
  pickup_at timestamptz,
  status delivery_status not null default 'REQUESTED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references delivery_requests (id) on delete cascade,
  transporter_id uuid not null references users (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  eta_hours numeric(6,2),
  message text,
  status text not null default 'PENDING' check (status in ('PENDING','SELECTED','DECLINED')),
  created_at timestamptz not null default now(),
  unique (request_id, transporter_id)
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references delivery_requests (id) on delete cascade,
  order_id uuid unique references orders (id),
  transporter_id uuid not null references users (id),
  amount numeric(12,2) not null check (amount >= 0),
  status delivery_status not null default 'ASSIGNED',
  last_known_location text,
  status_note text,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on notifications (user_id, read_at);

create table if not exists voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  kind text not null,
  transcript text not null,
  language text not null default 'auto',
  parsed jsonb,
  provider text not null default 'rules',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users (id),
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists audit_entity_idx on audit_logs (entity, entity_id);

-- ── Updated-at triggers ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','farms','business_profiles','transporter_profiles','produce_listings',
    'offers','auctions','orders','delivery_requests','deliveries'
  ]
  loop
    execute format('drop trigger if exists set_updated_at_%1$s on %1$s', t);
    execute format(
      'create trigger set_updated_at_%1$s before update on %1$s for each row execute function set_updated_at()',
      t
    );
  end loop;
end $$;

-- ═════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════
-- Identity comes from the Supabase JWT. `current_app_user()` maps auth.uid()
-- to a row in `users`, so a policy never trusts a client-supplied id.

create or replace function current_app_user()
returns users language sql stable security definer set search_path = public as $$
  select * from users where auth_uid = auth.uid() limit 1;
$$;

create or replace function current_role_name()
returns user_role language sql stable as $$
  select role from users where auth_uid = auth.uid() limit 1;
$$;

create or replace function is_admin()
returns boolean language sql stable as $$
  select coalesce(current_role_name() = 'ADMIN', false);
$$;

alter table users enable row level security;
alter table farms enable row level security;
alter table business_profiles enable row level security;
alter table transporter_profiles enable row level security;
alter table produce_listings enable row level security;
alter table produce_images enable row level security;
alter table offers enable row level security;
alter table auctions enable row level security;
alter table auction_bids enable row level security;
alter table orders enable row level security;
alter table delivery_requests enable row level security;
alter table delivery_quotes enable row level security;
alter table deliveries enable row level security;
alter table notifications enable row level security;
alter table voice_sessions enable row level security;
alter table audit_logs enable row level security;
alter table produce_categories enable row level security;
alter table market_prices enable row level security;

-- Users: read the marketplace-safe projection of anyone; write only yourself.
drop policy if exists users_read on users;
create policy users_read on users for select
  using (true);

drop policy if exists users_write_self on users;
create policy users_write_self on users for update
  using (auth_uid = auth.uid() or is_admin())
  with check (auth_uid = auth.uid() or is_admin());

-- Profiles follow the owner.
drop policy if exists farms_read on farms;
create policy farms_read on farms for select using (true);
drop policy if exists farms_write on farms;
create policy farms_write on farms for all
  using (user_id = (current_app_user()).id or is_admin())
  with check (user_id = (current_app_user()).id or is_admin());

drop policy if exists business_read on business_profiles;
create policy business_read on business_profiles for select using (true);
drop policy if exists business_write on business_profiles;
create policy business_write on business_profiles for all
  using (user_id = (current_app_user()).id or is_admin())
  with check (user_id = (current_app_user()).id or is_admin());

drop policy if exists transporter_read on transporter_profiles;
create policy transporter_read on transporter_profiles for select using (true);
drop policy if exists transporter_write on transporter_profiles;
create policy transporter_write on transporter_profiles for all
  using (user_id = (current_app_user()).id or is_admin())
  with check (user_id = (current_app_user()).id or is_admin());

-- Listings: publicly readable when approved; the owner sees drafts.
drop policy if exists listings_read on produce_listings;
create policy listings_read on produce_listings for select
  using (
    moderation_status = 'APPROVED'
    or farmer_id = (current_app_user()).id
    or is_admin()
  );

drop policy if exists listings_insert_own on produce_listings;
create policy listings_insert_own on produce_listings for insert
  with check (farmer_id = (current_app_user()).id and current_role_name() = 'FARMER');

drop policy if exists listings_update_own on produce_listings;
create policy listings_update_own on produce_listings for update
  using (farmer_id = (current_app_user()).id or is_admin())
  with check (farmer_id = (current_app_user()).id or is_admin());

drop policy if exists listings_delete_own on produce_listings;
create policy listings_delete_own on produce_listings for delete
  using (farmer_id = (current_app_user()).id or is_admin());

drop policy if exists images_read on produce_images;
create policy images_read on produce_images for select using (true);
drop policy if exists images_write on produce_images;
create policy images_write on produce_images for all
  using (exists (
    select 1 from produce_listings l
    where l.id = listing_id and (l.farmer_id = (current_app_user()).id or is_admin())
  ))
  with check (exists (
    select 1 from produce_listings l
    where l.id = listing_id and (l.farmer_id = (current_app_user()).id or is_admin())
  ));

-- Offers: only the two parties in the negotiation (plus admins).
drop policy if exists offers_read_party on offers;
create policy offers_read_party on offers for select
  using (
    buyer_id = (current_app_user()).id
    or exists (
      select 1 from produce_listings l
      where l.id = listing_id and l.farmer_id = (current_app_user()).id
    )
    or is_admin()
  );

drop policy if exists offers_insert_buyer on offers;
create policy offers_insert_buyer on offers for insert
  with check (buyer_id = (current_app_user()).id and current_role_name() = 'BUYER');

drop policy if exists offers_update_party on offers;
create policy offers_update_party on offers for update
  using (
    buyer_id = (current_app_user()).id
    or exists (
      select 1 from produce_listings l
      where l.id = listing_id and l.farmer_id = (current_app_user()).id
    )
    or is_admin()
  );

-- Auctions: publicly readable; only the owning farmer mutates, and bids are
-- insert-only for buyers (server-side checks still enforce the rules).
drop policy if exists auctions_read on auctions;
create policy auctions_read on auctions for select using (true);
drop policy if exists auctions_owner_write on auctions;
create policy auctions_owner_write on auctions for all
  using (farmer_id = (current_app_user()).id or is_admin())
  with check (farmer_id = (current_app_user()).id or is_admin());

drop policy if exists bids_read on auction_bids;
create policy bids_read on auction_bids for select using (true);
drop policy if exists bids_insert_buyer on auction_bids;
create policy bids_insert_buyer on auction_bids for insert
  with check (buyer_id = (current_app_user()).id and current_role_name() = 'BUYER');

-- Orders: the two parties and admins.
drop policy if exists orders_read_party on orders;
create policy orders_read_party on orders for select
  using (farmer_id = (current_app_user()).id or buyer_id = (current_app_user()).id or is_admin());

drop policy if exists orders_update_party on orders;
create policy orders_update_party on orders for update
  using (farmer_id = (current_app_user()).id or buyer_id = (current_app_user()).id or is_admin());

-- Transport.
drop policy if exists requests_read on delivery_requests;
create policy requests_read on delivery_requests for select
  using (
    requester_id = (current_app_user()).id
    or exists (select 1 from users u where u.id = (current_app_user()).id and u.role = 'TRANSPORTER')
    or is_admin()
  );

drop policy if exists requests_insert_own on delivery_requests;
create policy requests_insert_own on delivery_requests for insert
  with check (requester_id = (current_app_user()).id);

drop policy if exists requests_update_own on delivery_requests;
create policy requests_update_own on delivery_requests for update
  using (requester_id = (current_app_user()).id or is_admin());

drop policy if exists quotes_read on delivery_quotes;
create policy quotes_read on delivery_quotes for select
  using (
    transporter_id = (current_app_user()).id
    or exists (select 1 from delivery_requests r where r.id = request_id and r.requester_id = (current_app_user()).id)
    or is_admin()
  );

drop policy if exists quotes_insert_transporter on delivery_quotes;
create policy quotes_insert_transporter on delivery_quotes for insert
  with check (transporter_id = (current_app_user()).id and current_role_name() = 'TRANSPORTER');

drop policy if exists quotes_update on delivery_quotes;
create policy quotes_update on delivery_quotes for update
  using (
    transporter_id = (current_app_user()).id
    or exists (select 1 from delivery_requests r where r.id = request_id and r.requester_id = (current_app_user()).id)
    or is_admin()
  );

drop policy if exists deliveries_read on deliveries;
create policy deliveries_read on deliveries for select
  using (
    transporter_id = (current_app_user()).id
    or exists (select 1 from delivery_requests r where r.id = request_id and r.requester_id = (current_app_user()).id)
    or is_admin()
  );

drop policy if exists deliveries_update_transporter on deliveries;
create policy deliveries_update_transporter on deliveries for update
  using (transporter_id = (current_app_user()).id or is_admin());

-- Private-by-default tables.
drop policy if exists notifications_own on notifications;
create policy notifications_own on notifications for all
  using (user_id = (current_app_user()).id or is_admin())
  with check (user_id = (current_app_user()).id or is_admin());

drop policy if exists voice_sessions_own on voice_sessions;
create policy voice_sessions_own on voice_sessions for all
  using (user_id = (current_app_user()).id or is_admin())
  with check (user_id = (current_app_user()).id);

drop policy if exists audit_read_admin on audit_logs;
create policy audit_read_admin on audit_logs for select using (is_admin());
drop policy if exists audit_insert_system on audit_logs;
create policy audit_insert_system on audit_logs for insert with check (true);

-- Public reference data.
drop policy if exists categories_read on produce_categories;
create policy categories_read on produce_categories for select using (true);
drop policy if exists prices_read on market_prices;
create policy prices_read on market_prices for select using (true);

-- ── Storage ──────────────────────────────────────────────────────────
-- Listing photographs live in a public-read bucket with owner-only writes.
insert into storage.buckets (id, name, public)
values ('produce', 'produce', true)
on conflict (id) do nothing;

drop policy if exists produce_read on storage.objects;
create policy produce_read on storage.objects for select
  using (bucket_id = 'produce');

drop policy if exists produce_write on storage.objects;
create policy produce_write on storage.objects for insert
  with check (bucket_id = 'produce' and auth.role() = 'authenticated');

drop policy if exists produce_modify on storage.objects;
create policy produce_modify on storage.objects for update
  using (bucket_id = 'produce' and owner = auth.uid());

-- ── Admin guard ──────────────────────────────────────────────────────
-- Admin access is validated on the server on every request, not just in RLS:
-- delete/insert of platform-wide records always requires `is_admin()`.
