-- UREC Platform — submissions storage: grader + group-mate access
--
-- The submissions bucket's storage.objects policy only ever let the
-- original uploader (or exec) download a file — correct for individual
-- submissions, but a real gap now that group submissions exist
-- (Phase 7): a teammate who didn't personally upload the file for
-- their team couldn't view it, and a Grader (Phase 6's non-exec
-- grading role) couldn't either. The DB-row metadata
-- (files/submission_files/submissions) already correctly allowed
-- both — only the actual file bytes in storage were locked down
-- tighter than the data they describe.

drop policy if exists "submissions_storage_select_own_or_exec" on storage.objects;
create policy "submissions_storage_select_own_or_grader_or_groupmate" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_exec()
      or exists (
        select 1
        from public.files f
        join public.submission_files sf on sf.file_id = f.id
        join public.submissions s on s.id = sf.submission_id
        join public.assignments a on a.id = s.assignment_id
        where f.storage_path = storage.objects.name
          and (
            public.is_grader(a.course_id)
            or (s.group_id is not null and exists (
              select 1 from public.group_memberships gm
              where gm.group_id = s.group_id and gm.user_id = auth.uid()
            ))
          )
      )
    )
  );
