# Yz English — Figma_Data sync (Google Apps Script)

Manually-triggered sync from the `Figma_Data` Google Sheet to the
`sync-scene` Supabase Edge Function (`supabase/functions/sync-scene` in this
repo). Select one row for a single sync, or select several rows for a
batch sync — no auto-trigger (no `onEdit`, no time-based trigger), no admin
UI.

## Setup

1. Open the Google Sheet, go to **Extensions → Apps Script**.
2. Delete any starter boilerplate in the default file, paste in the full
   contents of `Code.gs` from this folder, and save.
3. Configure the two Script Properties (see below), then reload the sheet —
   a **"Yz English Sync"** menu appears next to Extensions.

## Script Properties

Set these under **Project Settings → Script Properties** in the Apps Script
editor (not in this repo, not in any sheet cell):

| Key | Value |
|---|---|
| `SYNC_FUNCTION_URL` | The deployed `sync-scene` Edge Function's HTTPS URL |
| `SYNC_SECRET` | The same shared secret configured as the Edge Function's `SYNC_SECRET` environment variable |

Do **not** fill in real values here in this README, in `Code.gs`, or in any
sheet cell — these two values only ever belong in Script Properties. Use
**Yz English Sync → Check Sync Configuration** to confirm both are set; it
only reports which keys are missing, it never displays the values.

## Using it

### Single row

1. Click any cell in the row of the scene you want to sync, on the
   `Figma_Data` sheet.
2. **Yz English Sync → Sync Selected Row(s)**.

Preconditions checked before anything is sent (all local, no network call
yet):

- The active sheet must be `Figma_Data`.
- Exactly one data row must be selected (not the header row).
- That row's `scene_id` must be non-blank after trimming.
- That row's `sync_status` must be **exactly** `Ready` (case-sensitive,
  exact string — not "ready", not "READY").
- Both Script Properties must be set.
- The row's content must assemble into a structurally valid payload (see
  "Local validation rules" below).

If any of these fail, you get an alert dialog and **nothing on the sheet is
touched** — `sync_status` is deliberately never overwritten (not even to
`Syncing`) until every precondition has passed. Only once the script is
genuinely about to call the Edge Function does it write `Syncing`, then
`Synced` or `Error` depending on the result.

### Multiple rows (batch)

1. Select several rows on `Figma_Data` — a dragged block, a Shift-click
   range, or several Cmd/Ctrl-click ranges all work.
2. **Yz English Sync → Sync Selected Row(s)**.

Batch mode is more permissive than the single-row flow, on purpose — a
broad selection routinely mixes already-synced rows in with new ones:

- Any selected row whose `sync_status` is not exactly `Ready` is **silently
  skipped** (not an error). Re-selecting a wide range is always safe.
- Every row that *is* `Ready` still goes through the same `scene_id` and
  payload validation as a single sync. A row that fails is written
  `sync_status = Error` with the reason in `sync_message`, and the batch
  **continues** with the remaining rows — one bad row never blocks the
  others.
- You get one summary alert at the end (counts of synced / skipped /
  failed, plus the failure list) instead of one alert per row.
- Both Script Properties must still be set, and the active sheet must
  still be `Figma_Data`, or nothing runs (same as single-row).

## Field mapping (v1)

| Edge Function field | Sheet source | Notes |
|---|---|---|
| `scene_id` | `scene_id` | Logging/response only — never written to `scenes.id` |
| `slug` | `slug` | |
| `title_en` | `title_en` | |
| `title_zh` | `title_zh` | |
| `category` | `category_en` | Matched server-side against `categories.name_en`, case-sensitive exact |
| `region` | `region` | |
| `level` | `level` | |
| `duration` | `duration` | |
| `description` | `mission_en` | Required by the database — blank `mission_en` will fail sync |
| `photo_url` | `cover_image` | Blank cell → `null` |
| `pdf_url` | `pdf_url` | Public Supabase Storage link to the scene's PDF. Blank cell → `null`. Read by header name, not a fixed column — the header can move without breaking the sync. |
| `video_url` | `video_url` | Public Supabase Storage link (`video_resources` bucket) to the scene's video. Blank cell → `null`. Read by header name, not a fixed column — the header can move without breaking the sync. |
| `subtitle_cues[]` | `Dialogue_Lines` tab, matched by `scene_id` | See "subtitle_cues (Dialogue_Lines tab)" below. `null` if this scene_id has no rows there yet. |
| `status` | `web_status` | Sent as-is, **case-sensitive** — the Edge Function only accepts literally `draft`/`published` |
| `sort_order` | `sort_order` | Blank → `0`; non-blank must be a whole number; always sent as a JSON number, never a string |
| `scene_setup_en` / `scene_setup_zh` | — | Always `""` (→ stored as `NULL`) |
| `learning_goal_en` / `learning_goal_zh` | — | Always `""` (→ stored as `NULL`) |
| `dialogue[]` | `stepN_speakerN` / `stepN_lineN_en` / `stepN_lineN_zh` | See below |
| `expressions[]` | `expressionN_en` / `expressionN_zh` | See below |
| `vocabulary[]` | — | Always `[]` |
| `tips[]` | `tip1_en/zh`, `tip2_en/zh` | See below |

