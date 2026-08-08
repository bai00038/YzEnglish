# Yz English — Scenes / Dialogue_Lines / Tips sync (Google Apps Script)

Syncs a **new, separate** Google Sheet to the same `sync-scene` Supabase
Edge Function used by the original Figma_Data pipeline
(`google-apps-script/Code.gs`, one level up) — but this script is
independent and bound to a different spreadsheet. It does not read or
write Figma_Data at all, and Figma_Data's own sync script is untouched.

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
2. Add five tabs, named exactly as below, each with a header row (row 1)
   containing exactly the column names listed — order doesn't matter,
   columns are read by header name.
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
| `scene_id` | Free-text label, e.g. `scene_001`. Logging only, never written to `scenes.id`. |
| `slug` | Must match an existing `scenes.slug` to update that scene, or be new to insert one. |
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

| Column | Notes |
|---|---|
| `scene_id` | Matched against `Scenes.scene_id` for the row being synced. |
| `line_order` | Sort key within a scene. Whole number, starts at 1. |
| `step` | Optional grouping number, purely for future display — not required. |
| `speaker` | Raw role name as it should render, e.g. `Dentist`, `Customer`. |
| `speaker_zh` | Chinese role label, e.g. `牙医`, `顾客`. Typed directly here — unlike the Figma_Data script, there is no hardcoded speaker-name lookup table to maintain in code. |
| `dialogue_en` / `dialogue_zh` | The line itself. |
| `start_time` / `end_time` | **Plain decimal seconds**, e.g. `2.023`. Never a time string like `00:02.023`. Both may be left blank if the timing isn't known yet — the line still syncs as dialogue text, just without subtitle/click-to-play timing until filled in. |

A row with a non-numeric or blank-inconsistent timecode, or missing
speaker/dialogue text, is **skipped** (not a sync-blocking error) — see
"Known limitations" below.

**Bubble granularity**: per an explicit decision during this migration,
a dialogue line that used to be one merged sentence (e.g. "Excuse me. Do
you have this in a small?") is now **two separate rows** here — bubbles
match subtitle cues 1:1, not merged. Keep authoring new scenes this way.

## Tab 3: `Tips` — one row per tip

| Column | Notes |
|---|---|
| `scene_id` | Matched against `Scenes.scene_id`. |
| `sort_order` | Determines Tip 1 / Tip 2 / Tip N order. Blank → `0`. |
| `title_en` / `title_zh` | |
| `body_en` / `body_zh` | |

A row missing any of the four text fields is skipped, not an error.

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

## What this script does NOT touch

This is the important part. Every sync from this script **omits**
`dialogue`, `expressions`, `vocabulary`, and `subtitle_cues` from the
payload entirely — not even sending them as `null`. The `sync-scene`
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

**Do not run the Figma_Data script's sync on a scene that has already
been migrated here** — it would overwrite `tips` (and everything else it
owns) with whatever is in Figma_Data for that scene, undoing this
script's changes. Once a scene lives in this Sheet, manage it here only.

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
