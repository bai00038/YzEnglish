-- Phase A-0, Stage A: permanent external identity columns.
--
-- Adds external_scene_id (public.scenes) and external_line_id
-- (public.dialogue_lines) — sync-stable identifiers that come from the
-- Google Sheet and never change because a slug, title, sort position,
-- line_order, speaker, dialogue text, or timecode changes.
--
-- This is stage A of a multi-stage rollout, revised after an external
-- audit rejected the first version of this plan (which had 0014
-- auto-generate placeholder external_scene_id values). The full sequence
-- now is:
--   A (this file)  — nullable columns + unique constraints
--   B (0014)       — human-confirmed scene_id adoption (blocks until real
--                    values are filled in; never invents any)
--   C (0015)       — human-confirmed line_id adoption for the 18 existing
--                    dialogue_lines rows (by internal id, never by
--                    line_order/text)
--   D (0016)       — verifies B and C actually left no NULL/duplicate
--                    before allowing the next stage
--   E (0017)       — NOT NULL on both columns, only after D passes
--   F (0018)       — makes dialogue_lines' (scene_id, line_order) unique
--                    constraint DEFERRABLE so an in-transaction reorder
--                    (e.g. swapping two lines' line_order) can succeed
--   G (0019)       — the actual sync_scene_with_dialogue_lines RPC
-- See each file's own header for details. None of B through G are safe
-- to run yet — B and C are deliberately guarded to abort if run
-- unmodified (see their headers) rather than ever inventing a business
-- ID, and D/E/F/G all depend on B and C having actually been completed
-- by a human first.
--
-- This file itself is pure schema addition: no existing column,
-- constraint, row, or foreign key is touched. Both new columns are
-- nullable here on purpose — every existing row has NULL in both until
-- stage E, and Postgres UNIQUE constraints treat every NULL as distinct
-- from every other NULL, so adding UNIQUE now is safe even though no row
-- has a value yet.
alter table public.scenes
  add column if not exists external_scene_id text;

alter table public.scenes
  add constraint scenes_external_scene_id_key unique (external_scene_id);

comment on column public.scenes.external_scene_id is
  'Permanent external identity for this scene, sourced from the Google Sheet Scenes.scene_id column. This is the sync match key (see supabase/functions/sync-scene) — independent of slug, which stays URL-facing only. Never reused, never regenerated from slug/title/sort_order.';

alter table public.dialogue_lines
  add column if not exists external_line_id text;

alter table public.dialogue_lines
  add constraint dialogue_lines_external_line_id_key unique (external_line_id);

comment on column public.dialogue_lines.external_line_id is
  'Permanent external identity for this dialogue line, sourced from the Google Sheet Dialogue_Lines.line_id column. Independent of line_order/step/speaker/dialogue text/timecodes — none of those changing should ever change this value. Never reused across scenes. NULL on existing rows until a human-confirmed adoption migration runs — see 0015_adopt_dialogue_line_external_ids.sql.';
