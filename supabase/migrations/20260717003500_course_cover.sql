-- ============================================================
-- Course cover images
-- ============================================================
--
-- Each course card (dashboard) and course home shows a colored header.
-- This lets exec upload any image as that header; the app renders it
-- under a translucent film in the course's own color, so covers stay
-- cohesive and legible (the Canvas course-card model). Optional — with
-- no image the header falls back to the solid course color.
--
-- The image itself lives in the existing public content-images bucket
-- (uploaded to the exec's own folder, per that bucket's insert policy);
-- this column just stores its public URL. No new RLS needed:
-- courses_write_exec already governs updates to this table.

alter table public.courses
  add column if not exists cover_image_url text;

comment on column public.courses.cover_image_url is
  'Optional cover image (public URL in the content-images bucket). Rendered on the dashboard card and course home under a translucent film in the course color.';
