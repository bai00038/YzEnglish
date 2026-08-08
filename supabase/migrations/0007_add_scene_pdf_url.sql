-- Adds the public PDF link for a scene's downloadable resource.
--
-- Nullable: a scene with no PDF yet (most of them, today) simply has
-- pdf_url = null, which the frontend treats as "materials coming soon"
-- rather than a broken link (see mapSceneRow in src/data/scenes-access.ts
-- and the PDF button in SceneDetailPage.tsx). `if not exists` makes this
-- safe to re-run; it never touches existing rows/columns.
alter table public.scenes
  add column if not exists pdf_url text;
