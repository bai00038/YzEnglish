import { SyncError } from "./errors.ts";

const ALLOWED_STATUS = ["draft", "published"] as const;
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

export interface TipRow {
  type: string;
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

// One row for the dialogue_lines table (see
// supabase/migrations/0012_add_dialogue_lines.sql) — a scene migrated to
// this structure has one row per spoken line, doing the job of both a
// dialogue[] entry and a subtitle_cues[] entry at once. Independent of
// both legacy fields: a scene can have this, the legacy pair, or (during
// migration) both, with the frontend preferring this when present (see
// applyDialogueLinesOverride in src/data/scenes-access.ts).
export interface DialogueLineRowPayload {
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
// separately in db.ts) and the DB-managed id/created_at/updated_at.
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
  subtitle_cues: SubtitleCueRow[] | null;
  status: AllowedStatus;
  sort_order: number;
  scene_setup_en: string | null;
  scene_setup_zh: string | null;
  learning_goal_en: string | null;
  learning_goal_zh: string | null;
  dialogue: DialogueRow[];
  expressions: ExpressionRow[];
  vocabulary: VocabularyRow[];
  tips: TipRow[];
}

export interface ValidatedScenePayload {
  // scene_id is never matched against or written to scenes.id — it only
  // travels through for logging and the response body.
  sceneIdLabel: string | null;
  categoryName: string;
  row: ScenePayloadRow;
  // null means "don't touch dialogue_lines for this scene" — distinct
  // from an empty array, which would mean "replace with zero lines".
  dialogueLines: DialogueLineRowPayload[] | null;
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

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SyncError(
      400,
      `Field "${field}" is required and must be an array (use [] if empty). ` +
        `dialogue, expressions, vocabulary, and tips must all be present together.`
    );
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

// Unlike dialogue/expressions/vocabulary/tips, subtitle_cues is optional:
// most scenes have no timed transcript yet. Omitted or null -> null
// (frontend shows no subtitle option).
//
// Individual malformed cues (bad timecode, end <= start, blank en/zh) are
// dropped rather than failing the whole sync — one bad row in
// Dialogue_Lines for one scene must never block that scene's video_url/
// dialogue/etc. from syncing. A structurally wrong payload (not an array,
// not an array of objects) still throws, since that indicates the caller
// itself is broken, not a specific bad data row.
function validateSubtitleCues(value: unknown): SubtitleCueRow[] | null {
  if (value === undefined || value === null) return null;
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

// Optional, like subtitle_cues: omitted/null -> null, meaning "this scene
// isn't migrated to dialogue_lines yet, leave its legacy dialogue/
// subtitle_cues alone" (see index.ts — replace_dialogue_lines is only
// called when this is non-null). A malformed individual row (blank
// speaker/dialogue_en/dialogue_zh, non-integer line_order) is dropped,
// not a thrown error — same reasoning as validateSubtitleCues: one bad
// row for one scene must never block that scene's other fields from
// syncing. start_time/end_time may be null (a line can exist before its
// timing is known); when present they go through the same
// normalizeTimecode as subtitle_cues.
function validateDialogueLines(value: unknown): DialogueLineRowPayload[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new SyncError(400, `Field "dialogue_lines" must be an array or null.`);
  }

  const lines: DialogueLineRowPayload[] = [];
  value.forEach((raw, i) => {
    const item = requireObjectItem(raw, "dialogue_lines", i);
    const lineOrder = Number(item.line_order);
    const speaker = typeof item.speaker === "string" ? item.speaker.trim() : "";
    const speakerZh = typeof item.speaker_zh === "string" ? item.speaker_zh.trim() : "";
    const dialogueEn = typeof item.dialogue_en === "string" ? item.dialogue_en.trim() : "";
    const dialogueZh = typeof item.dialogue_zh === "string" ? item.dialogue_zh.trim() : "";
    const isValid =
      Number.isFinite(lineOrder) &&
      Number.isInteger(lineOrder) &&
      lineOrder > 0 &&
      speaker.length > 0 &&
      speakerZh.length > 0 &&
      dialogueEn.length > 0 &&
      dialogueZh.length > 0;
    if (!isValid) return;

    const start = normalizeTimecode(item.start_time);
    const end = normalizeTimecode(item.end_time);
    const step = item.step === null || item.step === undefined || item.step === "" ? null : Number(item.step);

    lines.push({
      line_order: lineOrder,
      step: Number.isFinite(step) ? step : null,
      speaker,
      speaker_zh: speakerZh,
      dialogue_en: dialogueEn,
      dialogue_zh: dialogueZh,
      start_time: start !== null && start >= 0 ? start : null,
      end_time: end !== null && start !== null && start >= 0 && end > start ? end : null,
    });
  });

  return lines.length > 0 ? lines : null;
}

function validateTips(value: unknown): TipRow[] {
  return requireArray(value, "tips").map((raw, i) => {
    const item = requireObjectItem(raw, "tips", i);
    return {
      type: requireNonEmptyString(item.type, `tips[${i}].type`),
      title: requireNonEmptyString(item.title, `tips[${i}].title`),
      titleZh: requireNonEmptyString(item.titleZh, `tips[${i}].titleZh`),
      body: requireNonEmptyString(item.body, `tips[${i}].body`),
      bodyZh: requireNonEmptyString(item.bodyZh, `tips[${i}].bodyZh`),
    };
  });
}

export function validateScenePayload(body: unknown): ValidatedScenePayload {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new SyncError(400, "Request body must be a JSON object.");
  }
  const payload = body as Record<string, unknown>;

