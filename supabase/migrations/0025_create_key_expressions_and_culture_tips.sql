-- Splits the single scenes.tips jsonb column (title/body pairs
-- discriminated by tip_type, see 0021/validation.ts) into two proper child
-- tables with their own schemas — key_expressions gains usage_en/usage_zh/
-- example_en/example_zh, fields tips[] never had room for. Mirrors
-- dialogue_lines (0012/0019/0021): one child table per scene_id, upserted
-- by a natural key, pruned to exactly the submitted set on each sync.
--
-- Additive only, per the requested migration plan:
--   - scenes.tips (jsonb) is untouched — still written by the Figma_Data
--     pipeline and by scenes-sync's Tips tab, still read as a fallback by
--     src/data/scenes-access.ts (see "Temporary legacy Tips fallback"
--     there) until every scene has real key_expressions/culture_tips rows.
--   - Nothing here drops or rewrites any existing table, column, or
--     function beyond the one signature change required to add the new
--     optional sync parameters (see below).
comment on table public.scenes is
  'List-view fields plus legacy jsonb lesson content (dialogue/expressions/vocabulary/tips). tips is being superseded by public.key_expressions/public.culture_tips — see 0025_create_key_expressions_and_culture_tips.sql — but stays populated as a fallback until every scene is migrated.';

