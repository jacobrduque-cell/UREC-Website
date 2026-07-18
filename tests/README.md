# Tests

## RLS / database tests (`tests/rls/`)

These are the most important tests in the project: security depends on
Postgres Row Level Security, and these assert the boundaries directly.
Each run spins up a throwaway database, applies the **entire** migration
chain in `supabase/migrations/` plus `supabase/seed.sql`, seeds a small
fixture (an exec, two enrolled students, an outsider, a quiz, a file
submission), then checks who can read/write what — exactly as PostgreSQL
evaluates a policy for a logged-in user.

If a migration ever breaks the chain, or a policy change accidentally
lets a student read a classmate's submission or write their own grade,
these go red.

### Run them

You need a Postgres you can create databases on. Point the standard
`PG*` env vars at it:

```bash
# local example (a superuser 'postgres' with password 'postgres')
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres npm run test:rls
```

`npm test` runs the same suite. CI (`.github/workflows/ci.yml`) runs it
against a `postgres:16` service container on every push, alongside
typecheck, lint, and build.

### Add a test

Open `tests/rls/rls.test.mjs` and add a `test(...)` block. Use the
helpers from `harness.mjs`:

- `freshDb()` — a fresh migrated+seeded database (done once in `before`).
- `tryAsUser(db, userId, sql, params)` — run a query as that user under
  RLS, rolled back afterward; returns `{ ok, rows, rowCount, error }`.

The fixture user ids (`EXEC`, `STU`, `OTHER`, `OUTSIDER`) and the seeded
`course` id are already set up at the top of the file.
