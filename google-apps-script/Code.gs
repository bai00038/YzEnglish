/**
 * Yz English — Figma_Data → Supabase sync (v2)
 *
 * Menu-triggered sync from the "Figma_Data" sheet to the sync-scene
 * Supabase Edge Function (supabase/functions/sync-scene in the main repo).
 * See README.md in this folder for setup, the full field mapping
 * decisions, and known limitations.
 *
 * Selecting a single data row syncs just that row (identical to v1:
 * strict preconditions, nothing written to the sheet unless every check
 * passes). Selecting multiple rows (drag-select, or Cmd/Ctrl-click several
 * rows) batch-syncs every one of them whose sync_status is exactly
 * "Ready" — rows not Ready are silently skipped (not an error), since a
 * broad selection routinely mixes already-synced rows with new ones. See
 * syncMultipleRows_.
 *
 * Every synced row also picks up timed subtitle cues, if any exist, from
 * the separate "Dialogue_Lines" tab in this same spreadsheet (a long-format
 * table: one row per subtitle cue with start_time/end_time, keyed by
 * scene_id — see loadSubtitleCuesBySceneId_). This is read once per sync
 * click regardless of how many Figma_Data rows are selected.
 
 *
 * Scope reminder: manually triggered from the menu only — no auto-trigger,
 * no vocabulary/hear/learn/step-title content, no admin UI. Do not extend
 * scope here without updating README.md.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHEET_NAME = "Figma_Data";
const READY_STATUS = "Ready"; // exact match required, see requireReadyStatus_

const SCRIPT_PROPERTY_KEYS = {
  FUNCTION_URL: "SYNC_FUNCTION_URL",
  SECRET: "SYNC_SECRET",
};

// Every literal header string this script depends on for single, non-repeating
// columns — kept in one place so spelling can be checked at a glance against
// the sheet's real header row. Repeating families (step/expression/tip
// columns) are generated programmatically instead of listed here — see
// buildDialogue_, buildExpressions_, buildTips_.
const HEADERS = {
  SCENE_ID: "scene_id",
  SLUG: "slug",
  TITLE_EN: "title_en",
  TITLE_ZH: "title_zh",
  CATEGORY_EN: "category_en",
  REGION: "region",
  LEVEL: "level",
  DURATION: "duration",
  MISSION_EN: "mission_en",
  COVER_IMAGE: "cover_image",
  PDF_URL: "pdf_url",
  VIDEO_URL: "video_url",
  WEB_STATUS: "web_status",
  SORT_ORDER: "sort_order",
  SYNC_STATUS: "sync_status",
  LAST_SYNCED_AT: "last_synced_at",
  SYNC_MESSAGE: "sync_message",
};

// The "Dialogue_Lines" tab is a separate, long-format sheet (one row per
// subtitle cue, not one row per scene) that supplies per-line start/end
// timing the wide Figma_Data step columns don't have. See
// loadSubtitleCuesBySceneId_.
const DIALOGUE_LINES_SHEET_NAME = "Dialogue_Lines";
const DIALOGUE_LINES_HEADERS = {
  SCENE_ID: "scene_id",
  LINE_ORDER: "line_order",
  DIALOGUE_EN: "dialogue_en",
  DIALOGUE_ZH: "dialogue_zh",
  START_TIME: "start_time",
  END_TIME: "end_time",
};

// step -> how many line slots that step has (3+4+4+6 = 17 total dialogue
// positions — see README "Dialogue capacity"). Purely a loop bound: every
// slot is still read by header name via getColumn_/readText_ below, not
// by column position, so bumping a count here is the only change needed
// to pick up newly-added stepN_speakerM/stepN_lineM_en/zh columns — no
// other code assumes a fixed slot count.
const DIALOGUE_STEPS = [
  { step: 1, lineCount: 3 },
  { step: 2, lineCount: 4 },
  { step: 3, lineCount: 4 },
  { step: 4, lineCount: 6 },
];

const EXPRESSION_COUNT = 8;
const TIP_COUNT = 2;

// Centralized, extensible: raw sheet speaker text -> Chinese role label
// sent to the Edge Function as dialogue[].speakerZh. Keys are matched after
// trim + lowercase (see getSpeakerZh_). Add new speakers here only.
//
// The raw `speaker` value (e.g. "Teacher", "Dentist", "Parent A") is sent
// to the Edge Function and stored as-is — it is no longer collapsed into a
// fixed "You"/"Staff" pair server-side. The frontend derives its dialogue
// legend and per-line labels straight from whatever speaker/speakerZh
// values a scene's dialogue actually contains (see
// src/data/speakerRoles.ts), so any role name entered here can appear on
// the page with its own color, in first-appearance order.
const SPEAKER_ZH_MAP = {
  "you": "你",
  "customer": "顾客",
  "parent": "家长",
  "parent a": "Leo 家长",
  "parent b": "Ethan 家长",
  "mom": "妈妈",
  "mother": "妈妈",
  "dad": "爸爸",
  "father": "爸爸",
  "staff": "工作人员",
  "cashier": "收银员",
  "teacher": "老师",
  "clerk": "店员",
  "receptionist": "前台工作人员",
  "server": "服务员",
  "waiter": "服务员",
  "waitress": "服务员",
  "dentist": "牙医",
"dental assistant": "牙医助理",
"doctor": "医生",
"patient": "患者",
};

/** Local validation/precondition failure — message is always safe to show the user. */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Yz English Sync")
    .addItem("Sync Selected Row(s)", "syncSelectedScene")
    .addItem("Check Sync Configuration", "checkSyncConfiguration")
    .addToUi();
}

