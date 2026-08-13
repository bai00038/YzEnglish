import { SyncError } from "./errors.ts";

// Kept in sync with the scenes.status check constraint — see
// supabase/migrations/0022_add_scene_status_workflow_states.sql.
// "ready_to_review" and "hidden" are CMS review-workflow states; only
// "published" is ever visible to public site visitors (enforced by RLS,
// see 0004_rls_policies.sql).
const ALLOWED_STATUS = ["draft", "ready_to_review", "hidden", "published"] as const;
type AllowedStatus = (typeof ALLOWED_STATUS)[number];

export interface DialogueRow {
  // Raw role name exactly as written on the sheet (e.g. "Teacher",
  // "Dentist", "Parent A") — stored and rendered as-is, never collapsed
  // into a fixed You/Staff enum. The frontend (src/data/speakerRoles.ts)
  // derives its legend and per-line labels straight from this field.
  speaker: string;
  speakerZh: string;
  en: string;
  zh: string;
}

export interface ExpressionRow {
  label: string;
  en: string;
  zh: string;
  note: string;
}

export interface VocabularyRow {
  word: string;
  phonetic: string;
  pos: string;
  zh: string;
  example: string;
}

// tip_type splits the scene detail page's Language module into two
// sections (see src/app/pages/SceneDetailPage.tsx) — "key_expression" for
// the Key Expressions grid, "culture_tip" for Culture & Local Tips. Any
// other pipeline sending tips (e.g. the legacy Figma_Data script, whose
// buildTips_ has no concept of tip_type at all) omits this field, which
// requireTipType below defaults to "key_expression" rather than rejecting
// — see that function's comment.
const TIP_TYPES = ["key_expression", "culture_tip"] as const;
type TipType = (typeof TIP_TYPES)[number];

export interface TipRow {
  type: string;
  tipType: TipType;
  title: string;
  titleZh: string;
  body: string;
  bodyZh: string;
}

// One WebVTT-ready subtitle line, timed against the scene video (seconds
// from video start). Sourced from the Google Sheet's "Dialogue_Lines" tab,
// independent of dialogue[] (which has no per-line timing).
export interface SubtitleCueRow {
  start: number;
  end: number;
  en: string;
  zh: string;
}

// One row for the key_expressions table (see
// supabase/migrations/0025_create_key_expressions_and_culture_tips.sql,
// simplified down to just these four fields by
// 0026_simplify_key_expressions_and_culture_tips.sql once usage_en/usage_zh/
// example_en/example_zh proved unused — the Google Sheet's Key_Expressions
// tab has no columns for them either). Upserted by (scene_id, sort_order),
// not a permanent external id like dialogue_lines — see 0025's header for
// why no cross-scene identity is needed here.
export interface KeyExpressionRowPayload {
  sort_order: number;
  expression_en: string;
  expression_zh: string;
}

// One row for the culture_tips table — simplified the same way as
// KeyExpressionRowPayload above (0026 dropped title_en/title_zh; the
// frontend's card header is always a generated "Tip N" from sort_order,
// see src/app/pages/SceneDetailPage.tsx, never a stored title).
export interface CultureTipRowPayload {
  sort_order: number;
  body_en: string;
  body_zh: string;
}

// One row for the dialogue_lines table (see
// supabase/migrations/0012_add_dialogue_lines.sql and
// 0019_sync_scene_rpc.sql) — a scene migrated to this structure has
// one row per spoken line, doing the job of both a dialogue[] entry and a
// subtitle_cues[] entry at once. Independent of both legacy fields: a
// scene can have this, the legacy pair, or (during migration) both, with
// the frontend preferring this when present (see applyDialogueLinesOverride
// in src/data/scenes-access.ts).
//
// external_line_id (wire field: "line_id") is this line's permanent
// identity — see the Phase A-0 header comment in
// 0019_sync_scene_rpc.sql for the full reasoning. It is REQUIRED on
// every row, never derived from line_order/speaker/text/timecode, and
// never silently invented here.
export interface DialogueLineRowPayload {
  external_line_id: string;
  line_order: number;
  step: number | null;
  speaker: string;
  speaker_zh: string;
  dialogue_en: string;
  dialogue_zh: string;
  start_time: number | null;
  end_time: number | null;
}

