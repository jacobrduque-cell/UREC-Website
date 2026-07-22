-- ============================================================
-- Weighted grade categories: editable weights, attendance, quizzes
-- ============================================================
--
-- The weighted-grade engine already existed (assignment_groups.weight_pct
-- + lib/grade-weighting). This migration lets an exec (a) run an
-- "Attendance" category whose score comes from attendance_records instead
-- of graded items, and (b) fold quiz scores into a weighted category.
--
-- No data is destroyed: `kind` defaults to 'standard' (every existing
-- group keeps behaving exactly as before) and quizzes.assignment_group_id
-- is nullable (an unassigned quiz simply doesn't count toward the grade,
-- same as today).

-- A category is either a normal graded bucket ('standard') or the special
-- 'attendance' bucket, whose earned/possible are computed from
-- attendance_records at read time (see lib/grade-model.ts).
alter table public.assignment_groups
  add column if not exists kind text not null default 'standard'
  check (kind in ('standard', 'attendance'));

-- At most one attendance category per course.
create unique index if not exists assignment_groups_one_attendance_per_course
  on public.assignment_groups (course_id)
  where kind = 'attendance';

-- Let a quiz belong to a weighted category so its score rolls into the
-- overall grade. on delete set null: deleting a category un-assigns its
-- quizzes (they fall back to not-counted) rather than deleting them.
alter table public.quizzes
  add column if not exists assignment_group_id uuid
  references public.assignment_groups(id) on delete set null;
create index if not exists quizzes_assignment_group_id_idx
  on public.quizzes(assignment_group_id);
