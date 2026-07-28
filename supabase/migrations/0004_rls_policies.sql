-- Row Level Security: public (anon/authenticated) clients may only ever
-- SELECT, and only rows with status = 'published'. There are no INSERT,
-- UPDATE, or DELETE policies at all, so those operations are denied by
-- default for anon/authenticated — all writes happen via the Supabase
-- Dashboard using the postgres/service role, which bypasses RLS.
alter table public.categories enable row level security;
alter table public.scenes enable row level security;
alter table public.pdf_resources enable row level security;

create policy "public read categories"
on public.categories
for select
to anon, authenticated
using (true);

create policy "public read published scenes"
on public.scenes
for select
to anon, authenticated
using (status = 'published');

create policy "public read published pdf_resources"
on public.pdf_resources
for select
to anon, authenticated
using (status = 'published');
