-- Simplifies key_expressions/culture_tips down to exactly the columns the
-- redesigned "Learn the Language" module renders (see
-- src/app/pages/SceneDetailPage.tsx's KeyExpressionCard/CultureTipCard) and
-- the Google Sheet's Key_Expressions/Culture_Tips tabs now actually carry:
--   key_expressions: scene_id, sort_order, expression_en, expression_zh
--   culture_tips:    scene_id, sort_order, body_en, body_zh
--
-- key_expressions.usage_en/usage_zh/example_en/example_zh and
-- culture_tips.title_en/title_zh (added in
-- 0025_create_key_expressions_and_culture_tips.sql) are dropped outright —
-- the Sheet no longer has source columns for them, the frontend never
-- displayed them, and the old "Tips" sheet tab they used to be sourced/
-- backfilled from has been deleted. This is a destructive, data-losing
-- change for any existing usage/example/title values, which is expected:
-- the only scenes with real key_expressions/culture_tips rows at this point
-- are scene_001/scene_008/scene_013/scene_030, and all four are being
-- re-synced from the new Sheet structure right after this migration runs.
--
-- This migration ALSO fixes a real, pre-existing bug in 0025's
-- sync_scene_with_dialogue_lines, caught by `supabase db lint --linked`
-- against the currently-deployed function: both
-- `on conflict (scene_id, sort_order) do update set ...` clauses (for
-- key_expressions and culture_tips) raise "column reference scene_id is
-- ambiguous" (Postgres error 42702) at call time. The ON CONFLICT conflict
-- target list is parsed as an expression list (to support expression
-- indexes), not a plain column-name list, so the bare `scene_id` there is
-- subject to PL/pgSQL's variable substitution — and this function's own
-- `returns table(scene_id integer, action text)` declares an OUT
-- parameter also named `scene_id`, so every call that reaches either
-- upsert has been failing outright since 0025 was applied (this is why
-- key_expressions/culture_tips stayed empty for every scene despite
-- multiple sync attempts). `#variable_conflict use_column` below tells
-- PL/pgSQL to always prefer the table column over a same-named variable
-- for the whole function body — safe here because the `scene_id`/`action`
-- OUT parameters are never read by bare name anywhere in this function;
-- they're only populated positionally by the final
-- `return query select v_scene_id, v_action`, which uses the distinctly-
-- named local variables, not the OUT parameters, and is unaffected.
alter table public.key_expressions
  drop column usage_en,
  drop column usage_zh,
  drop column example_en,
  drop column example_zh;

alter table public.culture_tips
  drop column title_en,
  drop column title_zh;

comment on table public.key_expressions is
  'One row per key expression shown in a scene''s "Key Expressions" module (expression_en/expression_zh only — see 0026_simplify_key_expressions_and_culture_tips.sql). Upserted by (scene_id, sort_order) from the Key_Expressions Google Sheet tab — see google-apps-script/scenes-sync/Code.gs.';

comment on table public.culture_tips is
  'One row per culture/local note shown in a scene''s "Culture & Local Tips" module (body_en/body_zh only — the card header is a frontend-generated "Tip N" from sort_order, never a stored title — see 0026_simplify_key_expressions_and_culture_tips.sql). Upserted by (scene_id, sort_order) from the Culture_Tips Google Sheet tab.';

-- Same 22-argument signature as 0025 (no parameter added/removed/retyped),
-- so a plain CREATE OR REPLACE is sufficient here — unlike 0025's own
-- DROP + CREATE, which was required because IT changed the argument list.
-- Only the key_expressions/culture_tips insert/upsert column lists change
-- below; every other clause (scenes upsert, dialogue_lines upsert/prune,
-- tips column handling, error semantics) is copied verbatim from 0025.
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
  p_dialogue_lines jsonb,
  p_key_expressions jsonb default null,
  p_culture_tips jsonb default null
)
returns table(scene_id integer, action text)
language plpgsql
as $$
#variable_conflict use_column
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

      if exists (
        select 1
        from jsonb_array_elements(p_dialogue_lines) elem
        join public.dialogue_lines dl on dl.external_line_id = elem ->> 'external_line_id'
        where dl.scene_id <> v_scene_id
      ) then
        raise exception 'line_id_owned_by_other_scene: one or more external_line_id values in this request already belong to a different scene than external_scene_id "%".', p_external_scene_id;
      end if;

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

      delete from public.dialogue_lines
      where public.dialogue_lines.scene_id = v_scene_id
        and (
          external_line_id is null
          or external_line_id <> all (
            select elem ->> 'external_line_id' from jsonb_array_elements(p_dialogue_lines) elem
          )
        );
    else
      if p_status = 'published' then
        raise exception 'empty_dialogue_rejected: cannot clear all dialogue_lines for a published scene (external_scene_id "%"). Set status to draft first, or submit at least one line.', p_external_scene_id;
      end if;
      delete from public.dialogue_lines where public.dialogue_lines.scene_id = v_scene_id;
    end if;
  end if;

  -- key_expressions: expression_en/expression_zh only (usage_en/usage_zh/
  -- example_en/example_zh columns dropped above) — same null/empty-array
  -- "don't touch" semantics as 0025.
  if p_key_expressions is not null
    and jsonb_typeof(p_key_expressions) = 'array'
    and jsonb_array_length(p_key_expressions) > 0
  then
    if exists (
      select 1 from jsonb_array_elements(p_key_expressions) elem
      group by elem ->> 'sort_order'
      having count(*) > 1
    ) then
      raise exception 'duplicate_key_expression_sort_order: request for scene external_scene_id "%" contains duplicate sort_order values within key_expressions.', p_external_scene_id;
    end if;

    insert into public.key_expressions
      (scene_id, sort_order, expression_en, expression_zh)
    select
      v_scene_id,
      (elem ->> 'sort_order')::integer,
      elem ->> 'expression_en',
      elem ->> 'expression_zh'
    from jsonb_array_elements(p_key_expressions) elem
    on conflict (scene_id, sort_order) do update set
      expression_en = excluded.expression_en,
      expression_zh = excluded.expression_zh,
      updated_at = now();

    delete from public.key_expressions
    where public.key_expressions.scene_id = v_scene_id
      and sort_order <> all (
        select (elem ->> 'sort_order')::integer from jsonb_array_elements(p_key_expressions) elem
      );
  end if;

  -- culture_tips: body_en/body_zh only (title_en/title_zh columns dropped
  -- above — the frontend generates "Tip N" from sort_order instead, see
  -- src/app/pages/SceneDetailPage.tsx).
  if p_culture_tips is not null
    and jsonb_typeof(p_culture_tips) = 'array'
    and jsonb_array_length(p_culture_tips) > 0
  then
    if exists (
      select 1 from jsonb_array_elements(p_culture_tips) elem
      group by elem ->> 'sort_order'
      having count(*) > 1
    ) then
      raise exception 'duplicate_culture_tip_sort_order: request for scene external_scene_id "%" contains duplicate sort_order values within culture_tips.', p_external_scene_id;
    end if;

    insert into public.culture_tips
      (scene_id, sort_order, body_en, body_zh)
    select
      v_scene_id,
      (elem ->> 'sort_order')::integer,
      elem ->> 'body_en',
      elem ->> 'body_zh'
    from jsonb_array_elements(p_culture_tips) elem
    on conflict (scene_id, sort_order) do update set
      body_en = excluded.body_en,
      body_zh = excluded.body_zh,
      updated_at = now();

    delete from public.culture_tips
    where public.culture_tips.scene_id = v_scene_id
      and sort_order <> all (
        select (elem ->> 'sort_order')::integer from jsonb_array_elements(p_culture_tips) elem
      );
  end if;

  return query select v_scene_id, v_action;
end;
$$;

-- Same signature as 0025's grant, unaffected by this migration (still 22
-- args, same types) — but Postgres drops all privileges on a function only
-- when it's actually dropped and recreated with DROP + CREATE, not on a
-- plain CREATE OR REPLACE. This grant is reasserted anyway, defensively,
-- to guarantee the service role can still call it regardless.
revoke all on function public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb, jsonb, jsonb
) from public;
grant execute on function public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb, jsonb, jsonb
) to service_role;
