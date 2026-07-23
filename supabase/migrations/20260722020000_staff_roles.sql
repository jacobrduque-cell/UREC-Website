-- ============================================================
-- Role model: staff tier (Director) + role vocabulary
-- ============================================================
--
-- Two axes of roles:
--   • Account roles (staff power): President / Exec / Director / Admin.
--     President + Exec + Admin = full power (is_exec). Director is a mid
--     tier (is_staff but not is_exec): can grade, take attendance, and see
--     submissions, but not manage roles, restructure courses, edit grade
--     weights, or delete.
--   • Course roles (membership access): Analyst / DeCal Member / General
--     Member — assigned via enrollment, gate which materials a person sees.
--
-- Backwards compatible: the legacy account roles (Admin/Co-President/VP)
-- still count as full-power exec, so nobody loses access.

-- Account-scope (staff) roles.
insert into public.roles (name, scope, description) values
  ('President', 'account', 'Runs the club — full access to everything.'),
  ('Exec', 'account', 'Executive board — full access to everything.'),
  ('Director', 'account', 'Helps run the program under a VP — can grade, take attendance, and see submissions, but cannot manage roles, restructure courses, or edit grade weights.')
on conflict (name) do nothing;

-- Course-scope (membership) roles.
insert into public.roles (name, scope, description) values
  ('Analyst', 'course', 'Full access to this course''s analyst training and resources.'),
  ('DeCal Member', 'course', 'Enrolled in the DeCal course only.'),
  ('General Member', 'course', 'General club member with limited course access.')
on conflict (name) do nothing;

-- Full-power exec now also recognizes the new President/Exec names.
create or replace function public.is_exec()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.roles r on r.id = ar.role_id
    where ar.user_id = auth.uid()
      and r.name in ('Admin', 'Co-President', 'VP', 'President', 'Exec')
  );
$$;

-- Staff = full-power exec OR Director (the mid tier).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_roles ar
    join public.roles r on r.id = ar.role_id
    where ar.user_id = auth.uid()
      and r.name in ('Admin', 'Co-President', 'VP', 'President', 'Exec', 'Director')
  );
$$;

-- Give staff (i.e. Directors, on top of exec) the read/grade/attendance
-- access their role needs. These are ADDED alongside the existing exec and
-- grader policies (RLS is permissive/OR), so nothing existing is weakened.
create policy "submissions_select_staff" on public.submissions
  for select to authenticated using (public.is_staff());
create policy "submission_files_select_staff" on public.submission_files
  for select to authenticated using (public.is_staff());
create policy "submission_comments_select_staff" on public.submission_comments
  for select to authenticated using (public.is_staff());
create policy "submission_comments_insert_staff" on public.submission_comments
  for insert to authenticated with check (public.is_staff());
create policy "grades_select_staff" on public.grades
  for select to authenticated using (public.is_staff());
create policy "grades_write_staff" on public.grades
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "quiz_submissions_select_staff" on public.quiz_submissions
  for select to authenticated using (public.is_staff());
create policy "attendance_write_staff" on public.attendance_records
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
