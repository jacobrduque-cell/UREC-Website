-- ============================================================
-- Index notifications for the list query's actual order
-- ============================================================
--
-- The notifications page reads a member's rows ordered by created_at
-- desc, but the only indexes are on (user_id) and (user_id, read_at).
-- After a couple of years an active member accumulates thousands of
-- notification rows (one per announcement, assignment, grade, reminder),
-- so every visit sorts that whole set. This composite index serves the
-- filter + order in one shot.
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
