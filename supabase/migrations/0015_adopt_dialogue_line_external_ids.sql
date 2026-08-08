-- Phase A-0, Stage C: human-confirmed adoption of
-- dialogue_lines.external_line_id for the 18 existing rows.
--
-- There are exactly 18 dialogue_lines rows today (internal ids 1-18, all
-- scene_id=28 / shopping-for-clothes — scene_id=40 / getting-a-dental-
-- filling has zero rows, so it has no adoption burden here). All 18 were
-- created before external_line_id existed, so all 18 currently have
-- external_line_id = NULL.
--
-- Same shape and same safety posture as 0014 (Stage B): this migration
-- applies a human-confirmed mapping and does nothing else. The mapping
-- key is dialogue_lines.id (the internal database id) — NEVER
-- line_order, dialogue text, speaker, or timecodes, all of which are
-- exactly the volatile things external_line_id must stay independent of.
-- A companion reference file,
-- supabase/migrations/data/dialogue_line_external_id_mapping.template.sql,
-- remains as a template for FUTURE scenes' adoption migrations (its own
-- TODO_CONFIRM placeholders are intentionally left as-is — it is a
-- template, not execution data, and was never edited to produce the
-- mapping below).
--
-- HUMAN CONFIRMATION STATUS: the mapping below was reviewed and approved
-- in the audit conversation for this project (Phase A-0 human sign-off
-- round, 2026-08-08), via a full old-vs-final-script dialogue
-- reconciliation (13 lines carried forward unchanged in meaning, 5 lines
-- retired because the final script merges or drops them — see below).
-- All 18 values are confirmed, permanent, database-id-keyed assignments
-- — NOT derived from line_order, dialogue text, speaker, or timecode.
-- This migration is still NOT executed as part of this change (see the
-- Phase A-0 safety constraints); it is now ready to run once a human
-- operator chooses to.
--
-- What this migration does NOT include, on purpose:
--   - line_000019 through line_000023: the 5 NEW lines the final script
--     introduces (F9-F13 in the reconciliation) have no existing
--     dialogue_lines row to attach to — they don't exist in the database
--     yet. They will be created for the first time whenever the new
--     Sheet's full Dialogue_Lines set is actually synced through
--     sync_scene_with_dialogue_lines (0019), not by this adoption
--     migration, which only ever adopts IDs onto rows that already exist.
--   - Deleting the 5 rows below whose IDs (line_000001, line_000005,
--     line_000006, line_000011, line_000017) the final script does not
--     carry forward (old ids 1, 5, 6, 11, 17 — see the reconciliation
--     table for the per-row reasoning). This migration still gives all
--     18 of them their permanent external_line_id, exactly like the
--     other 13 — adoption and removal are deliberately separate
--     operations. Their actual removal from dialogue_lines happens
--     later, as an ordinary consequence of the reviewed
--     sync_scene_with_dialogue_lines prune logic (0019) once the real
--     Sheet sync submits a dialogue_lines[] set that no longer includes
--     these 5 line_ids — not by editing this file to add DELETEs. Their
--     external_line_id values are never reused regardless of when or how
--     they're removed (see dialogue_lines_external_line_id_key, 0013).
--
-- SAFETY GUARD (kept as defense-in-depth even though the mapping below
-- is already confirmed): the DO block further down still checks for the
-- 'TODO_CONFIRM' sentinel before writing anything, and would abort
-- cleanly if this file were ever edited back into an unconfirmed state.
--
-- PERMANENCE (added after a second external audit, same rule as 0014):
-- a dialogue_lines row whose external_line_id is already non-null is
-- NEVER overwritten with a different value, even if this mapping
-- proposes one.
--   1. current external_line_id IS NULL       -> write the mapped value (first adoption)
--   2. current external_line_id = mapped value -> no-op, safe to rerun this file any number of times
--   3. current external_line_id <> mapped value -> ABORT THE WHOLE MIGRATION, naming the
--      dialogue_lines.id, the current (already-permanent) id, and the different id this file tried to write.
-- This migration has no mechanism to rename, replace, or recycle an
-- already-adopted external_line_id, on purpose.
--
-- This migration does not touch line_order, speaker, dialogue text, or
-- timecodes on any row — it only ever sets external_line_id.

create temporary table _dialogue_line_external_id_mapping (
  dialogue_line_id bigint primary key,
  external_line_id text not null
) on commit drop;

