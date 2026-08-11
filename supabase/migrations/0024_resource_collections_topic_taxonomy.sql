-- Replaces resource_collections.collection_type's format/topic/geography
-- mishmash ('topic', 'travel', 'country') with one consistent topic-based
-- taxonomy, driven by the /resources page filter redesign.
--
-- New allowed values (MVP ships filter pills for only the first two —
-- see TYPE_FILTERS in src/app/pages/ResourcesPage.tsx, which hides any
-- pill with zero published collections):
--   daily_life         -> "Daily Life · 日常生活"
--   tests_licences      -> "Tests & Guides · 考试指南"
--   essential_services  -> "Essential Services · 生活办事" (reserved, unused so far)
--   travel              -> "Travel · 出行旅游" (carried over unchanged from the old taxonomy)
--
-- Data fix (queried live via the anon key on 2026-08-11 — the only two
-- published rows, both still 'topic' from the old taxonomy):
--   collection01 "Ontario Driver's Licence Test Guide" -> tests_licences
--   collection02 "Dental English Guide"                -> daily_life
--
-- The old constraint has to come off BEFORE these updates run — Postgres
-- validates every UPDATE against the constraint that's live at the time,
-- so writing 'tests_licences'/'daily_life' while the old
-- ('topic','travel','country') check is still in place would fail. The
-- new constraint goes on last, once every row already holds a value it
-- allows.
alter table public.resource_collections
  drop constraint resource_collections_collection_type_check;

update public.resource_collections
set collection_type = 'tests_licences'
where external_collection_id = 'collection01';

update public.resource_collections
set collection_type = 'daily_life'
where external_collection_id = 'collection02';

alter table public.resource_collections
  add constraint resource_collections_collection_type_check
  check (collection_type in ('daily_life', 'tests_licences', 'essential_services', 'travel'));
