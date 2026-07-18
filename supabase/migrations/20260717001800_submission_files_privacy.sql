-- ============================================================
-- Submission-file metadata privacy
-- ============================================================
--
-- Bug: a submission upload inserts a public.files row, but files.published
-- defaults to true. The general file-repository read policy is
--   (published and is_enrolled(course_id)) or is_exec
-- so ANY enrolled member could
--   select filename, storage_path, uploaded_by from files where course_id = ...
-- and enumerate every classmate's submission filenames, storage paths,
-- and uploader ids (bytes stay protected by the storage.objects policy,
-- but the metadata leaked). They also surfaced in the Files browser,
-- which lists published, folder-less files.
--
-- Fix, two parts:
--   1. Mark submission-file rows unpublished so the repository policy no
--      longer exposes them (and they drop out of the Files browser).
--   2. Add a dedicated files SELECT policy so the people who SHOULD see a
--      submission file's metadata still can — the submitter, their group,
--      a Grader for that course, and exec — mirroring the storage.objects
--      and submission_files policies already in place.

-- 1. Backfill: any existing file that's actually a submission file.
update public.files f
set published = false
where exists (
  select 1 from public.submission_files sf where sf.file_id = f.id
)
and f.published = true;

-- 2. Let legitimate viewers read submission-file rows even though they're
-- unpublished. OR's with the existing repository policy; since these rows
-- are now unpublished, the repository policy no longer matches them, so
-- this is the only path to them for non-exec users.
create policy "files_select_submission_participant" on public.files
  for select to authenticated using (
    exists (
      select 1
      from public.submission_files sf
      join public.submissions s on s.id = sf.submission_id
      join public.assignments a on a.id = s.assignment_id
      where sf.file_id = files.id
        and (
          s.user_id = auth.uid()
          or (s.group_id is not null and exists (
            select 1 from public.group_memberships gm
            where gm.group_id = s.group_id and gm.user_id = auth.uid()
          ))
          or public.is_grader(a.course_id)
          or public.is_exec()
        )
    )
  );
