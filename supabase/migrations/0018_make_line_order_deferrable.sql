-- Phase A-0, Stage F: make (scene_id, line_order) safely reorderable
-- within a single transaction.
--
-- Problem: swapping two lines' line_order (L1: 1->2, L2: 2->1), or
-- cycling three lines (L1: 1->2, L2: 2->3, L3: 3->1), cannot succeed
-- against an IMMEDIATE unique constraint — whichever row is written
-- first collides with whichever row still holds the target value, even
-- though the FINAL state after all writes is perfectly unique. This is
-- true no matter what order the upsert processes rows in, and no
-- amount of upsert-logic cleverness fixes it: the constraint itself has
-- to allow checking at the right time.
--
-- Fix: make dialogue_lines_scene_id_line_order_key DEFERRABLE INITIALLY
-- DEFERRED. Postgres then checks it once, at the end of the transaction,
-- instead of after every row write — so a batch of upserts that
-- transiently produces two rows sharing a line_order (mid-batch) is
-- fine, as long as the set is unique again by the time the enclosing
-- sync_scene_with_dialogue_lines() call (see 0019) finishes. This is the
-- standard, idiomatic Postgres pattern for in-place reorders; no
-- application-level two-phase "bump everything to negative values first"
-- workaround is needed.
--
-- This is a NEW migration, not an edit to 0012_add_dialogue_lines.sql —
-- 0012 already ran and is left untouched. The constraint is dropped and
-- recreated with the same name and the same columns, only adding
-- DEFERRABLE INITIALLY DEFERRED; nothing else about it changes.
--
-- dialogue_lines_external_line_id_key (also from 0013) is deliberately
-- left NON-deferrable: PostgreSQL does not allow a deferrable unique
-- constraint to be used as an ON CONFLICT arbiter, and the sync RPC's
-- upsert (0019) targets external_line_id via
-- `INSERT ... ON CONFLICT (external_line_id) DO UPDATE ...` — that stops
-- working the moment external_line_id's constraint becomes deferrable.
-- Only the (scene_id, line_order) constraint needs deferred checking;
-- external_line_id's uniqueness is never violated by a reorder (it isn't
-- based on line_order at all), so it never needed this in the first
-- place.
alter table public.dialogue_lines
  drop constraint dialogue_lines_scene_id_line_order_key;

alter table public.dialogue_lines
  add constraint dialogue_lines_scene_id_line_order_key
  unique (scene_id, line_order)
  deferrable initially deferred;
