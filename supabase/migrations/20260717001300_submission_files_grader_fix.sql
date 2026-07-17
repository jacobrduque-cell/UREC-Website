-- UREC Platform — fix submission_files missing grader access
--
-- Migration 20260717000900 added the Grader role and updated
-- submissions/grades/submission_comments RLS to include it, but missed
-- submission_files — found by locally testing the new group-submission
-- storage policy (20260717001200), which joins through submission_files
-- and came back empty for a grader precisely because this table's RLS
-- was still exec-only. Same fix, same pattern as the others.

drop policy if exists "submission_files_select_own_or_exec" on public.submission_files;
create policy "submission_files_select_own_or_exec_or_grader" on public.submission_files
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
