-- Extends scenes.status beyond the original draft/published pair to support
-- the CMS review workflow: a scene can now also be "ready_to_review" (author
-- is done, awaiting editorial sign-off) or "hidden" (was published, pulled
-- back without deleting anything). Only 'published' is ever visible to
-- public (anon/authenticated) clients — see 0004_rls_policies.sql's
-- "public read published scenes" policy, which already keys off `status =
-- 'published'` and therefore needs no change to keep these two new values
-- non-public. This migration only widens what the column will accept.
--
-- pdf_resources.status is untouched — it has its own, still draft/published-
-- only, check constraint (0003_create_pdf_resources.sql) and workflow.
alter table public.scenes
  drop constraint scenes_status_check;

alter table public.scenes
  add constraint scenes_status_check
  check (status in ('draft', 'ready_to_review', 'hidden', 'published'));