function checkSyncConfiguration() {
  const ui = SpreadsheetApp.getUi();
  const missingKeys = getMissingScriptProperties_();
  if (missingKeys.length === 0) {
    ui.alert(
      "Sync configuration OK",
      "Both " + SCRIPT_PROPERTY_KEYS.FUNCTION_URL + " and " + SCRIPT_PROPERTY_KEYS.SECRET + " are set.",
      ui.ButtonSet.OK
    );
    return;
  }
  ui.alert(
    "Sync configuration incomplete",
    "Missing Script Properties: " + missingKeys.join(", ") + ".\n\n" +
      "Set them in the Apps Script editor under Project Settings → Script Properties. " +
      "This check never displays the actual values.",
    ui.ButtonSet.OK
  );
}

/** Returns the list of missing Script Property keys; never reads/returns their values. */
function getMissingScriptProperties_() {
  const props = PropertiesService.getScriptProperties();
  const missing = [];
  Object.keys(SCRIPT_PROPERTY_KEYS).forEach(function (name) {
    const key = SCRIPT_PROPERTY_KEYS[name];
    const value = props.getProperty(key);
    if (!value || value.trim().length === 0) missing.push(key);
  });
  return missing;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Dispatches to single-row or batch sync depending on how many data rows
 * are currently selected. A single selected row keeps the exact v1
 * behavior (strict, all-or-nothing preconditions); more than one row
 * switches to the more permissive batch mode (see syncMultipleRows_).
 */
function syncSelectedScene() {
  const ui = SpreadsheetApp.getUi();

  let sheet, rowIndices, headerMap, config, subtitleCuesBySceneId;
  try {
    sheet = requireFigmaDataSheet_();
    rowIndices = requireSelectedDataRows_(sheet);
    headerMap = getHeaderMap_(sheet);
    config = readSyncConfig_();
    // Loaded once per sync click (not once per row) — Dialogue_Lines is
    // read in full regardless of how many Figma_Data rows are selected.
    subtitleCuesBySceneId = loadSubtitleCuesBySceneId_();
  } catch (err) {
    ui.alert("Sync not started", describeError_(err), ui.ButtonSet.OK);
    return;
  }

  if (rowIndices.length === 1) {
    syncSingleRow_(ui, sheet, rowIndices[0], headerMap, config, subtitleCuesBySceneId);
  } else {
    syncMultipleRows_(ui, sheet, rowIndices, headerMap, config, subtitleCuesBySceneId);
  }
}

/**
 * Original v1 flow for exactly one selected row. Phase 1 (preconditions)
 * is alert-only — nothing on the sheet is touched, because we have not yet
 * committed to a sync attempt. This is why sync_status is never
 * overwritten (not even to "Syncing") for a missing scene_id,
 * sync_status != Ready, or a local payload validation failure. Phase 2 is
 * committed: from there, every outcome updates the sheet.
 */
function syncSingleRow_(ui, sheet, rowIndex, headerMap, config, subtitleCuesBySceneId) {
  let rowValues, payload;
  try {
    rowValues = getRowValues_(sheet, rowIndex, headerMap);
    requireSceneId_(headerMap, rowValues);
    requireReadyStatus_(headerMap, rowValues);
    payload = buildPayload_(headerMap, rowValues, subtitleCuesBySceneId);
  } catch (err) {
    ui.alert("Sync not started", describeError_(err), ui.ButtonSet.OK);
    return;
  }

  writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Syncing", message: "Sync started" });
  SpreadsheetApp.flush();

  const outcome = callSyncFunction_(config, payload);

  if (outcome.success) {
    writeSyncStatus_(sheet, rowIndex, headerMap, {
      status: "Synced",
      message: outcome.message,
      syncedAt: new Date(),
    });
    ui.alert("Sync complete", outcome.message, ui.ButtonSet.OK);
  } else {
    writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Error", message: outcome.message });
    ui.alert("Sync failed", outcome.message, ui.ButtonSet.OK);
  }
}

/**
 * Batch flow for two or more selected rows. Unlike the single-row flow,
 * a row whose sync_status isn't exactly "Ready" is silently skipped
 * rather than blocking the whole batch — a broad multi-row selection
 * routinely mixes already-synced rows in with new ones, and re-selecting
 * a wide range should always be safe to run. Every row that IS "Ready"
 * still goes through the same scene_id/payload validation as a single
 * sync; a failure there is recorded on that row (status "Error" +
 * sync_message) and the batch continues with the remaining rows —
 * one bad row never blocks the others. A single summary alert reports
 * counts at the end instead of one alert per row.
 */
function syncMultipleRows_(ui, sheet, rowIndices, headerMap, config, subtitleCuesBySceneId) {
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  rowIndices.forEach(function (rowIndex) {
    const rowValues = getRowValues_(sheet, rowIndex, headerMap);
    const status = readText_(rowValues, HEADERS.SYNC_STATUS);
    if (status !== READY_STATUS) {
      skipped++;
      return;
    }

    let payload;
    try {
      requireSceneId_(headerMap, rowValues);
      payload = buildPayload_(headerMap, rowValues, subtitleCuesBySceneId);
    } catch (err) {
      const message = describeError_(err);
      failed++;
      failures.push("Row " + rowIndex + ": " + message);
      writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Error", message: message });
      return;
    }

    writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Syncing", message: "Sync started" });
    SpreadsheetApp.flush();

    const outcome = callSyncFunction_(config, payload);
    if (outcome.success) {
      synced++;
      writeSyncStatus_(sheet, rowIndex, headerMap, {
        status: "Synced",
        message: outcome.message,
        syncedAt: new Date(),
      });
    } else {
      failed++;
      failures.push("Row " + rowIndex + ": " + outcome.message);
      writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Error", message: outcome.message });
    }
  });

  const lines = [
    rowIndices.length + " row(s) selected.",
    synced + " synced, " + skipped + " skipped (not Ready), " + failed + " failed.",
  ];
  if (failures.length > 0) {
    lines.push("");
    lines.push("Failures:");
    failures.forEach(function (line) { lines.push(truncateMessage_(line)); });
  }
  ui.alert("Batch sync complete", lines.join("\n"), ui.ButtonSet.OK);
}

function describeError_(err) {
  if (err instanceof ValidationError) return err.message;
  return "Unexpected error: " + (err && err.message ? String(err.message) : "unknown error.");
}

// ---------------------------------------------------------------------------
// Row selection
// ---------------------------------------------------------------------------

function requireFigmaDataSheet_() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) {
    throw new ValidationError(
      'Please select a row on the "' + SHEET_NAME + '" sheet before syncing (currently on "' + sheet.getName() + '").'
    );
  }
  return sheet;
}

