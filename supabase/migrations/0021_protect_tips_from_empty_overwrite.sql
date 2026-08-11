-- Second layer of the tips-wipe fix (see also
-- supabase/functions/sync-scene/validation.ts and
-- google-apps-script/scenes-sync/Code.gs's buildPayload_).
--
-- What happened: scene_001's scenes-sync run (the one that populated
-- dialogue_lines correctly) also submitted `tips: []`, because Code.gs
-- unconditionally sent `tips: tipsBySceneId[sceneId] || []` even when the
-- Tips sheet had zero rows for that scene_id yet. The Edge Function
-- treated the present-but-empty key exactly like "replace with this
-- value" (same as every other optional jsonb field), and this RPC's
-- `tips = case when p_optional_fields ? 'tips' then ... else tips end`
-- unconditionally overwrote the column — wiping scene_001's 2 real tips
-- down to []. See 0022 (the data-restore migration, applied out-of-band
-- via `supabase db query --linked` per the accompanying audit) for
-- fixing scene_001's actual row.
--
-- This migration is the DB-level half of the fix, independent of
-- whether the Edge Function's own guard (validation.ts) is ever bypassed
-- (direct RPC call, a future caller that doesn't go through this Edge
-- Function, etc.): the UPDATE path's tips assignment now only replaces
-- the column when the submitted array is non-empty. An omitted key OR an
-- explicitly empty tips[] both leave the existing value untouched.
--
-- Deliberately scoped to tips only, matching the audit's explicit
-- request not to widen this fix to dialogue/expressions/vocabulary/
-- subtitle_cues — those have the same theoretical risk (see the audit
-- report) but are a separate, not-yet-approved change.
--
-- Deliberately does NOT touch the INSERT path's tips handling: a
-- brand-new scene has no existing tips to protect, so `[]` vs `null` on
-- first insert is immaterial.
--
-- No other logic changes from 0020: same statements, same order, same
-- checks, same error messages, elsewhere in the function.
create or replace function public.sync_scene_with_dialogue_lines(
  p_external_scene_id text,
  p_slug text,
  p_title_en text,
  p_title_zh text,
  p_category_id integer,
  p_region text,
  p_level text,
  p_duration text,
  p_description text,
  p_photo_url text,
  p_pdf_url text,
  p_video_url text,
  p_status text,
  p_sort_order integer,
  p_scene_setup_en text,
  p_scene_setup_zh text,
  p_learning_goal_en text,
  p_learning_goal_zh text,
  p_optional_fields jsonb,
  p_dialogue_lines jsonb
)
returns table(scene_id integer, action text)
language plpgsql
as $$
declare
  v_scene_id integer;
  v_action text;
  v_conflicting_slug_owner integer;
  v_line_count integer;
  v_distinct_line_id_count integer;
  v_unmapped_legacy_count integer;
  v_written_line_ids text[];
