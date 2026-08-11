-- Resource collections for the Resources page (PDF bundle packs — topic /
-- travel / country groupings of multiple scenes). This is a NEW, separate
-- table from public.pdf_resources: pdf_resources still owns the one-PDF-
-- per-scene downloads linked from each Scene Detail page, while
-- resource_collections owns the multi-scene packs shown on /resources.
-- Neither table reads from or writes to the other, and this migration does
-- not touch public.scenes, public.dialogue_lines, or public.pdf_resources.
--
-- Synced from a dedicated Google Sheet tab ("Resource_Collections") via
-- google-apps-script/resource-collections-sync/Code.gs and the
-- sync-resource-collection Edge Function — see that folder's README.md.
--
-- external_collection_id mirrors scenes.external_scene_id (see
-- 0013_add_external_ids.sql / 0014_adopt_scene_external_ids.sql): a
-- permanent, sheet-authored identity ("collection01", ...) that the sync
-- upserts against, independent of the internal serial id.
--
-- scene_ids is a plain text column holding the sheet cell's raw
-- comma-separated external scene ids (e.g. "scene01, scene08,scene13") —
-- a loose association, not a foreign key, and not parsed/split at write
-- time. Nothing in this migration validates that those ids exist in
-- public.scenes, and the website never joins against public.scenes to
-- render a collection card (see src/data/resource-collections-access.ts)
-- — only scene_count (a plain integer, authored directly on the sheet
-- row) is displayed.
create table public.resource_collections (
  id serial primary key,
  external_collection_id text not null unique,
  title_en text not null,
  title_zh text not null,
  description_en text not null default '',
  description_zh text not null default '',
  collection_type text not null check (collection_type in ('topic', 'travel', 'country')),
  price_type text not null check (price_type in ('free', 'paid')),
  price numeric(10, 2) check (price is null or price >= 0),
  cover_image_url text,
  pdf_url text,
  scene_ids text not null default '',
  scene_count int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resource_collections_status_idx on public.resource_collections (status);

-- Reuses the same trigger function scenes/pdf_resources already share
-- (defined once in 0002_create_scenes.sql).
create trigger resource_collections_set_updated_at
before update on public.resource_collections
for each row execute function public.set_updated_at();

-- Mirrors "public read published pdf_resources" (0004_rls_policies.sql):
-- anon/authenticated clients may only SELECT published rows. No INSERT/
-- UPDATE/DELETE policy exists, so writes are denied by default for those
-- roles — every write happens via the sync-resource-collection Edge
-- Function using the service role, which bypasses RLS.
alter table public.resource_collections enable row level security;

create policy "public read published resource_collections"
on public.resource_collections
for select
to anon, authenticated
using (status = 'published');
