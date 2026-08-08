-- Phase A-0, Stage D: verify Stage B and Stage C actually finished before
-- Stage E is allowed to set NOT NULL.
--
-- Pure verification, no writes. Exists as its own migration/checkpoint
-- rather than folding these checks into 0017 directly, so a failure here
-- has an unambiguous, single-purpose error message pointing back at
-- whichever of 0014/0015 is incomplete, instead of a NOT NULL failure
-- from Postgres itself (which would just say "column contains null
-- values" without saying which rows or why).
--
-- Run this only after 0014_adopt_scene_external_ids.sql and
-- 0015_adopt_dialogue_line_external_ids.sql have both actually been
-- executed with real, human-confirmed values (not left as templates).
do $$
declare
  v_null_scene_count integer;
  v_dup_scene_external_id text;
  v_null_line_count integer;
  v_dup_line_external_id text;
begin
  select count(*) into v_null_scene_count from public.scenes where external_scene_id is null;
  if v_null_scene_count > 0 then
    raise exception 'ABORTED: % scenes row(s) still have external_scene_id IS NULL — run 0014_adopt_scene_external_ids.sql with a complete, confirmed mapping first.', v_null_scene_count;
  end if;

  select external_scene_id into v_dup_scene_external_id
  from public.scenes
  group by external_scene_id
  having count(*) > 1
  limit 1;
  if v_dup_scene_external_id is not null then
    raise exception 'ABORTED: external_scene_id "%" is assigned to more than one scenes row (the UNIQUE constraint from 0013 should have prevented this — investigate before proceeding).', v_dup_scene_external_id;
  end if;

  select count(*) into v_null_line_count from public.dialogue_lines where external_line_id is null;
  if v_null_line_count > 0 then
    raise exception 'ABORTED: % dialogue_lines row(s) still have external_line_id IS NULL — run 0015_adopt_dialogue_line_external_ids.sql with a complete, confirmed mapping first.', v_null_line_count;
  end if;

  select external_line_id into v_dup_line_external_id
  from public.dialogue_lines
  group by external_line_id
  having count(*) > 1
  limit 1;
  if v_dup_line_external_id is not null then
    raise exception 'ABORTED: external_line_id "%" is assigned to more than one dialogue_lines row (the UNIQUE constraint from 0013 should have prevented this — investigate before proceeding).', v_dup_line_external_id;
  end if;

  raise notice 'Stage D verification passed: every scenes.external_scene_id and dialogue_lines.external_line_id is non-null and unique. Safe to run 0017_set_external_ids_not_null.sql.';
end $$;