/**
 * Collects every distinct data row (row 1 excluded) touched by the current
 * selection — a single clicked cell, a dragged block, or several
 * non-contiguous ranges (Cmd/Ctrl-click). Returned in ascending row order,
 * de-duplicated so an overlapping multi-range selection never double-syncs
 * a row.
 */
function requireSelectedDataRows_(sheet) {
  const rangeList = sheet.getActiveRangeList();
  if (!rangeList) {
    throw new ValidationError("No cells are selected. Select one or more scene rows first.");
  }

  const rowSet = {};
  rangeList.getRanges().forEach(function (range) {
    const startRow = range.getRow();
    const numRows = range.getNumRows();
    for (let i = 0; i < numRows; i++) {
      const rowIndex = startRow + i;
      if (rowIndex === 1) continue; // header row is never a data row — skip silently
      rowSet[rowIndex] = true;
    }
  });

  const rows = Object.keys(rowSet)
    .map(Number)
    .sort(function (a, b) { return a - b; });

  if (rows.length === 0) {
    throw new ValidationError("Only the header row is selected. Select one or more scene data rows instead.");
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Header lookup
// ---------------------------------------------------------------------------

/** Header name -> 1-based column index, built by scanning row 1. Exact match after trim. */
function getHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};
  headerRow.forEach(function (rawHeader, i) {
    const header = String(rawHeader).trim();
    if (header.length === 0) return;
    map[header] = i + 1;
  });
  return map;
}