begin
  if p_external_scene_id is null or trim(p_external_scene_id) = '' then
    raise exception 'missing_external_scene_id: external_scene_id is required.';
  end if;
  if p_slug is null or trim(p_slug) = '' then
    raise exception 'missing_slug: slug is required.';
  end if;

  select id into v_scene_id from public.scenes where external_scene_id = p_external_scene_id;

  if v_scene_id is null then
    -- Insert path. A brand-new scene cannot claim a slug that already
    -- belongs to some other (already-existing) scene — and this is NOT
    -- treated as "the same scene, adopt it": a slug collision here is
    -- always a hard error, never a silent merge.
    select id into v_conflicting_slug_owner from public.scenes where slug = p_slug;
    if v_conflicting_slug_owner is not null then
      raise exception 'slug_conflict: slug "%" is already used by another scene (database id %) — refusing to create a new scene with external_scene_id "%". If this slug''s existing scene should have been matched instead, its external_scene_id needs a human-confirmed adoption migration (see 0014_adopt_scene_external_ids.sql), not a sync from here.',
        p_slug, v_conflicting_slug_owner, p_external_scene_id;
    end if;

    insert into public.scenes (
      external_scene_id, slug, title_en, title_zh, category_id, region, level, duration,
      description, photo_url, pdf_url, video_url, status, sort_order,
      scene_setup_en, scene_setup_zh, learning_goal_en, learning_goal_zh,
      dialogue, expressions, vocabulary, subtitle_cues, tips
    )
    values (
      p_external_scene_id, p_slug, p_title_en, p_title_zh, p_category_id, p_region, p_level, p_duration,
      p_description, p_photo_url, p_pdf_url, p_video_url, p_status, p_sort_order,
      p_scene_setup_en, p_scene_setup_zh, p_learning_goal_en, p_learning_goal_zh,
      case when p_optional_fields ? 'dialogue' then p_optional_fields -> 'dialogue' else null end,
      case when p_optional_fields ? 'expressions' then p_optional_fields -> 'expressions' else null end,
      case when p_optional_fields ? 'vocabulary' then p_optional_fields -> 'vocabulary' else null end,
      case when p_optional_fields ? 'subtitle_cues' then p_optional_fields -> 'subtitle_cues' else null end,
      case when p_optional_fields ? 'tips' then p_optional_fields -> 'tips' else null end
    )
    returning id into v_scene_id;
    v_action := 'inserted';
  else
    -- Update path. This external_scene_id may bring a new slug (allowed
    -- — that's the same scene renaming its URL) but not a slug owned by
    -- a DIFFERENT scene.
    select id into v_conflicting_slug_owner from public.scenes where slug = p_slug and id <> v_scene_id;
    if v_conflicting_slug_owner is not null then
      raise exception 'slug_conflict: slug "%" is already used by a different scene (database id %) — refusing to reassign it to external_scene_id "%".',
        p_slug, v_conflicting_slug_owner, p_external_scene_id;
    end if;

    update public.scenes set
      slug = p_slug,
      title_en = p_title_en,
      title_zh = p_title_zh,
      category_id = p_category_id,
      region = p_region,
      level = p_level,
      duration = p_duration,
      description = p_description,
      photo_url = p_photo_url,
      pdf_url = p_pdf_url,
      video_url = p_video_url,
      status = p_status,
      sort_order = p_sort_order,
      scene_setup_en = p_scene_setup_en,
      scene_setup_zh = p_scene_setup_zh,
      learning_goal_en = p_learning_goal_en,
      learning_goal_zh = p_learning_goal_zh,
      dialogue = case when p_optional_fields ? 'dialogue' then p_optional_fields -> 'dialogue' else dialogue end,
      expressions = case when p_optional_fields ? 'expressions' then p_optional_fields -> 'expressions' else expressions end,
      vocabulary = case when p_optional_fields ? 'vocabulary' then p_optional_fields -> 'vocabulary' else vocabulary end,
      subtitle_cues = case when p_optional_fields ? 'subtitle_cues' then p_optional_fields -> 'subtitle_cues' else subtitle_cues end,
      -- Fixed here (was: `case when p_optional_fields ? 'tips' then
      -- p_optional_fields -> 'tips' else tips end`): a present-but-empty
      -- tips[] no longer clears existing tips. Only a non-empty array
      -- replaces the column; an omitted key or an empty array both leave
      -- `tips` exactly as it was. See this file's header for the incident
      -- that motivated this.
      tips = case
        when p_optional_fields ? 'tips'
          and jsonb_typeof(p_optional_fields -> 'tips') = 'array'
          and jsonb_array_length(p_optional_fields -> 'tips') > 0
        then p_optional_fields -> 'tips'
        else tips
      end,
      updated_at = now()
    where id = v_scene_id;
    v_action := 'updated';
  end if;

  if p_dialogue_lines is not null then
    -- Refuse to touch a scene's dialogue_lines at all while it still has
    -- any row with no external_line_id — see 0019's header. That scene
    -- needs its own human-confirmed adoption migration first
    -- (0015_adopt_dialogue_line_external_ids.sql is the template for
    -- exactly this).
    select count(*) into v_unmapped_legacy_count
    from public.dialogue_lines
    where public.dialogue_lines.scene_id = v_scene_id and external_line_id is null;
    if v_unmapped_legacy_count > 0 then
      raise exception 'unmapped_legacy_dialogue_lines: scene "%" still has % dialogue_lines row(s) with no external_line_id. Run a human-confirmed adoption migration for this scene''s existing rows before syncing its dialogue_lines through this RPC — see 0015_adopt_dialogue_line_external_ids.sql.',
        p_external_scene_id, v_unmapped_legacy_count;
    end if;

    v_line_count := jsonb_array_length(p_dialogue_lines);

    if v_line_count > 0 then
      if exists (
        select 1 from jsonb_array_elements(p_dialogue_lines) elem
        where coalesce(trim(elem ->> 'external_line_id'), '') = ''
      ) then
        raise exception 'missing_line_id: every dialogue_lines[] entry must include a non-empty external_line_id (scene external_scene_id "%").', p_external_scene_id;
      end if;

      select count(*), count(distinct elem ->> 'external_line_id')
        into v_line_count, v_distinct_line_id_count
        from jsonb_array_elements(p_dialogue_lines) elem;
      if v_line_count <> v_distinct_line_id_count then
        raise exception 'duplicate_line_id: request for scene external_scene_id "%" contains duplicate external_line_id values within the same submission.', p_external_scene_id;
      end if;

      -- Fast-path pre-check: rejects the obvious, non-racing case (an
      -- external_line_id that already, visibly, belongs to another scene)
      -- without even attempting a write. This is a plain SELECT, NOT a
      -- lock, and is NOT sufficient on its own against a concurrent
      -- request — see the write-time guard and RETURNING-based
      -- verification right below, which is the actual authoritative
      -- check.
      if exists (
        select 1
        from jsonb_array_elements(p_dialogue_lines) elem
        join public.dialogue_lines dl on dl.external_line_id = elem ->> 'external_line_id'
        where dl.scene_id <> v_scene_id
      ) then
        raise exception 'line_id_owned_by_other_scene: one or more external_line_id values in this request already belong to a different scene than external_scene_id "%".', p_external_scene_id;
      end if;

      -- Upsert by external_line_id, concurrency-safe against two scenes
      -- racing to claim the same brand-new external_line_id at once (see
      -- 0019's header, bug 3, for the failure mode this replaces).
      --
      -- dialogue_lines_scene_id_line_order_key is DEFERRABLE INITIALLY
      -- DEFERRED as of 0018, so Postgres does not check (scene_id,
      -- line_order) uniqueness until this whole function call's
      -- transaction commits — a batch that transiently produces two rows
      -- sharing a line_order (e.g. mid-swap) is fine as long as the set
      -- is unique again once every statement below has run.
      --
      -- `scene_id` is deliberately absent from the SET list — it is only
      -- ever written once, by the INSERT arm, and an UPDATE can never
      -- reassign it. The `where public.dialogue_lines.scene_id =
      -- v_scene_id` guard means the UPDATE arm only fires when the
      -- conflicting row already belongs to THIS scene; if two concurrent
      -- transactions for two different scenes both try to claim the same
      -- new external_line_id, Postgres serializes them at the unique
      -- index (the second blocks until the first commits or aborts, then
      -- re-evaluates ON CONFLICT against the now-committed row, not
      -- against stale pre-check state) — so the loser's WHERE guard sees
      -- the winner's real scene_id, does not match, and that row is left
      -- untouched rather than moved.
      --
      -- A WHERE-guarded DO UPDATE that doesn't match does not raise an
      -- error by itself — Postgres silently leaves the row alone, which
      -- is exactly the "quiet success" this was asked to rule out.
      -- RETURNING closes that gap: only rows actually written (freshly
      -- inserted, or updated because the WHERE matched) come back into
      -- v_written_line_ids. Every submitted external_line_id is checked
      -- against that set immediately after — anything missing means its
      -- row exists under a different scene_id and was silently skipped,
      -- so this raises line_id_owned_by_other_scene explicitly instead of
      -- continuing as if the write had succeeded. Because the whole
      -- function body is one transaction, that exception rolls back the
      -- scene field write and every other line's upsert too — this
      -- request is rejected as a whole, the same as any other failure
      -- path in this function.
      with written as (
        insert into public.dialogue_lines
          (scene_id, external_line_id, line_order, step, speaker, speaker_zh, dialogue_en, dialogue_zh, start_time, end_time)
        select
          v_scene_id,
          elem ->> 'external_line_id',
          (elem ->> 'line_order')::integer,
          nullif(elem ->> 'step', '')::integer,
          elem ->> 'speaker',
          elem ->> 'speaker_zh',
          elem ->> 'dialogue_en',
          elem ->> 'dialogue_zh',
          nullif(elem ->> 'start_time', '')::double precision,
          nullif(elem ->> 'end_time', '')::double precision
        from jsonb_array_elements(p_dialogue_lines) elem
        on conflict (external_line_id) do update set
          line_order = excluded.line_order,
          step = excluded.step,
          speaker = excluded.speaker,
          speaker_zh = excluded.speaker_zh,
          dialogue_en = excluded.dialogue_en,
          dialogue_zh = excluded.dialogue_zh,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          updated_at = now()
        where public.dialogue_lines.scene_id = v_scene_id
        returning external_line_id
      )
      select array_agg(external_line_id) into v_written_line_ids from written;

      if exists (
        select 1 from jsonb_array_elements(p_dialogue_lines) elem
        where not (elem ->> 'external_line_id' = any (coalesce(v_written_line_ids, array[]::text[])))
      ) then
        raise exception 'line_id_owned_by_other_scene: one or more external_line_id values in this request belong to a different scene than external_scene_id "%" (detected after the write attempt — a concurrent sync of the same line_id under a different scene is the expected cause).', p_external_scene_id;
      end if;

      -- Scoped prune: this payload is the complete set for v_scene_id.
      -- Explicitly includes `external_line_id is null` — without it,
      -- `external_line_id <> all (...)` alone evaluates to NULL (not
      -- TRUE) for a NULL row and that row would never be deleted, no
      -- matter what was submitted. Bounded by `scene_id = v_scene_id`,
      -- so this can never reach another scene's rows. In practice this
      -- branch should never find a NULL row here — the
      -- unmapped_legacy_dialogue_lines check above already refused to
      -- proceed if one existed — but the prune stays correct on its own
      -- terms regardless, rather than depending solely on that earlier
      -- check.
      delete from public.dialogue_lines
      where public.dialogue_lines.scene_id = v_scene_id
        and (
          external_line_id is null
          or external_line_id <> all (
            select elem ->> 'external_line_id' from jsonb_array_elements(p_dialogue_lines) elem
          )
        );
    else
      -- Empty array: an explicit "this scene now has zero dialogue
      -- lines." Only acceptable for a draft scene.
      if p_status = 'published' then
        raise exception 'empty_dialogue_rejected: cannot clear all dialogue_lines for a published scene (external_scene_id "%"). Set status to draft first, or submit at least one line.', p_external_scene_id;
      end if;
      delete from public.dialogue_lines where public.dialogue_lines.scene_id = v_scene_id;
    end if;
  end if;

  return query select v_scene_id, v_action;
end;
$$;

-- Write access only for the service role (the sync-scene Edge Function) —
-- unchanged from 0019/0020.
revoke all on function public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb
) to service_role;
