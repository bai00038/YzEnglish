-- Scene categories (e.g. "Shopping & Returns").
-- name_zh is nullable: the current app has no Chinese category names anywhere
-- (CATEGORIES/CATEGORY_BG in src/data/scenes.ts are English-only display constants).
create table public.categories (
  id serial primary key,
  slug text not null unique,
  name_en text not null,
  name_zh text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