function getColumn_(headerMap, headerName) {
  const col = headerMap[headerName];
  if (!col) {
    throw new ValidationError('Sheet is missing an expected column header: "' + headerName + '".');
  }
  return col;
}

/** Reads the full selected row once into a {headerName: rawValue} map. */
function getRowValues_(sheet, rowIndex, headerMap) {
  const lastColumn = sheet.getLastColumn();
  const rawRow = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
  const values = {};
  Object.keys(headerMap).forEach(function (headerName) {
    values[headerName] = rawRow[headerMap[headerName] - 1];
  });
  return values;
}

function readText_(rowValues, headerName) {
  const raw = rowValues[headerName];
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

// ---------------------------------------------------------------------------
// Preconditions
// ---------------------------------------------------------------------------

function requireSceneId_(headerMap, rowValues) {
  getColumn_(headerMap, HEADERS.SCENE_ID);
  const sceneId = readText_(rowValues, HEADERS.SCENE_ID);
  if (sceneId.length === 0) {
    throw new ValidationError("This row has no scene_id. Fill it in before syncing.");
  }
  return sceneId;
}

function requireReadyStatus_(headerMap, rowValues) {
  getColumn_(headerMap, HEADERS.SYNC_STATUS);
  const status = readText_(rowValues, HEADERS.SYNC_STATUS);
  if (status !== READY_STATUS) {
    throw new ValidationError(
      'sync_status is "' + (status.length ? status : "(blank)") + '", not exactly "' + READY_STATUS + '". ' +
        "Set sync_status to " + READY_STATUS + " before syncing."
    );
  }
}

/** Reads and validates SYNC_FUNCTION_URL / SYNC_SECRET from Script Properties. Never logs values. */
function readSyncConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = (props.getProperty(SCRIPT_PROPERTY_KEYS.FUNCTION_URL) || "").trim();
  const secret = (props.getProperty(SCRIPT_PROPERTY_KEYS.SECRET) || "").trim();

  const missingKeys = [];
  if (url.length === 0) missingKeys.push(SCRIPT_PROPERTY_KEYS.FUNCTION_URL);
  if (secret.length === 0) missingKeys.push(SCRIPT_PROPERTY_KEYS.SECRET);
  if (missingKeys.length > 0) {
    throw new ValidationError("Sync is not configured. Missing Script Properties: " + missingKeys.join(", ") + ".");
  }

  return { url: url, secret: secret };
}

