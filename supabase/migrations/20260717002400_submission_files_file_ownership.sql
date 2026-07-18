-- ============================================================
-- submission_files INSERT must check file_id ownership
-- ============================================================
--
-- submission_files_insert_own only verified that submission_id belongs
-- to a submission the caller owns (or is a group-mate of) — file_id was
-- completely unconstrained. Combined with files_select_submission_
-- participant (migration 20260717001800), which grants read on a files
-- row to anyone who owns a submission referencing it, a member could:
--   insert into submission_files (submission_id, file_id)
--   values (<their own submission>, <any victim file id>)
-- and then read that file's metadata (filename, storage_path,
-- uploaded_by) — silently re-opening the cross-user leak migration 1800
-- was written to close, through the insert path.
--
-- Fix: you may only attach a file you uploaded yourself. The submit
-- action inserts the files row with uploaded_by = auth.uid() immediately
-- before linking it, so the legitimate path is unaffected.

drop policy if exists "submission_files_insert_own" on public.submission_files;
create policy "submission_files_insert_own" on public.submission_files
  for insert to authenticated with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and (
        s.user_id = auth.uid()
        or (s.group_id is not null and exists (
          select 1 from public.group_memberships gm
          where gm.group_id = s.group_id and gm.user_id = auth.uid()
        ))
      )
    )
    and exists (
      select 1 from public.files f
      where f.id = file_id and f.uploaded_by = auth.uid()
    )
  );
