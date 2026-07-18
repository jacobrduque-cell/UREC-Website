// Shared test harness for RLS / database tests.
//
// Spins up a throwaway database, installs stand-in `auth` and `storage`
// schemas that mimic what Supabase provides in the real project (a
// settable auth.uid(), the storage.objects table, storage.foldername(),
// the authenticated/anon/service_role roles), applies the ENTIRE
// migration chain in order plus the seed, and hands back a connection.
//
// Tests then run queries "as" a given user by opening a transaction,
// switching to the `authenticated` role, and setting the JWT sub claim —
// exactly how PostgREST evaluates RLS for a logged-in user. `asExec` /
// `asUser` / `asAnon` wrap that pattern.
//
// No Supabase network access is needed or used — this is pure local
// Postgres, so it runs the same on a laptop and in CI.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const SEED_FILE = join(REPO_ROOT, "supabase", "seed.sql");

// Admin connection info comes from the standard PG* env vars so this
// works both locally (a superuser postgres) and in CI (the postgres
// service container). Default to the local dev superuser.
const ADMIN = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGADMIN_DB || "postgres",
};
const TEST_DB = process.env.PGTESTDB || "urec_rls_test";

// The stand-in schemas Supabase would otherwise provide. Kept minimal —
// just enough surface for the migrations to apply and for RLS helpers to
// resolve auth.uid().
const PRELUDE = `
create schema if not exists auth;
create schema if not exists storage;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid, metadata jsonb
);
create table storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/'); $$;
do $$ begin create role anon;          exception when duplicate_object then null; end $$;
do $$ begin create role authenticated;  exception when duplicate_object then null; end $$;
do $$ begin create role service_role;   exception when duplicate_object then null; end $$;
grant usage on schema auth to authenticated, anon, service_role;
grant usage on schema storage to authenticated, anon, service_role;
grant select on auth.users to authenticated, service_role;
alter table storage.objects enable row level security;
`;

/**
 * Drop + recreate the test database, install the prelude, apply every
 * migration in filename order, then the seed. Returns a connected pg
 * Client to the fresh test DB. Caller is responsible for `client.end()`.
 */
export async function freshDb() {
  const admin = new Client(ADMIN);
  await admin.connect();
  // Terminate stragglers so DROP DATABASE doesn't block, then recreate.
  await admin.query(
    `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
    [TEST_DB],
  );
  await admin.query(`drop database if exists ${TEST_DB}`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  const db = new Client({ ...ADMIN, database: TEST_DB });
  await db.connect();
  await db.query(PRELUDE);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    try {
      await db.query(sql);
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${e.message}`);
    }
  }
  const seed = readFileSync(SEED_FILE, "utf8");
  await db.query(seed);

  return db;
}

/**
 * Run `fn(client)` inside a transaction as the `authenticated` role with
 * auth.uid() = userId, then ROLL BACK so the DB is untouched. This is how
 * we evaluate a policy exactly as a logged-in user would hit it. Returns
 * whatever fn returns. Set userId to null for an anonymous authenticated
 * session (rare).
 */
export async function asUser(db, userId, fn) {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
      userId ?? "",
    ]);
    const result = await fn(db);
    return result;
  } finally {
    // Always roll back: tests must not leak state into each other.
    await db.query("rollback");
  }
}

/** Convenience: does `sql` succeed for this user? Returns {ok, rows, error}. */
export async function tryAsUser(db, userId, sql, params = []) {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
    const res = await db.query(sql, params);
    await db.query("rollback");
    return { ok: true, rows: res.rows, rowCount: res.rowCount };
  } catch (e) {
    await db.query("rollback");
    return { ok: false, error: e.message };
  }
}