Base scalar fields (`title_en`, `slug`, `region`, `level`, `duration`,
`description`, `category`) are passed through trimmed but **not** locally
required-checked — the Edge Function is the source of truth for that and
will reject a blank field with a specific field name. Duplicating that
check here would just risk the two sides drifting apart.

### dialogue

Walks all 17 slots in a fixed order, per `DIALOGUE_STEPS` in `Code.gs` —
Step 1 lines 1–3, Step 2 lines 1–4, Step 3 lines 1–4, Step 4 lines 1–6 —
every slot is checked, so the last line (Step 4 line 6) is never dropped.

- A slot where `speaker`/`en`/`zh` are **all** blank is skipped.
- A slot where only some of the three are filled is a data error (alert,
  nothing sent) — never silently skipped.
- `speaker` is sent to the Edge Function exactly as written in the sheet
  (e.g. `Teacher`, `Dentist`, `Parent A`) and stored as-is — the Edge
  Function no longer collapses it into a fixed `"You"`/`"Staff"` pair. The
  frontend renders whatever roles a scene's dialogue actually contains (see
  `src/data/speakerRoles.ts`), so any role name used here can appear on the
  page.
- `speakerZh` is generated locally from `SPEAKER_ZH_MAP` in `Code.gs`. An
  unrecognized speaker aborts with a clear error naming the raw text — it is
  never guessed.

If a new speaker is added here, also add it to `SPEAKER_ZH_FALLBACK` in
`src/data/speakerRoles.ts` — the frontend's EN → ZH fallback used only when
a dialogue line is somehow synced without a `speakerZh`.

### subtitle_cues (`Dialogue_Lines` tab)

Unlike every other field, this one isn't read from `Figma_Data` at all —
it comes from a separate tab in the **same spreadsheet** called
`Dialogue_Lines`. That tab is a long-format table: **one row per subtitle
cue** (not one row per scene), typically far more granular than the
17-slot `step1`..`step4` dialogue template (a single Figma_Data dialogue
line routinely gets split into several shorter timed cues there).

Expected `Dialogue_Lines` columns (read by header name, any column order):

| Column | Meaning |
|---|---|
| `scene_id` | Matched against `Figma_Data`'s `scene_id` for the row being synced |
| `line_order` | Sort key within a scene — cues are sent in ascending `line_order`, not sheet row order |
| `dialogue_en` | Cue text, English |
| `dialogue_zh` | Cue text, Chinese |
| `start_time` | Cue start, in seconds from video start — a plain decimal number, e.g. `2.023`. **Not** a time string — never enter this as `00:02.023` or similar. |
| `end_time` | Cue end, in seconds from video start. Same format as `start_time`. |

`start_time`/`end_time` are read with `Number(...)`, not `parseInt(...)`
(`parseInt` truncates `"2.023"` down to `2` and silently drops the
fractional seconds) — so it doesn't matter whether the cell is a
Sheets-native number or a text-formatted cell that merely *looks* like
one; both convert the same way. Full millisecond precision (three decimal
places) round-trips all the way through to Supabase and the frontend
unchanged — `subtitle_cues` is stored as `jsonb`, which keeps decimal
numbers exactly as given.

The whole `Dialogue_Lines` tab is read **once per sync click** (not once
per selected row) and indexed by `scene_id` in memory — see
`loadSubtitleCuesBySceneId_` in `Code.gs` — so a batch sync of many rows
doesn't re-read this sheet repeatedly.

