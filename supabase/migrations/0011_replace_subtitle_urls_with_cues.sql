-- Replaces the subtitle_en_url/subtitle_zh_url columns from
-- 0010_add_scene_subtitle_urls.sql (both still null everywhere, never
-- used by any synced data) with a single subtitle_cues column.
--
-- Design change: subtitles no longer come from separately-hosted .vtt
-- files. They're synced straight from the "Dialogue_Lines" Google Sheet
-- tab (per-line start_time/end_time/dialogue_en/dialogue_zh, keyed by
-- scene_id) into this one JSONB array of {start, end, en, zh} cues. The
-- frontend builds a WebVTT track client-side from this JSON at render
-- time (see SceneDetailPage.tsx) — no Storage upload, no URL to sync.
--
-- Nullable: a scene with no timed transcript yet simply has
-- subtitle_cues = null, same "not available yet" convention as photo_url/
-- pdf_url/video_url.
alter table public.scenes
  drop column if exists subtitle_en_url,
  drop column if exists subtitle_zh_url,
  add column if not exists subtitle_cues jsonb;
