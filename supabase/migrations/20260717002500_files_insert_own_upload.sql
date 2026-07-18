-- ============================================================
-- Let enrolled members insert their own submission-upload files
-- ============================================================
--
-- Bug (critical): the only write policy on public.files was
-- files_write_exec (exec-only). But submitAssignment inserts a files row
-- with the STUDENT's own client when they upload a file submission
-- (uploaded_by = the student, published = false). RLS rejected that
-- insert — "new row violates row-level security policy for table
-- files" — so NO non-exec member could ever submit a file assignment.
-- Every file-type assignment was broken for students; only exec could
-- submit one.
--
-- Fix: allow an enrolled member to insert a file they own, in a course
-- they're enrolled in, as long as it's unpublished — i.e. exactly a
-- submission upload, never a published repository file (publishing to
-- the Files browser stays exec-only via files_write_exec). Multiple
-- permissive INSERT policies OR together, so exec is unaffected and
-- UPDATE/DELETE remain exec-only.

create policy "files_insert_own_upload" on public.files
  for insert to authenticated with check (
    public.is_exec()
    or (
      uploaded_by = auth.uid()
      and published = false
      and public.is_enrolled(course_id)
    )
  );