// ---------------------------------------------------------------------------
// Dialogue_Lines (subtitle cues)
// ---------------------------------------------------------------------------

/**
 * Reads the whole "Dialogue_Lines" tab once and indexes it by scene_id as
 * arrays of {start, end, en, zh} cues, sorted by line_order — ready to
 * drop straight into a payload's subtitle_cues field. Loaded once per
 * sync click (not once per Figma_Data row), since a batch sync would
 * otherwise re-read this whole sheet for every row.
 *
 * This is a genuinely separate table from Figma_Data's dialogue columns:
 * one row per subtitle cue (not one row per scene, up to ~18+ rows per
 * scene here vs. the 13-slot step1..step4 template), produced by a
 * forced-alignment/transcription process outside this script. A scene
 * with no rows here yet simply gets subtitle_cues: null.
 *
 * A malformed individual row (non-numeric start_time/end_time, end_time
 * <= start_time, or blank dialogue_en/dialogue_zh) is skipped, not a
 * thrown error — one bad timing row in one scene must never block syncing
 * every other scene. Only a missing "Dialogue_Lines" tab or a missing
 * required column is still a hard error, since those mean cues can't be
 * built for ANY scene, not just one row.
 */
function loadSubtitleCuesBySceneId_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DIALOGUE_LINES_SHEET_NAME);
  if (!sheet) {
    throw new ValidationError(
      'Sheet "' + DIALOGUE_LINES_SHEET_NAME + '" was not found in this spreadsheet — cannot build subtitle cues.'
    );
  }

  const headerMap = getHeaderMap_(sheet);
  [
    DIALOGUE_LINES_HEADERS.SCENE_ID, DIALOGUE_LINES_HEADERS.LINE_ORDER,
    DIALOGUE_LINES_HEADERS.DIALOGUE_EN, DIALOGUE_LINES_HEADERS.DIALOGUE_ZH,
    DIALOGUE_LINES_HEADERS.START_TIME, DIALOGUE_LINES_HEADERS.END_TIME,
  ].forEach(function (h) { getColumn_(headerMap, h); });

  const lastRow = sheet.getLastRow();
  const bySceneId = {};
  if (lastRow < 2) return bySceneId; // header row only, no data yet

  const rawRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const col = function (name) { return headerMap[name] - 1; };

  rawRows.forEach(function (raw) {
    const sceneId = String(raw[col(DIALOGUE_LINES_HEADERS.SCENE_ID)] || "").trim();
    if (sceneId.length === 0) return; // blank trailing row — skip silently

    const lineOrderRaw = raw[col(DIALOGUE_LINES_HEADERS.LINE_ORDER)];
    const en = String(raw[col(DIALOGUE_LINES_HEADERS.DIALOGUE_EN)] || "").trim();
    const zh = String(raw[col(DIALOGUE_LINES_HEADERS.DIALOGUE_ZH)] || "").trim();

    // Number(), not parseInt — parseInt("2.023") truncates to 2 and silently
    // drops the fractional seconds. Convert first, then validate; never
    // assume the cell already came back as a JS number — a text-formatted
    // cell (common after copy/paste from another sheet) reads back as a
    // string like "2.023", not a number, even though it looks identical.
    //
    // A blank cell reads back as "" — Number("") is 0, not NaN, so an
    // empty start_time with a real end_time would otherwise silently
    // become a "valid" cue starting at 0. Blank must be excluded before
    // the Number() conversion, not detected after it.
    const rawStart = raw[col(DIALOGUE_LINES_HEADERS.START_TIME)];
    const rawEnd = raw[col(DIALOGUE_LINES_HEADERS.END_TIME)];
    const startTime = rawStart === "" || rawStart === null ? NaN : Number(rawStart);
    const endTime = rawEnd === "" || rawEnd === null ? NaN : Number(rawEnd);
    const hasValidTimecode =
      Number.isFinite(startTime) &&
      Number.isFinite(endTime) &&
      startTime >= 0 &&
      endTime > startTime;

    // A row with no usable timecode or missing text is skipped, not a
    // hard sync failure — Dialogue_Lines coverage is allowed to be
    // partial or absent for a given scene. The frontend already treats a
    // scene with no subtitle_cues as "no subtitles yet", same as a scene
    // with no video yet (see 0011_replace_subtitle_urls_with_cues.sql).
    if (!hasValidTimecode || en.length === 0 || zh.length === 0) return;

    if (!bySceneId[sceneId]) bySceneId[sceneId] = [];
    bySceneId[sceneId].push({
      lineOrder: Number(lineOrderRaw) || 0,
      start: startTime,
      end: endTime,
      en: en,
      zh: zh,
    });
  });

  Object.keys(bySceneId).forEach(function (sceneId) {
    bySceneId[sceneId].sort(function (a, b) { return a.lineOrder - b.lineOrder; });
    // lineOrder only exists to sort by — the Edge Function's cue shape is
    // exactly {start, end, en, zh}.
    bySceneId[sceneId].forEach(function (cue) { delete cue.lineOrder; });
  });

  return bySceneId;
}