  const sceneIdLabel =
    payload.scene_id === undefined || payload.scene_id === null ? null : String(payload.scene_id);

  // dialogue/expressions/vocabulary/tips must arrive as a bundle: this
  // mirrors mapSceneRow()'s hasContent = (dialogue !== null) check in
  // src/data/scenes-access.ts, which assumes all four are seeded together.
  const hasAllFourJsonFields =
    payload.dialogue !== undefined &&
    payload.expressions !== undefined &&
    payload.vocabulary !== undefined &&
    payload.tips !== undefined;
  if (!hasAllFourJsonFields) {
    throw new SyncError(
      400,
      "dialogue, expressions, vocabulary, and tips must all be provided together (each an array, [] if empty)."
    );
  }

  return {
    sceneIdLabel,
    categoryName: requireNonEmptyString(payload.category, "category"),
    dialogueLines: validateDialogueLines(payload.dialogue_lines),
    row: {
      slug: requireNonEmptyString(payload.slug, "slug"),
      title_en: requireNonEmptyString(payload.title_en, "title_en"),
      title_zh: requireNonEmptyString(payload.title_zh, "title_zh"),
      region: requireNonEmptyString(payload.region, "region"),
      level: requireNonEmptyString(payload.level, "level"),
      duration: requireNonEmptyString(payload.duration, "duration"),
      description: requireNonEmptyString(payload.description, "description"),
      photo_url: optionalString(payload.photo_url, "photo_url"),
      pdf_url: optionalString(payload.pdf_url, "pdf_url"),
      video_url: optionalString(payload.video_url, "video_url"),
      subtitle_cues: validateSubtitleCues(payload.subtitle_cues),
      status: requireStatus(payload.status),
      sort_order: requireSortOrder(payload.sort_order),
      scene_setup_en: optionalString(payload.scene_setup_en, "scene_setup_en"),
      scene_setup_zh: optionalString(payload.scene_setup_zh, "scene_setup_zh"),
      learning_goal_en: optionalString(payload.learning_goal_en, "learning_goal_en"),
      learning_goal_zh: optionalString(payload.learning_goal_zh, "learning_goal_zh"),
      dialogue: validateDialogue(payload.dialogue),
      expressions: validateExpressions(payload.expressions),
      vocabulary: validateVocabulary(payload.vocabulary),
      tips: validateTips(payload.tips),
    },
  };
}
