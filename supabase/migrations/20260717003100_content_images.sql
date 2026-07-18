-- ============================================================
-- Content images bucket — inline images in assignments & quizzes
-- ============================================================
--
-- Assignment descriptions and quiz question text are markdown. To embed
-- images (a rent roll, a site map, a comps table, an Excel chart) the
-- markdown needs a stable, publicly-fetchable image URL — an <img src>
-- can't carry an auth header. This is a PUBLIC bucket (read by anyone
-- with the link, like every other LMS's inline images); uploads are
-- gated to a member's own folder, and only exec ever authors the
-- surfaces these appear on.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-images',
  'content-images',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- Uploads go under {user_id}/... so a member can only write their own
-- folder. (Authoring surfaces are exec-gated in the app; this is the
-- storage-level backstop.)
create policy "content_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read so the image URLs render inline anywhere the markdown is
-- shown. (A public bucket already serves these; this keeps the objects
-- API consistent.)
create policy "content_images_select_public" on storage.objects
  for select to public
  using (bucket_id = 'content-images');

create policy "content_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