// ---------------------------------------------------------------------------
// Payload assembly
// ---------------------------------------------------------------------------

function buildPayload_(headerMap, rowValues, subtitleCuesBySceneId) {
  const payload = buildBaseFields_(headerMap, rowValues);
  // All four must always be present, even empty — the Edge Function rejects
  // a request where any of these four keys is missing.
  payload.dialogue = buildDialogue_(headerMap, rowValues);
  payload.expressions = buildExpressions_(headerMap, rowValues);
  payload.vocabulary = []; // v1: no sheet columns map to word/phonetic/pos/zh/example — see README
  payload.tips = buildTips_(headerMap, rowValues);
  // Optional, unlike the four above: most scenes have no Dialogue_Lines
  // timing yet. null when this scene_id has no matching rows there.
  payload.subtitle_cues = subtitleCuesBySceneId[payload.scene_id] || null;
  return payload;
}

/**
 * Base scalar fields are passed through trimmed but otherwise unvalidated
 * here (e.g. we do not locally reject a blank title_en). The Edge Function
 * is the source of truth for per-field "required" checks on these and will
 * reject with a specific field name — duplicating that logic here would
 * just risk the two checks drifting apart.
 */
function buildBaseFields_(headerMap, rowValues) {
  [
    HEADERS.SCENE_ID, HEADERS.SLUG, HEADERS.TITLE_EN, HEADERS.TITLE_ZH, HEADERS.CATEGORY_EN,
    HEADERS.REGION, HEADERS.LEVEL, HEADERS.DURATION, HEADERS.MISSION_EN, HEADERS.COVER_IMAGE,
    HEADERS.PDF_URL, HEADERS.VIDEO_URL, HEADERS.WEB_STATUS, HEADERS.SORT_ORDER,
  ].forEach(function (h) { getColumn_(headerMap, h); });

  const coverImage = readText_(rowValues, HEADERS.COVER_IMAGE);
  const pdfUrl = readText_(rowValues, HEADERS.PDF_URL);
  const videoUrl = readText_(rowValues, HEADERS.VIDEO_URL);

  return {
    scene_id: readText_(rowValues, HEADERS.SCENE_ID),
    slug: readText_(rowValues, HEADERS.SLUG),
    title_en: readText_(rowValues, HEADERS.TITLE_EN),
    title_zh: readText_(rowValues, HEADERS.TITLE_ZH),
    category: readText_(rowValues, HEADERS.CATEGORY_EN),
    region: readText_(rowValues, HEADERS.REGION),
    level: readText_(rowValues, HEADERS.LEVEL),
    duration: readText_(rowValues, HEADERS.DURATION),
    description: readText_(rowValues, HEADERS.MISSION_EN),
    photo_url: coverImage.length === 0 ? null : coverImage,
    pdf_url: pdfUrl.length === 0 ? null : pdfUrl,
    video_url: videoUrl.length === 0 ? null : videoUrl,
    status: readText_(rowValues, HEADERS.WEB_STATUS),
    sort_order: readSortOrder_(rowValues),
    // v1: no sheet columns map to these — see README "Fields not synced in v1".
    scene_setup_en: "",
    scene_setup_zh: "",
    learning_goal_en: "",
    learning_goal_zh: "",
  };
}

