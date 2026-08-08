-- Adds public subtitle track links (English + Chinese), mirroring video_url
-- (see 0009_add_scene_video_url.sql).
--
-- Nullable: a scene with no subtitles yet simply has both columns null,
-- which the frontend treats as "no subtitle track available" for that
-- language rather than a broken <track> tag (see mapSceneRow in
-- src/data/scenes-access.ts and the subtitle toggle in SceneDetailPage.tsx).
-- `if not exists` makes this safe to re-run; it never touches existing
-- rows/columns.
alter table public.scenes
  add column if not exists subtitle_en_url text,
  add column if not exists subtitle_zh_url text;
