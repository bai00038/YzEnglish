-- Phase A-0, Stage E: enforce NOT NULL on both external identity columns.
--
-- Only safe to run after 0014 (Stage B) and 0015 (Stage C) have both
-- actually applied real, human-confirmed values to every existing row —
-- 0016 (Stage D) verifies that independently. If either adoption
-- migration was skipped, left as a template, or only partially applied,
-- this file fails with Postgres's own "column contains null values"
-- error, which is a safe failure (nothing is left half-changed), just a
-- less specific one than 0016's.
alter table public.scenes
  alter column external_scene_id set not null;

alter table public.dialogue_lines
  alter column external_line_id set not null;