/** Blank -> 0. Non-blank must be a whole number. Always returns a JS number, never a numeric string. */
function readSortOrder_(rowValues) {
  const raw = rowValues[HEADERS.SORT_ORDER];
  if (raw === null || raw === undefined || String(raw).trim().length === 0) {
    return 0;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new ValidationError('sort_order must be a whole number. Got: "' + raw + '".');
  }
  return num;
}

// ---------------------------------------------------------------------------
// dialogue
// ---------------------------------------------------------------------------

/**
 * Walks all 17 step/line slots in order, per DIALOGUE_STEPS (Step1 L1-3,
 * Step2 L1-4, Step3 L1-4, Step4 L1-6) — every slot is checked, so the
 * last line (step4 line6) is never skipped. A fully blank slot is
 * omitted; a partially filled slot is a data error, not a silent skip.
 */
function buildDialogue_(headerMap, rowValues) {
  const dialogue = [];

  DIALOGUE_STEPS.forEach(function (stepDef) {
    for (let line = 1; line <= stepDef.lineCount; line++) {
      const speakerHeader = "step" + stepDef.step + "_speaker" + line;
      const enHeader = "step" + stepDef.step + "_line" + line + "_en";
      const zhHeader = "step" + stepDef.step + "_line" + line + "_zh";

      getColumn_(headerMap, speakerHeader);
      getColumn_(headerMap, enHeader);
      getColumn_(headerMap, zhHeader);

      const speaker = readText_(rowValues, speakerHeader);
      const en = readText_(rowValues, enHeader);
      const zh = readText_(rowValues, zhHeader);
      const filledCount = [speaker, en, zh].filter(function (v) { return v.length > 0; }).length;

      if (filledCount === 0) continue;
      if (filledCount < 3) {
        throw new ValidationError(
          "Step " + stepDef.step + " line " + line + " is only partially filled " +
            "(speaker/en/zh must all be filled or all be blank). " +
            'speaker="' + speaker + '" en="' + en + '" zh="' + zh + '".'
        );
      }

      dialogue.push({
        speaker: speaker,
        speakerZh: getSpeakerZh_(speaker),
        en: en,
        zh: zh,
      });
    }
  });

  return dialogue;
}

function getSpeakerZh_(rawSpeaker) {
  const key = rawSpeaker.trim().toLowerCase();
  const speakerZh = SPEAKER_ZH_MAP[key];
  if (!speakerZh) {
    throw new ValidationError(
      'Unrecognized speaker "' + rawSpeaker + '". Add it to SPEAKER_ZH_MAP in Code.gs, or fix the sheet value.'
    );
  }
  return speakerZh;
}

// ---------------------------------------------------------------------------
// expressions
// ---------------------------------------------------------------------------

/**
 * label duplicates en (there is no dedicated label column on the sheet —
 * this is an intentional, previously-approved decision, not a bug). note
 * is always "" for the same reason; the Edge Function accepts an empty
 * note string (see supabase/functions/sync-scene/validation.ts).
 */
function buildExpressions_(headerMap, rowValues) {
  const expressions = [];

  for (let n = 1; n <= EXPRESSION_COUNT; n++) {
    const enHeader = "expression" + n + "_en";
    const zhHeader = "expression" + n + "_zh";
    getColumn_(headerMap, enHeader);
    getColumn_(headerMap, zhHeader);

    const en = readText_(rowValues, enHeader);
    const zh = readText_(rowValues, zhHeader);
    const filledCount = [en, zh].filter(function (v) { return v.length > 0; }).length;

    if (filledCount === 0) continue;
    if (filledCount < 2) {
      throw new ValidationError(
        "expression" + n + " is only partially filled (en/zh must both be filled or both be blank). " +
          'en="' + en + '" zh="' + zh + '".'
      );
    }

    expressions.push({ label: en, en: en, zh: zh, note: "" });
  }

  return expressions;
}

