-- =====================================================================
-- Mandi Relay — Supabase Row Level Security
-- =====================================================================
-- Prisma owns the tables (`npx prisma db push` against the Supabase
-- connection string). This file adds only what Prisma cannot express: what a
-- browser holding the project's public anon key may do with them.
--
-- Apply after the tables exist:
--   npx prisma db execute --file supabase/policies.sql --schema prisma/schema.prisma
-- (or paste it into the Supabase SQL editor)
--
-- ── Why every table is locked ───────────────────────────────────────
-- Authentication is owned by the application, not by Supabase Auth: sign-in is
-- email + password (scrypt hashes in "User"."passwordHash") or Google OAuth,
-- both of which end in an httpOnly session cookie checked in `src/lib/auth.ts`.
-- No browser ever sends a Supabase JWT, so there is no `auth.uid()` to key a
-- policy on, and Supabase's anon key cannot represent a Mandi Relay user.
--
-- Therefore the only correct posture for the anon and authenticated roles is
-- "no access at all". The Next.js server connects as the database owner, which
-- bypasses RLS, and it already scopes every query by the session user. So:
--
--   • RLS is enabled on every table in `public`,
--   • every policy is dropped (enabled + no policy = nothing is visible),
--   • table privileges are revoked from anon/authenticated as a second wall.
--
-- A leaked NEXT_PUBLIC_SUPABASE_ANON_KEY therefore exposes nothing: no offers,
-- no orders, no phone numbers. Re-run this file after adding tables; it is
-- idempotent and covers new tables automatically.
-- =====================================================================

do $$
declare
  tbl text;
  pol text;
begin
  for tbl in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);

    -- Drop every existing policy, whatever it was named.
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol, tbl);
    end loop;

    -- Second wall: the roles Supabase hands to browser clients.
    execute format('revoke all on table public.%I from anon, authenticated', tbl);
  end loop;
end
$$;

-- Sequences are not needed by browser clients either.
do $$
declare
  seq text;
begin
  for seq in
    select sequence_name from information_schema.sequences where sequence_schema = 'public'
  loop
    execute format('revoke all on sequence public.%I from anon, authenticated', seq);
  end loop;
end
$$;

-- Functions created by earlier versions of this file assumed Supabase Auth.
drop function if exists app_user_id();
drop function if exists app_user_role();
drop function if exists listing_is_public(text);