-- All 18 existing rows. Values below are the human-confirmed mapping
-- (dialogue_lines.id order, i.e. line_000001 = id 1 ... line_000018 =
-- id 18) — see this file's header. Rows marked "retired" carry a
-- permanent external_line_id like every other row here, but the final
-- script does not carry their content forward as its own final line
-- (see the header's explanation of what removes them, and when).
insert into _dialogue_line_external_id_mapping (dialogue_line_id, external_line_id) values
  (1,  'line_000001'),  -- 'Excuse me.' — retired: merged into final line 1 with id 2, see reconciliation notes
  (2,  'line_000002'),  -- 'Do you have this in a small?' — carried forward (final line 1)
  (3,  'line_000003'),  -- 'Let me check.' — carried forward (final line 2)
  (4,  'line_000004'),  -- 'Yes, we do.' — carried forward (final line 3)
  (5,  'line_000005'),  -- 'Here you go.' — retired: merged into final line 3 with id 4, see reconciliation notes
  (6,  'line_000006'),  -- 'Perfect.' — retired: merged into final line 4 with id 7, see reconciliation notes
  (7,  'line_000007'),  -- 'Thank you!' — carried forward (final line 4)
  (8,  'line_000008'),  -- 'Where are the fitting rooms?' — carried forward (final line 5)
  (9,  'line_000009'),  -- 'They''re right over there.' — carried forward (final line 6)
  (10, 'line_000010'),  -- 'How did everything fit?' — carried forward (final line 7)
  (11, 'line_000011'),  -- 'Great!' — retired: merged into final line 8 with id 12, see reconciliation notes
  (12, 'line_000012'),  -- 'I''ll take these two.' — carried forward (final line 8)
  (13, 'line_000013'),  -- 'Your total is $78.45.' — carried forward (final line 14)
  (14, 'line_000014'),  -- 'Credit, please.' — carried forward (final line 15)
  (15, 'line_000015'),  -- 'Perfect.' — carried forward (final line 16)
  (16, 'line_000016'),  -- 'All set.' — carried forward (final line 17)
  (17, 'line_000017'),  -- 'Have a great day!' — retired: merged into final line 17 with id 16, see reconciliation notes
  (18, 'line_000018');  -- 'You too!' — carried forward (final line 18)

do $$
declare
  v_todo_count integer;
  v_missing_id bigint;
  v_dup_external_id text;
  v_immutable_id bigint;
  v_immutable_current_id text;
  v_immutable_new_id text;
begin
  select count(*) into v_todo_count
  from _dialogue_line_external_id_mapping
  where external_line_id = 'TODO_CONFIRM';

  if v_todo_count > 0 then
    raise exception
      'ABORTED: % row(s) in the dialogue_line_id mapping still have the TODO_CONFIRM placeholder. Confirm each line''s real Google Sheet line_id and edit this migration before running it — never derived from line_order, text, speaker, or timecode.',
      v_todo_count;
  end if;

  select m.dialogue_line_id into v_missing_id
  from _dialogue_line_external_id_mapping m
  left join public.dialogue_lines d on d.id = m.dialogue_line_id
  where d.id is null
  limit 1;
  if v_missing_id is not null then
    raise exception 'ABORTED: mapping references dialogue_lines.id % which does not exist.', v_missing_id;
  end if;

  -- every existing row still missing external_line_id must be covered —
  -- this migration does not partially adopt a scene's dialogue.
  select d.id into v_missing_id
  from public.dialogue_lines d
  left join _dialogue_line_external_id_mapping m on m.dialogue_line_id = d.id
  where d.external_line_id is null
    and m.dialogue_line_id is null
  limit 1;
  if v_missing_id is not null then
    raise exception 'ABORTED: dialogue_lines.id % has no external_line_id and no entry in the mapping — every row still missing external_line_id must be covered before this migration can run.', v_missing_id;
  end if;

  select external_line_id into v_dup_external_id
  from _dialogue_line_external_id_mapping
  group by external_line_id
  having count(*) > 1
  limit 1;
  if v_dup_external_id is not null then
    raise exception 'ABORTED: the mapping assigns external_line_id "%" to more than one row.', v_dup_external_id;
  end if;

  select m.external_line_id into v_dup_external_id
  from _dialogue_line_external_id_mapping m
  join public.dialogue_lines d on d.external_line_id = m.external_line_id
  where d.id <> m.dialogue_line_id
  limit 1;
  if v_dup_external_id is not null then
    raise exception 'ABORTED: external_line_id "%" is already assigned to a different dialogue_lines row.', v_dup_external_id;
  end if;

  -- PERMANENCE: refuse to change an already-adopted external_line_id to
  -- a different value. A row whose current value already matches the
  -- mapping is fine (safe-rerun case, state 2 above) and is intentionally
  -- excluded from this check by the <> comparison.
  select d.id, d.external_line_id, m.external_line_id
  into v_immutable_id, v_immutable_current_id, v_immutable_new_id
  from _dialogue_line_external_id_mapping m
  join public.dialogue_lines d on d.id = m.dialogue_line_id
  where d.external_line_id is not null
    and d.external_line_id <> m.external_line_id
  limit 1;
  if v_immutable_id is not null then
    raise exception 'ABORTED: dialogue_lines.id % already has a permanent external_line_id "%" — this migration tried to change it to "%". external_line_id can never be renamed, replaced, or recycled once set. If "%" is wrong, that is a separate, manually-reviewed correction — not something this file will do as a side effect of a mapping edit.',
      v_immutable_id, v_immutable_current_id, v_immutable_new_id, v_immutable_current_id;
  end if;
end $$;

-- Scoped to external_line_id IS NULL only — same reasoning as 0014's
-- final UPDATE. By this point every row is guaranteed to be either NULL
-- (write it) or already equal to the mapped value (correctly skipped
-- here, since it is not NULL); the DO block above has already aborted
-- the entire migration if any row's current value differs from the
-- mapping.
update public.dialogue_lines d
set external_line_id = m.external_line_id
from _dialogue_line_external_id_mapping m
where m.dialogue_line_id = d.id
  and d.external_line_id is null;
