# Yz English — Scenes / Dialogue_Lines / Key_Expressions / Culture_Tips sync (Google Apps Script)

Syncs a **new, separate** Google Sheet to the same `sync-scene` Supabase
Edge Function used by the original Figma_Data pipeline
(`google-apps-script/Code.gs`, one level up) — but this script is
independent and bound to a different spreadsheet. It does not read or
write Figma_Data at all, and Figma_Data's own sync script is untouched.

The `Tips` tab that `Key_Expressions`/`Culture_Tips` originally replaced
has been **deleted from this spreadsheet** and this script no longer reads
it, references it, or sends a `tips` payload key at all — see "Tab 3:
Key_Expressions" and "Tab 3b: Culture_Tips" below for the two tabs that
remain, and "What this script does NOT touch" for what stays untouched as
a result.

Only two scenes exist in this structure so far, migrated by hand as
templates: `shopping-for-clothes` and (deferred, see below)
`getting-a-dental-filling`. Every other scene stays on the Figma_Data
pipeline and is currently `status = draft` (unpublished, not deleted).

## Why a separate script instead of extending Code.gs

Figma_Data stays as the source for Figma PDF export — that's its only
job going forward, not the website. This script owns a different,
non-overlapping set of `scenes` columns. See "What this script does NOT
touch" below for the field split.

## Setup

1. Create a **new** Google Sheet (a new file, not a tab in the existing
   Figma PDF Data Template).
2. Add tabs named exactly as below, each with a header row (row 1)
   containing exactly the column names listed — order doesn't matter,
   columns are read by header name: `Scenes`, `Dialogue_Lines`,
   `Resource_Collections`, `Key_Expressions`, `Culture_Tips`,
   `Validation`, `Sync_Log`. (No `Tips` tab — see the note at the top of
   this file.)
3. `Extensions → Apps Script`, delete the boilerplate, paste in the full
   contents of `Code.gs` from this folder, save.
4. Set the two Script Properties (`Project Settings → Script
   Properties`): `SYNC_FUNCTION_URL` and `SYNC_SECRET` — same values as
   the Figma_Data script's, since it's the same Edge Function. Never put
   these in a sheet cell.
5. Reload the sheet — a **"Yz English Sync"** menu appears.

## Tab 1: `Scenes` — one row per scene

| Column | Notes |
|---|---|
| `scene_id` | **Permanent identity, required.** e.g. `scene_001`. This is now the field the Edge Function uses to find "the same scene" across syncs (`public.scenes.external_scene_id`) — not a log label, and never written to `scenes.id`. Set it once when a scene is first created in this sheet and never change it; changing it will make the sync treat the row as a brand-new scene instead of updating the existing one. |
| `slug` | Still required and still unique, but no longer the match key — it's what powers the page URL. Changing `slug` for an existing `scene_id` renames that scene's URL; it does not create a second scene. Submitting a `slug` that already belongs to a *different* `scene_id` fails the sync outright (never silently merged or overwritten). |
| `title_en` / `title_zh` | |
| `category_en` | Matched server-side against `categories.name_en`, case-sensitive exact. |
| `region` / `level` / `duration` | |
| `status` | Exactly `draft` or `published`, case-sensitive. |
| `cover_image` | Public image URL. Blank → `photo_url` cleared to null. |
| `pdf_url` | Public Supabase Storage URL. Blank → cleared to null. |
| `video_url` | Public Supabase Storage URL (`video_resources` bucket). Blank → cleared to null. |
| `mission_en` | Required — becomes `scenes.description`. |
| `scene_setup_en` / `scene_setup_zh` | Optional. |
| `learning_goal_en` / `learning_goal_zh` | Optional. |
| `sort_order` | Blank → `0`. Must be a whole number if filled. |
| `sync_status` | Must be exactly `Ready` to sync this row. Written back as `Syncing`/`Synced`/`Error`. |
| `last_synced_at` | Written back on success. |
| `sync_message` | Written back with the latest result. |

## Tab 2: `Dialogue_Lines` — one row per spoken line

The single source for both the rendered dialogue transcript and its
subtitle/click-to-play timing — one row is both a dialogue bubble and a
subtitle cue. See `supabase/migrations/0012_add_dialogue_lines.sql` and
`src/data/scenes-access.ts`'s `applyDialogueLinesOverride` for how the
website consumes this.

Recommended column order (any order actually works — every column is
read by header name, not position):

```
line_id  scene_id  line_order  step  speaker  speaker_zh  dialogue_en  dialogue_zh  start_time  end_time
```