// Fields ready to write to public.scenes, minus category_id (resolved
// separately in db.ts), external_scene_id (a top-level field on
// ValidatedScenePayload, not on the row — see below), and the DB-managed
// id/created_at/updated_at.
//
// dialogue/expressions/vocabulary/subtitle_cues/tips are all OPTIONAL
// KEYS, not just nullable values — an omitted key leaves that column
// completely untouched in the database (see p_optional_fields in
// db.ts/0019_sync_scene_rpc.sql), while an explicit `null` (or `[]`,
// for the array fields) still clears it. This is what lets the new
// dialogue_lines-based sync pipeline (see google-apps-script/scenes-sync/)
// update only the fields its Sheet actually owns (Scenes tab scalars,
// tips) without wiping out dialogue/expressions/vocabulary/subtitle_cues,
// which stay governed by the original Figma_Data pipeline until (if ever)
// they get their own migration. The Figma_Data pipeline is unaffected:
// Code.gs always sends all five of these keys explicitly, so its
// behavior is unchanged.
//
// EXCEPTION: tips does NOT follow "`[]` clears it" — see the guard around
// validateTips(...) below and the matching one in
// sync_scene_with_dialogue_lines. An empty tips[] is treated exactly like
// an omitted key (leave the column alone), not a clear. This was found to
// silently wipe real content (scene_001 lost its 2 tips this way) because
// google-apps-script/scenes-sync/Code.gs used to send `tips: []`
// whenever the Tips sheet had no rows yet for a scene_id — see that
// file's buildPayload_ for the corresponding fix on the sending side.
// dialogue/expressions/vocabulary/subtitle_cues do NOT have this
// protection yet; they are a known, separate, not-yet-fixed risk (see the
// Phase A-0 follow-up audit).
export interface ScenePayloadRow {
  slug: string;
  title_en: string;
  title_zh: string;
  region: string;
  level: string;
  duration: string;
  description: string;
  photo_url: string | null;
  pdf_url: string | null;
  video_url: string | null;
  status: AllowedStatus;
  sort_order: number;
  scene_setup_en: string | null;
  scene_setup_zh: string | null;
  learning_goal_en: string | null;
  learning_goal_zh: string | null;
  subtitle_cues?: SubtitleCueRow[] | null;
  dialogue?: DialogueRow[];
  expressions?: ExpressionRow[];
  vocabulary?: VocabularyRow[];
  tips?: TipRow[];
}

export interface ValidatedScenePayload {
  // The permanent sync identity for this scene — REQUIRED, and the sole
  // field the Edge Function matches an existing scene against (see
  // findSceneIdByExternalId in db.ts). Wire field is still named
  // "scene_id" (both Apps Script scripts already send it as a required,
  // non-empty field before a sync can even start), but it is no longer
  // treated as a cosmetic log-only label — it maps straight to
  // scenes.external_scene_id. slug is still required and still unique,
  // but is no longer the match key; see requireExternalSceneId below.
  externalSceneId: string;
  categoryName: string;
  row: ScenePayloadRow;
  // undefined means "this sync doesn't manage dialogue_lines for this
  // scene at all" (the Figma_Data pipeline, which never sends this key) —
  // leave whatever is already in the database alone. An array — including
  // an empty one — means "this is the complete, authoritative set of
  // dialogue lines for this scene right now"; an empty array is a
  // deliberate "clear all lines" request, gated by scene status inside
  // the sync RPC (see 0019_sync_scene_rpc.sql).
  dialogueLines: DialogueLineRowPayload[] | undefined;
  // undefined means "leave public.key_expressions/culture_tips for this
  // scene untouched" — same as tips above (see validateKeyExpressions/
  // validateCultureTips below), NOT the same "empty array clears it"
  // semantics as dialogueLines: an empty key_expressions[]/culture_tips[]
  // is treated exactly like the key being omitted, never a clear. See
  // 0025_create_key_expressions_and_culture_tips.sql's header for why.
  keyExpressions: KeyExpressionRowPayload[] | undefined;
  cultureTips: CultureTipRowPayload[] | undefined;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SyncError(400, `Field "${field}" is required and must be a non-empty string.`);
  }
  return value.trim();
}

