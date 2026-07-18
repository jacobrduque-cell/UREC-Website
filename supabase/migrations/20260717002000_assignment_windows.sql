-- ============================================================
-- Assignment availability windows (unlock_at / lock_at)
-- ============================================================
--
-- Canvas assignments have an availability window: unlock_at (before
-- which students can see it but can't submit) and lock_at (after which
-- submission closes). We already have due_at (drives the Late flag);
-- these two actually OPEN and CLOSE submission. With 115 members this is
-- the difference between "the deadline passed" and "the deadline is
-- enforced." Both nullable — an assignment with neither behaves exactly
-- as before (open whenever it's published).

alter table public.assignments add column if not exists unlock_at timestamptz;
alter table public.assignments add column if not exists lock_at timestamptz;
