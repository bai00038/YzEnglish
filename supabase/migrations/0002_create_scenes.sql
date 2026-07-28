-- Scenes: list-view fields plus full lesson content.
--
-- dialogue / expressions / vocabulary / tips are stored as JSONB rather than
-- child tables. They are always read as one bundle per scene, ordering is
-- just array order, and the shape matches src/data/types.ts (DialogueLine,
-- Expression, VocabularyEntry, CultureTip) exactly. Scenes with no lesson
-- content yet (everything except "Returning Clothes") simply leave these
-- columns null, which maps to the existing "coming soon" placeholder branch
-- in SceneDetailPage.tsx.
create table public.scenes (
  id serial primary key,
  slug text not null unique,
  title_en text not null,
  title_zh text not null,
  category_id int not null references public.categories(id),
  region text not null,
  level text not null,
  duration text not null,
  featured boolean not null default false,
  is_new boolean not null default false,
  description text not null,
  photo_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  scene_setup_en text,
  scene_setup_zh text,
  learning_goal_en text,
  learning_goal_zh text,
  dialogue jsonb,
  expressions jsonb,
  vocabulary jsonb,
  tips jsonb,
  related_scene_ids int[],
  prev_scene_id int references public.scenes(id),
  next_scene_id int references public.scenes(id),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scenes_category_id_idx on public.scenes (category_id);
create index scenes_status_idx on public.scenes (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scenes_set_updated_at
before update on public.scenes
for each row execute function public.set_updated_at();