| Column | Notes |
|---|---|
| `line_id` | **Permanent identity, required.** This line's `public.dialogue_lines.external_line_id` — independent of `line_order`/`step`/`speaker`/the dialogue text/the timecodes, none of which should ever change it. Set it once when the line is first authored and never change it, even if you reorder, reword, retime, or reassign the speaker. Must be unique across the *entire* tab, not just within one scene — reusing a `line_id` on a different scene's row is rejected, not merged. **Never generate this from the sheet row number or from `line_order`** — if a line doesn't have one yet, leave the whole row out of this sync rather than inventing one. |
| `scene_id` | Matched against `Scenes.scene_id` for the row being synced. |
| `line_order` | Sort key within a scene. Whole number, starts at 1. Can change freely — reordering lines never changes their `line_id`. |
| `step` | Optional grouping number, purely for future display — not required. |
| `speaker` | Raw role name as it should render, e.g. `Dentist`, `Customer`. |
| `speaker_zh` | Chinese role label, e.g. `牙医`, `顾客`. Typed directly here — unlike the Figma_Data script, there is no hardcoded speaker-name lookup table to maintain in code. |
| `dialogue_en` / `dialogue_zh` | The line itself. |
| `start_time` / `end_time` | **Plain decimal seconds**, e.g. `2.023`. Never a time string like `00:02.023`. Both may be left blank if the timing isn't known yet — the line still syncs as dialogue text, just without subtitle/click-to-play timing until filled in. |

**Phase A-0 change:** a row with a blank or duplicate `line_id`, or a
missing required field (`line_order`/`speaker`/`speaker_zh`/
`dialogue_en`/`dialogue_zh`), now **stops the whole sync** with a clear
error naming the exact spreadsheet row — it is no longer silently
skipped. This is deliberate: a dialogue line's identity is exactly the
kind of thing that must never quietly disappear from what gets sent. Fix
the named row, then sync again.

A scene's `dialogue_lines[]` submission is *replace-the-complete-set*
semantics: whatever set of `line_id`s you submit for a scene becomes
that scene's complete dialogue, with any previously-synced line whose
`line_id` is missing from this submission removed — but a line's
internal identity is preserved across edits (the same `line_id` submitted
again, even with different `line_order`/text/timing, updates the
existing line in place rather than deleting and recreating it). Submitting
zero lines for a scene is only accepted while that scene's `status` is
`draft`; a `published` scene rejects an attempt to clear all of its
dialogue outright.