create table public.key_expressions (
  id bigint generated always as identity primary key,
  scene_id integer not null references public.scenes(id) on delete cascade,
  sort_order integer not null default 0,
  expression_en text not null,
  expression_zh text not null,
  usage_en text not null,
  usage_zh text not null,
  example_en text,
  example_zh text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Natural key: what a sync upsert keys off of (scene_id + sort_order,
  -- not a permanent external id like dialogue_lines.external_line_id —
  -- there is no cross-scene identity to protect here, only within-scene
  -- ordering, see this migration's header).
  unique (scene_id, sort_order)
);

create index key_expressions_scene_id_idx on public.key_expressions (scene_id);

comment on table public.key_expressions is
  'One row per key expression shown in a scene''s "Key Expressions" module. Upserted by (scene_id, sort_order) from the Key_Expressions Google Sheet tab — see google-apps-script/scenes-sync/Code.gs and this migration''s sync_scene_with_dialogue_lines changes.';

alter table public.key_expressions enable row level security;

create policy "public read key_expressions of published scenes"
  on public.key_expressions for select
  using (
    exists (
      select 1 from public.scenes
      where scenes.id = key_expressions.scene_id
        and scenes.status = 'published'
    )
  );

create trigger key_expressions_set_updated_at
  before update on public.key_expressions
  for each row
  execute function public.set_updated_at();

create table public.culture_tips (
  id bigint generated always as identity primary key,
  scene_id integer not null references public.scenes(id) on delete cascade,
  sort_order integer not null default 0,
  title_en text not null,
  title_zh text not null,
  body_en text not null,
  body_zh text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (scene_id, sort_order)
);

create index culture_tips_scene_id_idx on public.culture_tips (scene_id);

comment on table public.culture_tips is
  'One row per culture/local note shown in a scene''s "Culture & Local Tips" module. Upserted by (scene_id, sort_order) from the Culture_Tips Google Sheet tab — see google-apps-script/scenes-sync/Code.gs and this migration''s sync_scene_with_dialogue_lines changes.';

alter table public.culture_tips enable row level security;

create policy "public read culture_tips of published scenes"
  on public.culture_tips for select
  using (
    exists (
      select 1 from public.scenes
      where scenes.id = culture_tips.scene_id
        and scenes.status = 'published'
    )
  );

create trigger culture_tips_set_updated_at
  before update on public.culture_tips
  for each row
  execute function public.set_updated_at();

-- sync_scene_with_dialogue_lines gains two new optional parameters,
-- p_key_expressions and p_culture_tips, handled exactly like
-- p_dialogue_lines: null means "this sync doesn't manage this scene's
-- key_expressions/culture_tips at all, leave existing rows alone." Unlike
-- p_dialogue_lines (where an explicit empty array IS accepted as "clear
-- everything", gated by scene status), an empty array here is treated the
-- same as null — matching the tips[] protection added in
-- 0021_protect_tips_from_empty_overwrite.sql, for the same reason: the
-- sync-scene Edge Function only ever sets these payload keys when the
-- corresponding Sheet tab actually has at least one row for that
-- scene_id (see validateScenePayload in
-- supabase/functions/sync-scene/validation.ts and buildPayload_ in
-- google-apps-script/scenes-sync/Code.gs), so a caller sending `[]` here
-- would only mean "no rows yet", never "clear this scene's real rows" —
-- clearing every row for a scene is not a supported operation from this
-- pipeline, only removing individual rows (by omitting them from an
-- otherwise non-empty submission) is.
--
-- This requires DROP + CREATE (not a plain CREATE OR REPLACE): adding
-- parameters changes the function's signature, so Postgres would treat a
-- same-name CREATE OR REPLACE with a different argument list as a new,
-- separate overload rather than replacing 0021's 20-argument version —
-- see this migration's own comment further down by the revoke/grant
-- statements.
drop function if exists public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb
);

create function public.sync_scene_with_dialogue_lines(
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
      -- Unchanged from 0021: a present-but-empty tips[] never clears
      -- existing tips. Only a non-empty array replaces the column.
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

  -- key_expressions: null (or an empty/non-array payload) means "don't
  -- touch" — see this migration's header for why an empty array is not
  -- treated as "clear". A non-empty array is upserted by (scene_id,
  -- sort_order) and then scoped-pruned: any existing row for this scene
  -- whose sort_order isn't in the submitted set is deleted, but rows
  -- belonging to OTHER scenes are never touched (every statement below is
  -- filtered by scene_id = v_scene_id).
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
      (scene_id, sort_order, expression_en, expression_zh, usage_en, usage_zh, example_en, example_zh)
    select
      v_scene_id,
      (elem ->> 'sort_order')::integer,
      elem ->> 'expression_en',
      elem ->> 'expression_zh',
      elem ->> 'usage_en',
      elem ->> 'usage_zh',
      nullif(elem ->> 'example_en', ''),
      nullif(elem ->> 'example_zh', '')
    from jsonb_array_elements(p_key_expressions) elem
    on conflict (scene_id, sort_order) do update set
      expression_en = excluded.expression_en,
      expression_zh = excluded.expression_zh,
      usage_en = excluded.usage_en,
      usage_zh = excluded.usage_zh,
      example_en = excluded.example_en,
      example_zh = excluded.example_zh,
      updated_at = now();

    -- Qualified as public.key_expressions.scene_id (not bare `scene_id`):
    -- this function's RETURNS TABLE(scene_id integer, ...) makes
    -- `scene_id` an OUT-parameter variable in scope for the whole
    -- function body, and key_expressions has its own scene_id column —
    -- an unqualified reference here is ambiguous and errors under
    -- Postgres's default plpgsql.variable_conflict setting. Same reason
    -- the dialogue_lines block above always writes
    -- `public.dialogue_lines.scene_id`, never bare `scene_id`.
    delete from public.key_expressions
    where public.key_expressions.scene_id = v_scene_id
      and sort_order <> all (
        select (elem ->> 'sort_order')::integer from jsonb_array_elements(p_key_expressions) elem
      );
  end if;

  -- culture_tips: same semantics as key_expressions immediately above.
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
      (scene_id, sort_order, title_en, title_zh, body_en, body_zh)
    select
      v_scene_id,
      (elem ->> 'sort_order')::integer,
      elem ->> 'title_en',
      elem ->> 'title_zh',
      elem ->> 'body_en',
      elem ->> 'body_zh'
    from jsonb_array_elements(p_culture_tips) elem
    on conflict (scene_id, sort_order) do update set
      title_en = excluded.title_en,
      title_zh = excluded.title_zh,
      body_en = excluded.body_en,
      body_zh = excluded.body_zh,
      updated_at = now();

    -- Qualified as public.culture_tips.scene_id — same ambiguity reason
    -- as the key_expressions delete above.
    delete from public.culture_tips
    where public.culture_tips.scene_id = v_scene_id
      and sort_order <> all (
        select (elem ->> 'sort_order')::integer from jsonb_array_elements(p_culture_tips) elem
      );
  end if;

  return query select v_scene_id, v_action;
end;
$$;

-- Write access only for the service role (the sync-scene Edge Function) —
-- unchanged from 0019/0020/0021, now on the 22-argument signature.
revoke all on function public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb, jsonb, jsonb
) from public;
grant execute on function public.sync_scene_with_dialogue_lines(
  text, text, text, text, integer, text, text, text, text, text, text, text, text, integer,
  text, text, text, text, jsonb, jsonb, jsonb, jsonb
) to service_role;
