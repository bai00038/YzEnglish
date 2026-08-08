-- Adds the public scene video link, mirroring pdf_url (see
-- 0007_add_scene_pdf_url.sql).
--
-- Nullable: a scene with no video yet (most of them, today) simply has
-- video_url = null, which the frontend treats as "video coming soon"
-- rather than a broken player (see mapSceneRow in src/data/scenes-access.ts
-- and the video block in SceneDetailPage.tsx). `if not exists` makes this
-- safe to re-run; it never touches existing rows/columns.
alter table public.scenes
  add column if not exists video_url text;
