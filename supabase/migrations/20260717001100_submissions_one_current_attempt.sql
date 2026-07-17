-- UREC Platform — fix resubmission/attempt-versioning bug
--
-- submitAssignment() always INSERTed a new row with no attempt
-- tracking. Because grade/roster queries embed submissions with no
-- guaranteed order, a resubmission could make the wrong grade display,
-- or make a graded assignment look ungraded. Rather than build full
-- Canvas-style multi-version history (a much bigger lift), this
-- collapses to one current row per student per assignment —
-- `attempt_number` still increments on resubmission so the grading UI
-- can show "Attempt 3," but only the latest attempt's content and
-- grade exist at any time. Full attempt history is an intentional,
-- documented simplification (see UREC_Platform_Decision_Log.md), not
-- an oversight.

-- Consolidate any existing duplicate rows (same assignment+user, or
-- same assignment+group) down to one: keep the most recently
-- submitted attempt, and carry an existing grade over onto it if the
-- kept row doesn't already have one, so no exec's grading work is lost.
do $$
declare
  r record;
  keep_id uuid;
  grade_source_id uuid;
begin
  for r in
    select assignment_id, user_id
    from public.submissions
    where user_id is not null
    group by assignment_id, user_id
    having count(*) > 1
  loop
    select id into keep_id
    from public.submissions
    where assignment_id = r.assignment_id and user_id = r.user_id
    order by submitted_at desc, created_at desc
    limit 1;

    if not exists (select 1 from public.grades where submission_id = keep_id) then
      select s.id into grade_source_id
      from public.submissions s
      join public.grades g on g.submission_id = s.id
      where s.assignment_id = r.assignment_id and s.user_id = r.user_id and s.id != keep_id
      order by s.submitted_at desc
      limit 1;

      if grade_source_id is not null then
        update public.grades set submission_id = keep_id where submission_id = grade_source_id;
      end if;
    end if;

    delete from public.submissions
    where assignment_id = r.assignment_id and user_id = r.user_id and id != keep_id;
  end loop;

  for r in
    select assignment_id, group_id
    from public.submissions
    where group_id is not null
    group by assignment_id, group_id
    having count(*) > 1
  loop
    select id into keep_id
    from public.submissions
    where assignment_id = r.assignment_id and group_id = r.group_id
    order by submitted_at desc, created_at desc
    limit 1;

    if not exists (select 1 from public.grades where submission_id = keep_id) then
      select s.id into grade_source_id
      from public.submissions s
      join public.grades g on g.submission_id = s.id
      where s.assignment_id = r.assignment_id and s.group_id = r.group_id and s.id != keep_id
      order by s.submitted_at desc
      limit 1;

      if grade_source_id is not null then
        update public.grades set submission_id = keep_id where submission_id = grade_source_id;
      end if;
    end if;

    delete from public.submissions
    where assignment_id = r.assignment_id and group_id = r.group_id and id != keep_id;
  end loop;
end $$;

create unique index if not exists submissions_one_per_user_per_assignment
  on public.submissions(assignment_id, user_id) where user_id is not null;
create unique index if not exists submissions_one_per_group_per_assignment
  on public.submissions(assignment_id, group_id) where group_id is not null;