// ---------------------------------------------------------------------------
// tips
// ---------------------------------------------------------------------------

/** title/titleZh are fixed literals ("Tip 1"/"提示 1", etc.) — the sheet has no source for them. */
function buildTips_(headerMap, rowValues) {
  const tips = [];

  for (let n = 1; n <= TIP_COUNT; n++) {
    const enHeader = "tip" + n + "_en";
    const zhHeader = "tip" + n + "_zh";
    getColumn_(headerMap, enHeader);
    getColumn_(headerMap, zhHeader);

    const en = readText_(rowValues, enHeader);
    const zh = readText_(rowValues, zhHeader);
    const filledCount = [en, zh].filter(function (v) { return v.length > 0; }).length;

    if (filledCount === 0) continue;
    if (filledCount < 2) {
      throw new ValidationError(
        "tip" + n + " is only partially filled (en/zh must both be filled or both be blank). " +
          'en="' + en + '" zh="' + zh + '".'
      );
    }

    tips.push({ type: "tip", title: "Tip " + n, titleZh: "提示 " + n, body: en, bodyZh: zh });
  }

  return tips;
}

// ---------------------------------------------------------------------------
// HTTP call
// ---------------------------------------------------------------------------

/**
 * config.secret only ever appears here, inside the Authorization header we
 * build for this one request. It is never assigned to any other variable,
 * never logged, and never included in a thrown/returned message.
 */
function callSyncFunction_(config, payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + config.secret,
    },
  };

  let response;
  try {
    response = UrlFetchApp.fetch(config.url, options);
  } catch (err) {
    // Deliberately not surfacing err.message here: with muteHttpExceptions
    // true this only throws for low-level failures (bad URL, DNS, etc.),
    // and we'd rather show a fixed safe string than risk ever echoing
    // anything derived from the request we just sent.
    return { success: false, message: "Could not reach the sync service. Check SYNC_FUNCTION_URL and try again." };
  }

  return parseSyncResponse_(response);
}

/** Turns an HTTPResponse into {success, message}, never throwing and never leaking response internals. */
function parseSyncResponse_(response) {
  const status = response.getResponseCode();
  const bodyText = response.getContentText();

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (err) {
    return { success: false, message: truncateMessage_("Sync service returned an unreadable response (HTTP " + status + ").") };
  }

  const isSuccess = status >= 200 && status < 300 && body && body.success === true;
  const safe = safeMessage_(body && body.message);

  if (isSuccess) {
    return { success: true, message: truncateMessage_(safe || "Scene synced successfully") };
  }

  return {
    success: false,
    message: truncateMessage_("HTTP " + status + (safe ? ": " + safe : " — sync failed.")),
  };
}

function safeMessage_(message) {
  return typeof message === "string" ? message : null;
}

/** Keeps sync_message readable in a single sheet cell — never dumps a full stack trace or HTML error page. */
function truncateMessage_(message) {
  const MAX_LENGTH = 500;
  if (message.length <= MAX_LENGTH) return message;
  return message.slice(0, MAX_LENGTH - 3) + "...";
}

// ---------------------------------------------------------------------------
// Status writeback
// ---------------------------------------------------------------------------

function writeSyncStatus_(sheet, rowIndex, headerMap, update) {
  const statusCol = getColumn_(headerMap, HEADERS.SYNC_STATUS);
  const messageCol = getColumn_(headerMap, HEADERS.SYNC_MESSAGE);

  sheet.getRange(rowIndex, statusCol).setValue(update.status);
  sheet.getRange(rowIndex, messageCol).setValue(update.message);

  if (update.syncedAt) {
    const syncedAtCol = getColumn_(headerMap, HEADERS.LAST_SYNCED_AT);
    sheet.getRange(rowIndex, syncedAtCol).setValue(update.syncedAt); // Date object, not a formatted string
  }
}
