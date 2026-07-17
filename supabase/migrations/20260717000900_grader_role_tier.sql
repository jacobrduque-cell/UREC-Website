-- UREC Platform — grader/TA permission tier
--
-- Canvas separates TaEnrollment (can grade, view all submissions) from
-- TeacherEnrollment/AccountAdmin (full course/account management) —
-- two different levels of trust. Our platform only ever had one:
-- is_exec(), an all-or-nothing account-wide boolean. That means the
-- only way to let someone grade submissions is to also hand them full
-- admin power over club settings, roles, and everyone's grades. This
-- adds a course-scoped "Grader" role (assigned the same way Analyst
-- is, via enrollments) that can grade without the rest of exec power.

insert into public.roles (name, scope, description)
values ('Grader', 'course', 'Can grade submissions and view all grades for this course. Does not grant exec/admin power over the rest of the platform.')
on conflict (name) do nothing;

create function public.is_grader(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_exec() or exists (
    select 1
    from public.enrollments e
    join public.roles r on r.id = e.role_id
    where e.user_id = auth.uid()
      and e.course_id = target_course_id
      and r.name = 'Grader'
  );
$$;
grant execute on function public.is_grader(uuid) to authenticated;

-- submissions: a grader can see every submission in their course, not
-- just their own (or their group's).
drop policy if exists "submissions_select_own_or_exec" on public.submissions;
create policy "submissions_select_own_or_exec_or_grader" on public.submissions
  for select to authenticated using (
    user_id = auth.uid()
    or (group_id is not null and exists (
      select 1 from public.group_memberships gm where gm.group_id = group_id and gm.user_id = auth.uid()
    ))
    or public.is_exec()
    or exists (
      select 1 from public.assignments a where a.id = assignment_id and public.is_grader(a.course_id)
    )
  );

-- grades: a grader can write grades for their course, same as exec.
drop policy if exists "grades_write_exec" on public.grades;
create policy "grades_write_exec_or_grader" on public.grades
  for all to authenticated using (
    public.is_exec() or exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = submission_id and public.is_grader(a.course_id)
    )
  )
  with check (
    public.is_exec() or exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = submission_id and public.is_grader(a.course_id)
    )
  );

-- submission_comments: a grader can read/write comments on any
-- submission in their course (needed to explain a grade), same
-- exception pattern as submissions/grades above.
drop policy if exists "submission_comments_select_own_or_exec" on public.submission_comments;
create policy "submission_comments_select_own_or_exec_or_grader" on public.submission_comments
  for select to authenticated using (
    exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
        or public.is_exec()
        or public.is_grader(a.course_id)
      )
    )
  );
drop policy if exists "submission_comments_insert_own_or_exec" on public.submission_comments;
create policy "submission_comments_insert_own_or_exec_or_grader" on public.submission_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
        or public.is_exec()
        or public.is_grader(a.course_id)
      )
    )
  );
