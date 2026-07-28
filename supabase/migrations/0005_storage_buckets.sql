-- Storage buckets: both public-read, no public write.
--
-- scene-photos: scene cover images (can replace the hardcoded Unsplash URLs
--   in photo_url over time; photo_url just holds whichever URL is current).
-- pdf-resources: only free resources need a real file uploaded here for
--   the MVP; premium rows can leave file_path null since there is no
--   payment gate to protect yet (the "Get Access" button is not wired up).
--
-- If your Supabase project restricts direct writes to storage.buckets from
-- the SQL editor, create the two buckets instead via
-- Dashboard > Storage > New bucket (name them exactly "scene-photos" and
-- "pdf-resources", toggle "Public bucket" on), then run only the two
-- `create policy` statements below.
insert into storage.buckets (id, name, public)
values
  ('scene-photos', 'scene-photos', true),
  ('pdf-resources', 'pdf-resources', true)
on conflict (id) do nothing;

create policy "public read scene-photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'scene-photos');

create policy "public read pdf-resources"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'pdf-resources');
