-- UREC Platform — Storage bucket for assignment submissions
--
-- Path convention: {assignment_id}/{user_id}/{filename}. Private
-- bucket — nothing is public, access goes entirely through RLS on
-- storage.objects, same enrolled/exec split as everywhere else.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  26214400, -- 25MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do nothing;

create policy "submissions_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "submissions_storage_select_own_or_exec" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_exec()
    )
  );

create policy "submissions_storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