// Field must be present and be a string, but "" is a legitimate value —
// used for expressions[].note, which the sheet has no dedicated source for
// (Apps Script submits "" rather than omitting the key or inventing text).
function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new SyncError(400, `Field "${field}" is required and must be a string (empty string is allowed).`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new SyncError(400, `Field "${field}" must be a string or null.`);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requireStatus(value: unknown): AllowedStatus {
  const status = requireNonEmptyString(value, "status");
  if (!(ALLOWED_STATUS as readonly string[]).includes(status)) {
    throw new SyncError(400, `Field "status" must be one of: ${ALLOWED_STATUS.join(", ")}. Got "${status}".`);
  }
  return status as AllowedStatus;
}

function requireSortOrder(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new SyncError(400, `Field "sort_order" must be an integer.`);
  }
  return value;
}

// scenes.external_scene_id's wire counterpart. Both Apps Script scripts
// (google-apps-script/Code.gs and scenes-sync/Code.gs) already require a
// non-empty scene_id cell before a sync can start (requireSceneId_ in
// each), so this was always effectively required at the point of sending
// — this just makes the Edge Function enforce the same thing rather than
// silently accepting a missing one and falling back to slug-based
// matching (the old, now-removed behavior; see db.ts).
function requireExternalSceneId(value: unknown): string {
  return requireNonEmptyString(value, "scene_id");
}

// Only called once the caller has already decided the field IS present
// (see the `!== undefined` checks in validateScenePayload) — this just
// enforces that, once present, it's actually an array (use [] to clear).
function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SyncError(400, `Field "${field}" must be an array (use [] to clear it).`);
  }
  return value;
}

function requireObjectItem(item: unknown, field: string, index: number): Record<string, unknown> {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new SyncError(400, `Field "${field}[${index}]" must be an object.`);
  }
  return item as Record<string, unknown>;
}

function validateDialogue(value: unknown): DialogueRow[] {
  return requireArray(value, "dialogue").map((raw, i) => {
    const item = requireObjectItem(raw, "dialogue", i);
    const en = requireNonEmptyString(item.en, `dialogue[${i}].en`);
    const zh = requireNonEmptyString(item.zh, `dialogue[${i}].zh`);
    const speakerZh = requireNonEmptyString(item.speakerZh, `dialogue[${i}].speakerZh`);
    const speaker = requireNonEmptyString(item.speaker, `dialogue[${i}].speaker`);

    return { speaker, speakerZh, en, zh };
  });
}

function validateExpressions(value: unknown): ExpressionRow[] {
  return requireArray(value, "expressions").map((raw, i) => {
    const item = requireObjectItem(raw, "expressions", i);
    return {
      label: requireNonEmptyString(item.label, `expressions[${i}].label`),
      en: requireNonEmptyString(item.en, `expressions[${i}].en`),
      zh: requireNonEmptyString(item.zh, `expressions[${i}].zh`),
      // The sheet only has expressionN_en/expressionN_zh — there is no
      // dedicated note column, so Apps Script submits note: "" rather than
      // fabricating content. Presence + type are still enforced; emptiness
      // is not an error.
      note: requireString(item.note, `expressions[${i}].note`),
    };
  });
}

