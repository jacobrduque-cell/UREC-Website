-- =====================================================================
-- Supabase stand-in objects for LOCAL / CI Postgres RLS testing
-- =====================================================================
--
-- On the real project these schemas and objects are provided by Supabase
-- (GoTrue auth, Storage) and by the platform's role setup. A plain local
-- Postgres does not have them, so the migration chain (which references
-- auth.users, auth.uid(), storage.objects, storage.foldername, and the
-- anon/authenticated/service_role roles) will not apply without them.
--
-- This file recreates JUST ENOUGH of that surface to run the migrations
-- and exercise Row Level Security exactly the way Supabase does:
--   * auth.uid() reads request.jwt.claim.sub, the same GUC PostgREST sets
--     from the JWT on every request. Tests set it with set_config(...).
--   * The API roles (anon / authenticated / service_role) exist so the
--     migrations' `to authenticated` policies and grants apply, and so a
--     test can `set local role authenticated` to run UNDER RLS.
--
-- It is NOT application code and never ships to production — it only
-- backfills what Supabase already gives you. Keep it in sync with the
-- Supabase objects the migrations actually touch.

-- ---- schemas -------------------------------------------------------
create schema if not exists auth;
create schema if not exists storage;

-- ---- API roles (Supabase creates these) ----------------------------
do $$ begin create role anon;          exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role;  exception when duplicate_object then null; end $$;

-- ---- auth.users + auth.uid() ---------------------------------------
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- The heart of RLS testing: auth.uid() returns whoever the current
-- request "is", read from the request.jwt.claim.sub GUC. A test sets it
-- per-transaction with:  select set_config('request.jwt.claim.sub', '<uuid>', true);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- ---- storage.objects / storage.buckets / storage.foldername --------
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid, metadata jsonb
);
-- Supabase's helper: splits an object path into folder segments so a
-- policy can check e.g. (storage.foldername(name))[2] = auth.uid()::text
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/'); $$;

-- ---- grants Supabase applies out-of-band ---------------------------
grant usage on schema auth to authenticated, anon, service_role;
grant usage on schema storage to authenticated, anon, service_role;
grant select on auth.users to authenticated, service_role;
-- Storage policies are `to authenticated`; without table grants an
-- INSERT/SELECT would fail on privileges before RLS is even consulted,
-- so the RLS tests would pass/fail for the wrong reason. Supabase grants
-- these; we mirror that here.
grant select, insert, update, delete on storage.objects to authenticated, service_role;
grant select on storage.buckets to authenticated, service_role;

-- RLS on storage.objects is turned on by Supabase before any policy is
-- created; the migrations only add policies, so enable it here.
alter table storage.objects enable row level security;
