-- UREC Platform — Storage bucket for the course Files section
--
-- Distinct from the "submissions" bucket (Phase 3): that one is
-- private per-student, this one is a shared course file repository.
-- Path convention: {course_id}/{folder_id|"root"}/{filename}.
--
-- Unlike the submissions bucket, read access here checks the actual
-- `published` flag on public.files by matching storage_path, not just
-- course enrollment — an enrolled member should not be able to fetch
-- an unpublished file's signed URL directly through the API just
-- because the Files page itself filters it out of view.

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-files', 'course-files', false, 52428800) -- 50MB
on conflict (id) do nothing;

create policy "course_files_storage_select_published_or_exec" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-files'
    and (
      public.is_exec()
      or exists (
        select 1 from public.files f
        where f.storage_path = storage.objects.name
          and f.published = true
          and public.is_enrolled(f.course_id)
      )
    )
  );

create policy "course_files_storage_write_exec" on storage.objects
  for all to authenticated
  using (bucket_id = 'course-files' and public.is_exec())
  with check (bucket_id = 'course-files' and public.is_exec());