function validateVocabulary(value: unknown): VocabularyRow[] {
  return requireArray(value, "vocabulary").map((raw, i) => {
    const item = requireObjectItem(raw, "vocabulary", i);
    return {
      word: requireNonEmptyString(item.word, `vocabulary[${i}].word`),
      // Matches existing data: e.g. "store credit" ships with phonetic: ""
      // in supabase/seed.sql, so this stays optional unlike the other fields.
      phonetic: optionalString(item.phonetic, `vocabulary[${i}].phonetic`) ?? "",
      pos: requireNonEmptyString(item.pos, `vocabulary[${i}].pos`),
      zh: requireNonEmptyString(item.zh, `vocabulary[${i}].zh`),
      example: requireNonEmptyString(item.example, `vocabulary[${i}].example`),
    };
  });
}

// Number(), not parseInt — parseInt("2.023") truncates to 2 and drops the
// fractional seconds. Accepts either an already-numeric JSON value or a
// numeric string (Apps Script always sends a number, but this stays
// tolerant of any other client sending "2.023" as a string). Anything
// that doesn't convert to a finite number -> null, not a thrown error.
function normalizeTimecode(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Omitted key (undefined) -> undefined, meaning "leave scenes.subtitle_cues
// completely untouched" (the caller doesn't manage this field at all —
// see ScenePayloadRow's field-level comment for why that distinction
// matters). Explicit null, or an empty/all-invalid array -> null,
// meaning "clear it" — that's what the Figma_Data pipeline sends for a
// scene with no matching Dialogue_Lines rows.
//
// Individual malformed cues (bad timecode, end <= start, blank en/zh) are
// dropped rather than failing the whole sync — one bad row in
// Dialogue_Lines for one scene must never block that scene's video_url/
// dialogue/etc. from syncing. A structurally wrong payload (not an array,
// not an array of objects) still throws, since that indicates the caller
// itself is broken, not a specific bad data row.
//
// This permissive-drop behavior is deliberately NOT shared with
// validateDialogueLines below — subtitle_cues has no permanent-identity
// requirement to enforce, so a malformed cue can still be safely and
// silently skipped the way it always has been.
function validateSubtitleCues(value: unknown): SubtitleCueRow[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) {
    throw new SyncError(400, `Field "subtitle_cues" must be an array or null.`);
  }

  const cues: SubtitleCueRow[] = [];
  value.forEach((raw, i) => {
    const item = requireObjectItem(raw, "subtitle_cues", i);
    const start = normalizeTimecode(item.start);
    const end = normalizeTimecode(item.end);
    const en = typeof item.en === "string" ? item.en.trim() : "";
    const zh = typeof item.zh === "string" ? item.zh.trim() : "";
    const hasValidTimecode = start !== null && end !== null && start >= 0 && end > start;
    if (!hasValidTimecode || en.length === 0 || zh.length === 0) return;
    cues.push({ start, end, en, zh });
  });

  return cues.length > 0 ? cues : null;
}