**Bubble granularity**: per an explicit decision during this migration,
a dialogue line that used to be one merged sentence (e.g. "Excuse me. Do
you have this in a small?") is now **two separate rows** here — bubbles
match subtitle cues 1:1, not merged. Keep authoring new scenes this way.

## Tab 3: `Key_Expressions` — one row per key expression

The structured replacement for the old `Tips` tab's `tip_type =
"key_expression"` rows. `Tips` has been deleted from this spreadsheet —
this is the only source for the scene detail page's "Key Expressions"
grid now.

| Column | Notes |
|---|---|
| `scene_id` | Matched against `Scenes.scene_id`. |
| `sort_order` | Determines display order within the scene. Blank → `0`. Must be unique per `scene_id` — two rows for the same scene with the same `sort_order` (blank counts as `0`) fail the sync. |
| `expression_en` / `expression_zh` | The expression itself. Required. This is the only content the card shows — see `KeyExpressionCard` in `src/app/pages/SceneDetailPage.tsx`. |

A row with a blank `scene_id` is a spacer and is skipped silently. A row
with a non-blank `scene_id` but a blank `expression_en`/`expression_zh`
**stops the whole sync** with the offending row number.

(Earlier versions of this tab also had `usage_en`/`usage_zh`/
`example_en`/`example_zh` columns. Those columns — and the matching
`key_expressions.usage_en`/`usage_zh`/`example_en`/`example_zh` database
columns — were dropped entirely; see
`supabase/migrations/0026_simplify_key_expressions_and_culture_tips.sql`.
Do not re-add them to this tab.)

## Tab 3b: `Culture_Tips` — one row per culture/local note

The structured replacement for the old `Tips` tab's `tip_type =
"culture_tip"` rows.

| Column | Notes |
|---|---|
| `scene_id` | Matched against `Scenes.scene_id`. |
| `sort_order` | Determines display order within the scene — also what the website's "Tip 1" / "Tip 2" card headers are generated from (`sort_order = 1` → "Tip 1", etc.; see `CultureTipCard` in `src/app/pages/SceneDetailPage.tsx`). Blank → `0`. Must be unique per `scene_id`, same rule as `Key_Expressions` above. |
| `body_en` / `body_zh` | Required. The only content the card shows. |

Same blank-row and missing-required-field rules as `Key_Expressions`
above: a blank `scene_id` is a silently-skipped spacer; a non-blank
`scene_id` with `body_en`/`body_zh` blank stops the whole sync, naming
the row.

(Earlier versions of this tab also had `title_en`/`title_zh` columns.
Those columns — and the matching `culture_tips.title_en`/`title_zh`
database columns — were dropped entirely; the website never displays a
stored title, only the generated "Tip N" label. See
`supabase/migrations/0026_simplify_key_expressions_and_culture_tips.sql`.
Do not re-add them to this tab.)

## Tab 4: `Validation` — Sheet-only, not read by this script

A self-check tab using Sheets formulas (`QUERY`/`COUNTIF`/conditional
formatting) against `Scenes` + `Dialogue_Lines`, meant to catch the
mistakes this migration ran into in practice before you sync:

- `start_time`/`end_time` that aren't plain numbers (text-formatted
  cells look identical but read as strings).
- `end_time <= start_time`, or overlapping with the next line's
  `start_time`.
- Duplicate or missing `line_order` within a scene.
- A `published` scene with no `video_url`.

This repo doesn't ship ready-made formulas for this tab yet — the exact
rules are a content-team decision, not something the sync script
enforces. Treat it as a visual checklist to scan before clicking sync,
not a blocker.

## Tab 5: `Sync_Log` — Sheet-only, append-only history

Columns: `timestamp`, `scene_id`, `slug`, `action`, `result`, `message`.
The script appends one row here per sync attempt (single or batch) —
unlike `Scenes.sync_status`/`sync_message`, which only ever show the
*latest* attempt, this keeps full history. Just needs the header row;
the script appends below it automatically.

## Using it

Same as the Figma_Data script: click a cell in one `Scenes` row and
**Yz English Sync → Sync Selected Row(s)** to sync just that scene,
or select multiple rows to batch-sync every one of them whose
`sync_status` is exactly `Ready` (others are silently skipped).

## How Key_Expressions/Culture_Tips sync (upsert + scoped delete)

Both tabs are read in full on every sync click (like `Dialogue_Lines`),
then filtered down to the rows for whichever `scene_id`(s) are actually
being synced. For each scene being synced whose tab has at least one row:

- Every row is **upserted** by `(scene_id, sort_order)` — editing a row
  in the sheet and re-syncing updates that same database row in place,
  it never creates a duplicate.
- The submission is **scoped-authoritative for that one scene**: any
  existing `public.key_expressions`/`public.culture_tips` row for that
  `scene_id` whose `sort_order` is *not* present in this sync's rows is
  deleted. Deleting a row from the sheet (say, dropping from 6 Key
  Expressions to 5) and re-syncing that scene removes the corresponding
  database row — nothing else. Rows belonging to *other* scenes are
  never touched by this, no matter how many scenes are batch-synced at
  once.
- A scene with **zero** rows in a tab is not sent for that tab at all —
  the payload key is omitted, and the Edge Function/RPC leave whatever
  is already in the database alone (same "omit means don't touch" rule
  the deleted `Tips` tab used to follow — see `buildPayload_`'s comment
  in `Code.gs`).
  **This means clearing every row for a scene down to zero is not
  something a sync can do** — only individual rows within an otherwise
  non-empty sync can be removed this way. That's a deliberate,
  defense-in-depth choice (mirrors `0021_protect_tips_from_empty_
  overwrite.sql`), not a limitation anyone hit in practice; see
  `0025_create_key_expressions_and_culture_tips.sql`'s header for the
  full reasoning.
- Two rows for the same scene sharing a `sort_order` (including two
  blank cells, which both read as `0`) fail the sync with a clear
  `duplicate_key_expression_sort_order`/`duplicate_culture_tip_sort_order`
  error before anything is written.

## What this script does NOT touch

This is the important part. Every sync from this script **omits**
`dialogue`, `expressions`, `vocabulary`, `subtitle_cues`, and `tips` from
the payload entirely — not even sending them as `null`. The `sync-scene`
Edge Function treats an omitted field as "leave this column exactly as
it is" (see the `ScenePayloadRow` comment in
`supabase/functions/sync-scene/validation.ts`), so:

- `scenes.expressions` and `scenes.vocabulary` stay whatever the
  Figma_Data pipeline last set them to. This script has no tab for
  them and cannot change them.
- `scenes.dialogue` and `scenes.subtitle_cues` (the old wide-format
  transcript and its separately-matched subtitle timing) are also left
  alone — superseded by `dialogue_lines`, not overwritten by it. The
  website already prefers `dialogue_lines` over these legacy columns
  whenever rows exist for a scene.
- `scenes.tips` is left alone too, now that the `Tips` tab is gone —
  whatever it held from an earlier sync or from Figma_Data just sits
  there unused. `src/data/scenes-access.ts` only ever reads it as a
  fallback for a scene that still has zero `key_expressions`/
  `culture_tips` rows; once a scene has real rows there (as
  `scene_001`/`scene_008`/`scene_013`/`scene_030` now do), `tips` is
  never consulted for it again regardless of what's in the column.

**Do not run the Figma_Data script's sync on a scene that has already
been migrated here** — it would overwrite `dialogue`/`expressions`/
`vocabulary`/`subtitle_cues`/`tips` with whatever is in Figma_Data for
that scene. Once a scene lives in this Sheet, manage it here only.

## Known limitations / open items

- `featured` and `is_new` are not settable from this Sheet (or from
  Figma_Data's script — neither pipeline has ever synced these; they're
  set directly in Supabase). Add columns + wire them into the Edge
  Function later if that's needed.
- `getting-a-dental-filling` was deliberately **not** migrated to this
  structure yet: its Figma_Data dialogue is missing 4 lines that are
  actually spoken in the video (confirmed by comparing against its
  existing `subtitle_cues`, which came from a real audio transcript).
  Write the complete, correct dialogue for this scene into
  `Dialogue_Lines` before migrating it — don't guess at who says the
  missing lines.
- `Validation` tab formulas aren't pre-built — see Tab 4 above.
- **Phase A-0 migration gap (mapping confirmed, migration still not
  run):** `shopping-for-clothes` already has 18 `dialogue_lines` rows in
  Supabase from before `line_id` existed, so none of them have an
  `external_line_id` yet. Their `line_000001`-`line_000018` mapping was
  reviewed and approved by a human in the Phase A-0 sign-off round
  (2026-08-08) and is now written into
  `supabase/migrations/0015_adopt_dialogue_line_external_ids.sql` — but
  that migration has not been executed against the database. Until it
  runs, the sync RPC still refuses outright to touch this scene's
  `dialogue_lines` at all — it raises `unmapped_legacy_dialogue_lines`,
  naming the scene and how many rows are still unmapped, rather than
  deleting the old rows and blindly inserting whatever the Sheet
  currently says. See `supabase/migrations/0019_sync_scene_rpc.sql`'s
  header for the full explanation. Of those 18, 13 carry forward into the
  approved final script unchanged in meaning and 5 (`line_000001`,
  `line_000005`, `line_000006`, `line_000011`, `line_000017`) were
  confirmed as retired — merged into a neighboring line or dropped in the
  final script — but 0015 still gives all 18 their permanent ID; removing
  the 5 retired rows happens later, as an ordinary consequence of the
  reviewed prune logic in `sync_scene_with_dialogue_lines` once the real
  Sheet sync submits a set that no longer includes them, never by editing
  0015 to add a DELETE. `getting-a-dental-filling` has zero existing
  `dialogue_lines` rows, so it does not have this specific blocker (it is
  still separately blocked by the missing-4-lines issue above).
- **`Scenes.scene_id` adoption for the 13 existing scenes: mapping
  confirmed, migration still not run.** There is no placeholder value of
  any kind on any existing scene — `external_scene_id` is still `NULL`
  on all 13. The full slug → `scene_id` mapping (database-id order,
  `scene_001`-`scene_013`) was reviewed and approved by a human in the
  Phase A-0 sign-off round (2026-08-08) and is now written into
  `supabase/migrations/0014_adopt_scene_external_ids.sql` — but that
  migration has not been executed against the database.
  `supabase/migrations/data/scene_external_id_mapping.template.sql`
  remains as a template for future scenes, not as the source the
  confirmed mapping was copied from being kept in sync. 0014 also refuses
  to ever change an `external_scene_id` that is already set to something
  different — once adopted, a scene's `scene_id` is permanent, and
  correcting a wrong one is a deliberate, separate, manually-reviewed
  operation, never a side effect of editing the mapping and rerunning the
  file.
