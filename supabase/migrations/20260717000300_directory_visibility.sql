-- UREC Platform — widen role visibility for the Directory/People page
--
-- account_roles and enrollments were originally self-or-exec-only for
-- SELECT, written before there was a UI that needed them. Building the
-- Directory page surfaced the real requirement: a club roster normally
-- shows everyone's role (like Canvas's People page shows "Teacher" /
-- "Student"), the same way public.users itself is already visible to
-- every authenticated member. Roles aren't sensitive here — only
-- *assigning* them is, and that stays exec-only via the existing write
-- policies, untouched by this migration.

drop policy "account_roles_select_self_or_exec" on public.account_roles;
create policy "account_roles_select_authenticated" on public.account_roles
  for select to authenticated using (true);

drop policy "enrollments_select_self_or_exec" on public.enrollments;
create policy "enrollments_select_authenticated" on public.enrollments
  for select to authenticated using (true);