// Phase A-0 change from the previous behavior: a malformed dialogue_lines[]
// row — most importantly one missing external_line_id ("line_id" on the
// wire) — now THROWS instead of being silently dropped. The whole request
// is rejected before any database write happens, which combined with
// every write living inside one transaction (see
// sync_scene_with_dialogue_lines in 0019_sync_scene_rpc.sql) means a
// bad row can never partially apply. This is a deliberate tightening: the
// old validateSubtitleCues-style "drop bad rows, keep going" pattern was
// appropriate when a cue was just display data with no identity to
// protect; it is not appropriate for external_line_id, which is a
// permanent identity contract that must never be silently skipped,
// invented, or guessed (see the Phase A-0 requirements — "禁止根据行号、
// 对白文字或line_order临时生成line_id" / "禁止静默跳过缺少ID的对白").
//
// undefined (key omitted from the payload entirely) still means "this
// scene isn't managed by this pipeline, leave dialogue_lines alone" — the
// same semantics as before, just now returning undefined instead of null
// so ValidatedScenePayload.dialogueLines can distinguish "don't touch"
// from "replace with this (possibly empty) set" without conflating them.
// A payload that explicitly sends `dialogue_lines: null` is treated the
// same as omitting the key — no current caller does this, but it avoids
// an ambiguous three-way read on the wire.
function validateDialogueLines(value: unknown): DialogueLineRowPayload[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new SyncError(400, `Field "dialogue_lines" must be an array.`);
  }

  const lines: DialogueLineRowPayload[] = [];
  const seenExternalLineIds = new Set<string>();

  value.forEach((raw, i) => {
    const item = requireObjectItem(raw, "dialogue_lines", i);

    const externalLineId = requireNonEmptyString(item.line_id, `dialogue_lines[${i}].line_id`);
    if (seenExternalLineIds.has(externalLineId)) {
      throw new SyncError(
        400,
        `Field "dialogue_lines" contains a duplicate line_id "${externalLineId}" (first seen earlier in the same request, also at index ${i}).`
      );
    }
    seenExternalLineIds.add(externalLineId);

    const lineOrder = Number(item.line_order);
    if (!Number.isFinite(lineOrder) || !Number.isInteger(lineOrder) || lineOrder <= 0) {
      throw new SyncError(400, `Field "dialogue_lines[${i}].line_order" must be a positive integer. Got: ${JSON.stringify(item.line_order)}.`);
    }

    const speaker = requireNonEmptyString(item.speaker, `dialogue_lines[${i}].speaker`);
    const speakerZh = requireNonEmptyString(item.speaker_zh, `dialogue_lines[${i}].speaker_zh`);
    const dialogueEn = requireNonEmptyString(item.dialogue_en, `dialogue_lines[${i}].dialogue_en`);
    const dialogueZh = requireNonEmptyString(item.dialogue_zh, `dialogue_lines[${i}].dialogue_zh`);

    const start = normalizeTimecode(item.start_time);
    const end = normalizeTimecode(item.end_time);
    if ((item.start_time !== undefined && item.start_time !== null && item.start_time !== "" && start === null)) {
      throw new SyncError(400, `Field "dialogue_lines[${i}].start_time" is not a valid number: ${JSON.stringify(item.start_time)}.`);
    }
    if ((item.end_time !== undefined && item.end_time !== null && item.end_time !== "" && end === null)) {
      throw new SyncError(400, `Field "dialogue_lines[${i}].end_time" is not a valid number: ${JSON.stringify(item.end_time)}.`);
    }
    if (start !== null && start < 0) {
      throw new SyncError(400, `Field "dialogue_lines[${i}].start_time" must be >= 0. Got: ${start}.`);
    }
    if (start !== null && end !== null && end <= start) {
      throw new SyncError(400, `Field "dialogue_lines[${i}].end_time" (${end}) must be greater than start_time (${start}).`);
    }

    const step = item.step === null || item.step === undefined || item.step === "" ? null : Number(item.step);
    if (item.step !== null && item.step !== undefined && item.step !== "" && !Number.isFinite(step)) {
      throw new SyncError(400, `Field "dialogue_lines[${i}].step" is not a valid number: ${JSON.stringify(item.step)}.`);
    }

    lines.push({
      external_line_id: externalLineId,
      line_order: lineOrder,
      step: Number.isFinite(step) ? step : null,
      speaker,
      speaker_zh: speakerZh,
      dialogue_en: dialogueEn,
      dialogue_zh: dialogueZh,
      start_time: start,
      end_time: end,
    });
  });

  return lines;
}

