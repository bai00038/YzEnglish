-- Downloadable PDF resource metadata.
--
-- category is free text, not a foreign key to public.categories: the current
-- mock data (src/data/resources.ts) tags resources with values like "Canada"
-- and "Travel" that don't line up with the scene CATEGORIES list. Forcing a
-- strict relationship here would misrepresent data that's a loose label today.
create table public.pdf_resources (
  id serial primary key,
  title text not null,
  title_zh text not null,
  type text not null,
  description text not null,
  scene_count int not null default 0,
  is_free boolean not null default false,
  category text not null,
  file_path text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pdf_resources_set_updated_at
before update on public.pdf_resources
for each row execute function public.set_updated_at();