Rules:

- A row with a blank `scene_id` is skipped silently (treated as a
  trailing/blank row).
- A row with a non-numeric `start_time`/`end_time` (after the `Number()`
  conversion above), `end_time <= start_time`, or a blank
  `dialogue_en`/`dialogue_zh` is **skipped, not a hard error** — that one
  row is simply left out of `subtitle_cues` for its scene. One bad timing
  row must never block the whole sync (video, dialogue, expressions,
  etc.) for that scene, let alone anyone else's row in a batch sync.
- A `scene_id` with zero matching (valid) `Dialogue_Lines` rows syncs
  `subtitle_cues: null` — not an error. Most scenes simply don't have a
  timed transcript yet.
- The frontend does **not** use a hosted subtitle file or a `<track>`
  element at all — it reads `subtitle_cues` directly and renders whichever
  cue's `[start, end)` window contains the video's current playback time
  (see `activeSubtitleCue`/`activeDialogueLineIndex` in
  `SceneDetailPage.tsx`), which also drives Dialogue-section highlighting,
  auto-scroll, and per-line click-to-play.

### expressions

`expression1`–`expression8`, in order. `label` is set equal to `en` (there
is no separate label column in the sheet — this duplication is an
intentional, previously-approved decision). `note` is always `""` for the
same reason. Both en/zh blank → skip; only one filled → data error.

### tips

`tip1`, `tip2`. `title`/`titleZh` are fixed literals (`"Tip 1"`/`"提示 1"`,
`"Tip 2"`/`"提示 2"`) since the sheet has no title column. Both en/zh
blank → skip; only one filled → data error.

## Fields not synced in v1

These sheet columns are read by nothing in `Code.gs` and never reach the
Edge Function:

- `scene_number` (the sync flow uses `scene_id` instead)
- `mission_zh` — has no destination field in `public.scenes` today; if this
  is needed later, a schema/frontend decision is required first
- `category_zh`, `tags`
- `hear1_en/zh` … `hear5_en/zh`
- `learn1_zh` … `learn5_zh`
- `step1_title_en/zh` … `step4_title_en/zh` — the current dialogue schema
  and `SceneDetailPage.tsx` have no concept of per-step titles

Do not describe any of these as "synced" in future documentation or UI
copy — they are out of scope for v1, not silently handled.

## Security notes

- `SYNC_FUNCTION_URL` and `SYNC_SECRET` live only in Script Properties.
  Never hardcode them in `Code.gs`, never put them in a sheet cell.
- `SYNC_SECRET` is only ever read into `config.secret` and used to build the
  `Authorization` header for the single `UrlFetchApp.fetch` call in
  `callSyncFunction_`. It is not logged, not shown in any alert, and not
  written to `sync_message` or any other cell.
- Network/parsing failures return a fixed, generic message rather than the
  raw exception or response body, specifically so nothing from the request
  (including the Authorization header) can end up on the sheet.
- `sync_message` is truncated to 500 characters so a server error page or
  stack trace can't flood a cell.

## Known open items before real testing

Carried over from the pre-implementation review — not something this script
can resolve on its own:

- Confirm `web_status` cell values are literally lowercase `draft` /
  `published` (the check is case-sensitive).
- Confirm `category_en` values match `categories.name_en` in Supabase
  exactly (case, whitespace).
- Confirm `cover_image`, when filled, holds a directly usable image URL.
- Confirm `pdf_url`, when filled, holds a public (not signed/expiring) Supabase
  Storage URL that opens directly in a browser tab.
- Confirm `video_url`, when filled, holds a public (not signed/expiring) Supabase
  Storage URL (in the `video_resources` bucket) that opens/plays directly in a
  browser tab. See "Known open items" in the main task about MOV vs MP4/H.264
  browser compatibility.
- This sheet template caps dialogue at 17 lines total (3+4+4+6, see
  `DIALOGUE_STEPS` in `Code.gs`). A scene needing an 18th line cannot be
  represented without extending the template further.
- The `Dialogue_Lines` tab must exist in the same spreadsheet with exactly
  that name, or every sync (single or batch) fails immediately — see
  "subtitle_cues (Dialogue_Lines tab)" above.