// Missing/blank tipType -> "key_expression" (compat default for old rows
// and pipelines that predate tip_type — see this file's TIP_TYPES comment
// and the matching default in google-apps-script/scenes-sync/Code.gs's
// loadTipsBySceneId_). A tipType that IS present but isn't one of
// TIP_TYPES is a real data error (most likely a typo), so that still
// throws rather than silently defaulting.
function requireTipType(value: unknown, field: string): TipType {
  if (value === undefined || value === null) return "key_expression";
  if (typeof value !== "string") {
    throw new SyncError(400, `Field "${field}" must be a string. Got: ${JSON.stringify(value)}.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return "key_expression";
  if (!(TIP_TYPES as readonly string[]).includes(trimmed)) {
    throw new SyncError(400, `Field "${field}" must be one of: ${TIP_TYPES.join(", ")} (or omitted). Got "${trimmed}".`);
  }
  return trimmed as TipType;
}

function validateTips(value: unknown): TipRow[] {
  return requireArray(value, "tips").map((raw, i) => {
    const item = requireObjectItem(raw, "tips", i);
    return {
      type: requireNonEmptyString(item.type, `tips[${i}].type`),
      tipType: requireTipType(item.tipType, `tips[${i}].tipType`),
      title: requireNonEmptyString(item.title, `tips[${i}].title`),
      titleZh: requireNonEmptyString(item.titleZh, `tips[${i}].titleZh`),
      body: requireNonEmptyString(item.body, `tips[${i}].body`),
      bodyZh: requireNonEmptyString(item.bodyZh, `tips[${i}].bodyZh`),
    };
  });
}

function requireSortOrderField(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new SyncError(400, `Field "${field}" is required and must be an integer.`);
  }
  return value;
}

// Both throw duplicate_sort_order-style errors up front (matching the
// duplicate_line_id check on dialogue_lines) — the same check also exists
// inside sync_scene_with_dialogue_lines as defense-in-depth for any future
// caller that bypasses this Edge Function, see that migration's header.
function requireNoDuplicateSortOrder(items: Array<{ sort_order: number }>, field: string, externalSceneIdHint: string): void {
  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item.sort_order)) {
      throw new SyncError(
        400,
        `Field "${field}" contains a duplicate sort_order ${item.sort_order} for scene_id "${externalSceneIdHint}" — every row must have a unique sort_order within the same scene.`
      );
    }
    seen.add(item.sort_order);
  }
}

function validateKeyExpressions(value: unknown, externalSceneIdHint: string): KeyExpressionRowPayload[] {
  const items = requireArray(value, "key_expressions").map((raw, i) => {
    const item = requireObjectItem(raw, "key_expressions", i);
    return {
      sort_order: requireSortOrderField(item.sort_order, `key_expressions[${i}].sort_order`),
      expression_en: requireNonEmptyString(item.expression_en, `key_expressions[${i}].expression_en`),
      expression_zh: requireNonEmptyString(item.expression_zh, `key_expressions[${i}].expression_zh`),
    };
  });
  requireNoDuplicateSortOrder(items, "key_expressions", externalSceneIdHint);
  return items;
}

function validateCultureTips(value: unknown, externalSceneIdHint: string): CultureTipRowPayload[] {
  const items = requireArray(value, "culture_tips").map((raw, i) => {
    const item = requireObjectItem(raw, "culture_tips", i);
    return {
      sort_order: requireSortOrderField(item.sort_order, `culture_tips[${i}].sort_order`),
      body_en: requireNonEmptyString(item.body_en, `culture_tips[${i}].body_en`),
      body_zh: requireNonEmptyString(item.body_zh, `culture_tips[${i}].body_zh`),
    };
  });
  requireNoDuplicateSortOrder(items, "culture_tips", externalSceneIdHint);
  return items;
}

export function validateScenePayload(body: unknown): ValidatedScenePayload {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new SyncError(400, "Request body must be a JSON object.");
  }
  const payload = body as Record<string, unknown>;

  const externalSceneId = requireExternalSceneId(payload.scene_id);

  const row: ScenePayloadRow = {
    slug: requireNonEmptyString(payload.slug, "slug"),
    title_en: requireNonEmptyString(payload.title_en, "title_en"),
    title_zh: requireNonEmptyString(payload.title_zh, "title_zh"),
    region: requireNonEmptyString(payload.region, "region"),
    level: requireNonEmptyString(payload.level, "level"),
    // duration/description are content fields a freshly-populated Sheet
    // row may not have filled in yet (e.g. a template scene mid-setup).
    // Unlike slug/title/region/level (core identity, always required), a
    // blank cell here means "no update from this sync" rather than "this
    // scene has no duration/description" — see resolveWithExistingFallback
    // in db.ts, which substitutes the scene's current DB value for either
    // field when the submitted string is blank, and only errors (still a
    // clear 400) when there is no existing scene row to fall back to
    // (first-time insert with a blank cell). requireString (not
    // requireNonEmptyString) so an empty string reaches that fallback
    // instead of being rejected here.
    duration: requireString(payload.duration, "duration"),
    description: requireString(payload.description, "description"),
    photo_url: optionalString(payload.photo_url, "photo_url"),
    pdf_url: optionalString(payload.pdf_url, "pdf_url"),
    video_url: optionalString(payload.video_url, "video_url"),
    status: requireStatus(payload.status),
    sort_order: requireSortOrder(payload.sort_order),
    scene_setup_en: optionalString(payload.scene_setup_en, "scene_setup_en"),
    scene_setup_zh: optionalString(payload.scene_setup_zh, "scene_setup_zh"),
    learning_goal_en: optionalString(payload.learning_goal_en, "learning_goal_en"),
    learning_goal_zh: optionalString(payload.learning_goal_zh, "learning_goal_zh"),
  };

  // Each of these five is independently optional — an omitted key means
  // "this sync doesn't manage this field, leave whatever is already in
  // the database alone" (see ScenePayloadRow's comment for why the key
  // must be genuinely absent, not just undefined-valued). The Figma_Data
  // pipeline (Code.gs) always sends all five explicitly, so its behavior
  // is unchanged: every field it sends still fully replaces the column.
  const subtitleCues = validateSubtitleCues(payload.subtitle_cues);
  if (subtitleCues !== undefined) row.subtitle_cues = subtitleCues;

  if (payload.dialogue !== undefined) row.dialogue = validateDialogue(payload.dialogue);
  if (payload.expressions !== undefined) row.expressions = validateExpressions(payload.expressions);
  if (payload.vocabulary !== undefined) row.vocabulary = validateVocabulary(payload.vocabulary);
  // Defense-in-depth (not yet extended to dialogue/expressions/vocabulary
  // above — see the risk note in this file's git history/PR description
  // for why those are a separate, unfixed concern): tips[] does not yet
  // support "clear via empty array". A caller sending `tips: []` most
  // likely means "no tips data available right now" (e.g. the source
  // Sheet's Tips tab has no rows yet for this scene_id), not "delete this
  // scene's existing tips" — that ambiguity is exactly what wiped
  // scene_001's 2 real tips down to [] on its first scenes-sync run. So
  // an empty array here is treated the same as the key being omitted
  // entirely: only a genuinely non-empty tips[] replaces the column. See
  // the matching guard in sync_scene_with_dialogue_lines (0019/0022) for
  // the second layer of this same protection.
  if (payload.tips !== undefined) {
    const validatedTips = validateTips(payload.tips);
    if (validatedTips.length > 0) row.tips = validatedTips;
  }

  // key_expressions/culture_tips are top-level (like dialogue_lines), not
  // scenes-table columns — see KeyExpressionRowPayload/CultureTipRowPayload
  // above. Same "empty array means don't touch" guard as tips just above,
  // for the same reason (see 0025_create_key_expressions_and_culture_tips.sql).
  let keyExpressions: KeyExpressionRowPayload[] | undefined;
  if (payload.key_expressions !== undefined) {
    const validated = validateKeyExpressions(payload.key_expressions, externalSceneId);
    if (validated.length > 0) keyExpressions = validated;
  }

  let cultureTips: CultureTipRowPayload[] | undefined;
  if (payload.culture_tips !== undefined) {
    const validated = validateCultureTips(payload.culture_tips, externalSceneId);
    if (validated.length > 0) cultureTips = validated;
  }

  return {
    externalSceneId,
    categoryName: requireNonEmptyString(payload.category, "category"),
    dialogueLines: validateDialogueLines(payload.dialogue_lines),
    keyExpressions,
    cultureTips,
    row,
  };
}
