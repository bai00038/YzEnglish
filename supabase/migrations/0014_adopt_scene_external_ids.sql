-- Phase A-0, Stage B: human-confirmed adoption of scenes.external_scene_id.
--
-- REPLACES the previous version of this file, which auto-generated
-- placeholder values ('scene_' || lpad(id::text,3,'0')). That approach
-- was rejected on external review for a concrete, demonstrated failure
-- mode: once an existing scene's external_scene_id holds a placeholder
-- like "scene_028", the sync RPC (which matches ONLY on
-- external_scene_id, never on slug) has no way to recognize that the
-- Sheet's first real submission of "scene_001" for that same underlying
-- scene is the same scene — it looks for a scene with
-- external_scene_id = 'scene_001', finds none, and falls into the INSERT
-- path, which then fails on a slug conflict (the slug is already taken
-- by the "scene_028" row). The claim in the old comment that "a normal
-- sync will naturally overwrite the placeholder" was simply false: there
-- is no code path that ever matches a placeholder-tagged scene to its
-- real scene_id and updates it in place. See the audit that caught this
-- for the full writeup.
--
-- This migration does the opposite of guessing: it is a one-time,
-- explicit ADOPTION step. It applies a slug -> external_scene_id mapping
-- that a human has confirmed, and it does nothing else — no placeholder
-- generation, no fallback, no "best effort." A companion reference file,
-- supabase/migrations/data/scene_external_id_mapping.template.sql,
-- remains as a template for FUTURE scenes (its own TODO_CONFIRM
-- placeholders are intentionally left as-is — it is a template, not
-- execution data, and was never edited to produce the mapping below).
--
-- HUMAN CONFIRMATION STATUS: the mapping below was reviewed and approved
-- in the audit conversation for this project (Phase A-0 human sign-off
-- round, 2026-08-08) — all 13 scene_id values are confirmed, permanent
-- assignments, in database-id order per that approval (explicitly NOT
-- derived from slug, title, or any other volatile field — see the
-- Permanence guarantee below). This migration is still NOT executed as
-- part of this change (no migration has been run — see the Phase A-0
-- safety constraints); it is now ready to run once a human operator
-- chooses to.
--
-- SAFETY GUARD (kept as defense-in-depth even though the mapping below
-- is already confirmed): the DO block further down still checks for the
-- 'TODO_CONFIRM' sentinel before writing anything, and would abort
-- cleanly if this file were ever edited back into an unconfirmed state.
-- Do not remove or weaken that check.
--
-- Additional guarantees enforced below, all in the same transaction as
-- the write (so a failure at any check means NOTHING in this migration
-- is applied):
--   - every mapped slug must actually exist in public.scenes
--   - every existing public.scenes row must be covered by the mapping
--     (no scene silently left unmapped/NULL)
--   - the mapping itself must not propose the same external_scene_id for
--     two different slugs
--   - no proposed external_scene_id may already belong to a different
--     scene in the database (defensive — the column is empty today, but
--     this keeps the file safe to review/rerun even after a partial
--     rollout)
--   - PERMANENCE (added after a second external audit): a scene whose
--     external_scene_id is already non-null is NEVER overwritten with a
--     different value, even if this mapping proposes one. The three
--     possible states per row are:
--       1. current external_scene_id IS NULL       -> write the mapped value (first adoption)
--       2. current external_scene_id = mapped value -> no-op, safe to rerun this file any number of times
--       3. current external_scene_id <> mapped value -> ABORT THE WHOLE MIGRATION, naming the
--          slug, the current (already-permanent) id, and the different id this file tried to write.
--     This migration has no mechanism to rename, replace, or recycle an
--     already-adopted external_scene_id, on purpose — once real, it is
--     permanent, the same way scenes.id or dialogue_lines.id are.
--     Correcting a wrong external_scene_id (if one was ever adopted by
--     mistake) is a deliberate, separate, manually-reviewed operation,
--     never a side effect of rerunning this file with an updated mapping.
--
-- This migration intentionally does NOT create new scenes and does NOT
-- match/adopt anything by slug at the RPC level — it only ever writes
-- external_scene_id onto a scenes row that a human has explicitly named
-- by its existing slug. There is no "silent slug-based adoption" here or
-- anywhere else in this rollout (see 0019_sync_scene_rpc.sql, which
-- never falls back to slug matching either).

create temporary table _scene_external_id_mapping (
  slug text primary key,
  external_scene_id text not null
) on commit drop;

