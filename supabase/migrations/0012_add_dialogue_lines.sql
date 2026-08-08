-- Adds public.dialogue_lines: one row per spoken line, replacing the
-- text-matching that previously had to reconcile Figma_Data's wide-format
-- dialogue[] (no timing) against subtitle_cues (timing, but a separate
-- source that didn't always split the same way — see the greedy
-- concatenation matching this replaces in SceneDetailPage.tsx).
--
-- This is additive only: scenes.dialogue/expressions/vocabulary/tips/
-- subtitle_cues are untouched. A scene with no dialogue_lines rows keeps
-- rendering exactly as it does today, from the legacy JSONB columns —
-- see the fallback logic added alongside this migration in
-- src/data/scenes-access.ts. Migrating a scene to the new structure is
-- just inserting rows here; nothing to flip elsewhere.
create table if not exists public.dialogue_lines (
  id bigint generated always as identity primary key,
  scene_id integer not null references public.scenes(id) on delete cascade,
  line_order integer not null,
  step integer,
  speaker text not null,
  speaker_zh text not null,
  dialogue_en text not null,
  dialogue_zh text not null,
  start_time double precision,
  end_time double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Natural key: also what a sync upsert keys off of, and what stops a
  -- line-order typo from silently producing two lines in the same slot.
  unique (scene_id, line_order),
  check (start_time is null or start_time >= 0),
  check (start_time is null or end_time is null or end_time > start_time)
);

create index if not exists dialogue_lines_scene_id_idx on public.dialogue_lines(scene_id);

comment on table public.dialogue_lines is
  'One row per spoken line: the single source for both the rendered dialogue transcript and its subtitle/audio timing. Additive alongside legacy scenes.dialogue/subtitle_cues jsonb — see 0012 migration header and src/data/scenes-access.ts.';

alter table public.dialogue_lines enable row level security;

-- Mirrors "public read published scenes" on public.scenes: a dialogue
-- line is only publicly readable if its parent scene is published.
create policy "public read dialogue_lines of published scenes"
  on public.dialogue_lines for select
  using (
    exists (
      select 1 from public.scenes
      where scenes.id = dialogue_lines.scene_id
        and scenes.status = 'published'
    )
  );

create or replace function public.set_dialogue_lines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dialogue_lines_set_updated_at
  before update on public.dialogue_lines
  for each row
  execute function public.set_dialogue_lines_updated_at();

-- Atomic "replace all lines for this scene" — a sync is a full
-- resync-from-source for a scene's dialogue, same all-or-nothing model
-- as updateScene() already uses for the scenes row itself
-- (supabase/functions/sync-scene/db.ts). Delete-then-insert has to be
-- one transaction: if insert fails partway, a bare two-step call from
-- the Edge Function would leave that scene's dialogue_lines empty until
-- someone notices and re-syncs. Wrapping both statements in a single
-- function body means Postgres rolls back the whole call together on
-- any error — the caller sees a failure and nothing changed, never a
-- silently-emptied scene.
--
-- p_lines shape (one array element per line):
--   { "line_order": 1, "step": 1, "speaker": "Dentist", "speaker_zh": "牙医",
--     "dialogue_en": "...", "dialogue_zh": "...",
--     "start_time": 2.023, "end_time": 3.839 }
-- start_time/end_time may be omitted or null (a line with no timing yet
-- still replaces the transcript; see the CHECK constraints above for
-- what's still enforced when they are present).
create or replace function public.replace_dialogue_lines(p_scene_id integer, p_lines jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.dialogue_lines where scene_id = p_scene_id;

  insert into public.dialogue_lines
    (scene_id, line_order, step, speaker, speaker_zh, dialogue_en, dialogue_zh, start_time, end_time)
  select
    p_scene_id,
    (line ->> 'line_order')::integer,
    nullif(line ->> 'step', '')::integer,
    line ->> 'speaker',
    line ->> 'speaker_zh',
    line ->> 'dialogue_en',
    line ->> 'dialogue_zh',
    nullif(line ->> 'start_time', '')::double precision,
    nullif(line ->> 'end_time', '')::double precision
  from jsonb_array_elements(p_lines) as line;
end;
$$;

-- Write access only for the service role (the sync-scene Edge Function).
-- Not exposed to anon/authenticated — this is a bulk-replace of a
-- scene's entire transcript, not a public-facing operation.
revoke all on function public.replace_dialogue_lines(integer, jsonb) from public;
grant execute on function public.replace_dialogue_lines(integer, jsonb) to service_role;