-- All 13 rows currently in public.scenes (queried during this Phase A-0
-- follow-up, 2026-08-08) — 2 published (shopping-for-clothes,
-- getting-a-dental-filling), 11 draft. Values below are the
-- human-confirmed mapping (database-id order; see this file's header) —
-- NOT derived from slug, title, or sort_order, and not to be regenerated
-- or reordered without a new, explicit human sign-off.
insert into _scene_external_id_mapping (slug, external_scene_id) values
  ('shopping-for-clothes', 'scene_001'),                                    -- database id 28
  ('mailing-a-passport-to-ircc', 'scene_002'),                              -- database id 29
  ('checking-in-at-a-family-doctors-office', 'scene_003'),                  -- database id 30
  ('requesting-a-price-adjustment-at-costco', 'scene_004'),                 -- database id 31
  ('picking-up-a-mobile-order-at-tim-hortons', 'scene_005'),                -- database id 32
  ('getting-dental-x-rays', 'scene_006'),                                   -- database id 33
  ('checking-out-at-indigo', 'scene_007'),                                  -- database id 34
  ('dining-at-a-turkish-restaurant', 'scene_008'),                          -- database id 35
  ('renting-a-canoe', 'scene_009'),                                         -- database id 36
  ('booking-an-appointment-with-rbc', 'scene_010'),                         -- database id 37
  ('birthday-party-invitation', 'scene_011'),                               -- database id 38
  ('parent-teacher-conference-supporting-a-childs-progress', 'scene_012'),  -- database id 39
  ('getting-a-dental-filling', 'scene_013');                                -- database id 40

do $$
declare
  v_todo_count integer;
  v_missing_slug text;
  v_dup_external_id text;
  v_immutable_slug text;
  v_immutable_current_id text;
  v_immutable_new_id text;
begin
  select count(*) into v_todo_count
  from _scene_external_id_mapping
  where external_scene_id = 'TODO_CONFIRM';

  if v_todo_count > 0 then
    raise exception
      'ABORTED: % row(s) in the scene_id mapping still have the TODO_CONFIRM placeholder. Confirm each scene''s real Google Sheet scene_id and edit this migration before running it — this migration will never guess or auto-generate a value.',
      v_todo_count;
  end if;

  select m.slug into v_missing_slug
  from _scene_external_id_mapping m
  left join public.scenes s on s.slug = m.slug
  where s.id is null
  limit 1;
  if v_missing_slug is not null then
    raise exception 'ABORTED: mapping references slug "%" which does not exist in public.scenes.', v_missing_slug;
  end if;

  select s.slug into v_missing_slug
  from public.scenes s
  left join _scene_external_id_mapping m on m.slug = s.slug
  where m.slug is null
  limit 1;
  if v_missing_slug is not null then
    raise exception 'ABORTED: public.scenes.slug "%" has no entry in the mapping — every existing scene must be covered before this migration can run.', v_missing_slug;
  end if;

  select external_scene_id into v_dup_external_id
  from _scene_external_id_mapping
  group by external_scene_id
  having count(*) > 1
  limit 1;
  if v_dup_external_id is not null then
    raise exception 'ABORTED: the mapping assigns external_scene_id "%" to more than one slug.', v_dup_external_id;
  end if;

  select m.external_scene_id into v_dup_external_id
  from _scene_external_id_mapping m
  join public.scenes s on s.external_scene_id = m.external_scene_id
  join public.scenes s2 on s2.slug = m.slug
  where s.id <> s2.id
  limit 1;
  if v_dup_external_id is not null then
    raise exception 'ABORTED: external_scene_id "%" is already assigned to a different scene in the database.', v_dup_external_id;
  end if;

  -- PERMANENCE: refuse to change an already-adopted external_scene_id to
  -- a different value. A row whose current value already matches the
  -- mapping is fine (that is exactly the safe-rerun case, state 2 above)
  -- and is intentionally excluded from this check by the <> comparison.
  select s.slug, s.external_scene_id, m.external_scene_id
  into v_immutable_slug, v_immutable_current_id, v_immutable_new_id
  from _scene_external_id_mapping m
  join public.scenes s on s.slug = m.slug
  where s.external_scene_id is not null
    and s.external_scene_id <> m.external_scene_id
  limit 1;
  if v_immutable_slug is not null then
    raise exception 'ABORTED: scene "%" already has a permanent external_scene_id "%" — this migration tried to change it to "%". external_scene_id can never be renamed, replaced, or recycled once set. If "%" is wrong, that is a separate, manually-reviewed correction — not something this file will do as a side effect of a mapping edit.',
      v_immutable_slug, v_immutable_current_id, v_immutable_new_id, v_immutable_current_id;
  end if;
end $$;

-- Scoped to external_scene_id IS NULL only — by this point every row is
-- guaranteed to be either NULL (write it) or already equal to the mapped
-- value (the WHERE clause below correctly skips it, since it is not
-- NULL); the DO block above has already aborted the entire migration if
-- any row's current value differs from the mapping. This UPDATE can
-- never overwrite an existing non-null external_scene_id with a
-- different one — that is enforced twice now: once by the check above,
-- and structurally here by only ever targeting NULL rows.
update public.scenes s
set external_scene_id = m.external_scene_id
from _scene_external_id_mapping m
where m.slug = s.slug
  and s.external_scene_id is null;
