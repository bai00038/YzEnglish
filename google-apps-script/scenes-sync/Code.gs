/**
 * Yz English — Scenes / Dialogue_Lines / Tips → Supabase sync (v2, Phase A-0)
 *
 * A SEPARATE, independent script for the NEW Google Sheet (Scenes /
 * Dialogue_Lines / Tips / Validation / Sync_Log tabs) — not a
 * modification of google-apps-script/Code.gs, which stays exactly as-is
 * for the original Figma_Data spreadsheet (Figma PDF export only, no
 * longer the website's data source). Bind this file to the NEW
 * spreadsheet's own Apps Script project — see README.md in this folder
 * for setup.
 *
 * This script owns a DIFFERENT set of scenes.* fields than Figma_Data's
 * script: it sends slug/title/category/region/level/duration/status/
 * photo_url/pdf_url/video_url/description/scene_setup/learning_goal/
 * sort_order/tips[]/dialogue_lines[] — and deliberately OMITS
 * dialogue/expressions/vocabulary/subtitle_cues from every payload
 * (never sends those keys at all, not even null). The sync-scene Edge
 * Function (supabase/functions/sync-scene/validation.ts) treats an
 * omitted key as "don't touch this column" — so a scene synced from
 * here never overwrites the legacy dialogue/expressions/vocabulary/
 * subtitle_cues content that may still exist from Figma_Data. See that
 * file's ScenePayloadRow comment for the full reasoning.
 *
 * Phase A-0 (permanent scene_id / line_id): the Scenes.scene_id column
 * sent on every payload is no longer just a log label — it is now the
 * REQUIRED, PERMANENT match key the Edge Function uses to find an
 * existing scene (public.scenes.external_scene_id), replacing slug for
 * that purpose. slug is still required, still unique, and is still what
 * powers page URLs — it just no longer decides "is this the same scene
 * as last time." Likewise every Dialogue_Lines row now requires a
 * line_id (public.dialogue_lines.external_line_id) — see
 * loadDialogueLinesBySceneId_'s comment for what happens when one is
 * missing or duplicated. See
 * supabase/migrations/0013_add_external_ids.sql and
 * 0019_sync_scene_rpc.sql for the database side of this.
 *
 * Selecting a single Scenes row syncs just that scene (strict
 * preconditions, nothing written unless every check passes). Selecting
 * multiple rows batch-syncs every one of them whose sync_status is
 * exactly "Ready" — rows not Ready are silently skipped. Every sync
 * attempt (single or batch) appends one row to the Sync_Log tab, in
 * addition to updating that scene's own sync_status/last_synced_at/
 * sync_message cells — Sync_Log keeps full history; the Scenes row only
 * ever shows the latest state.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCENES_SHEET_NAME = "Scenes";
const DIALOGUE_LINES_SHEET_NAME = "Dialogue_Lines";
const TIPS_SHEET_NAME = "Tips";
const SYNC_LOG_SHEET_NAME = "Sync_Log";
const READY_STATUS = "Ready";

const SCRIPT_PROPERTY_KEYS = {
  FUNCTION_URL: "SYNC_FUNCTION_URL",
  SECRET: "SYNC_SECRET",
};

// Every literal header string this script depends on — one place to
// check spelling against the sheet's real header row. All columns are
// read by header name, not position, so reordering columns in the sheet
// never breaks the sync.
const SCENES_HEADERS = {
  SCENE_ID: "scene_id",
  SLUG: "slug",
  TITLE_EN: "title_en",
  TITLE_ZH: "title_zh",
  CATEGORY_EN: "category_en",
  REGION: "region",
  LEVEL: "level",
  DURATION: "duration",
  STATUS: "status",
  COVER_IMAGE: "cover_image",
  PDF_URL: "pdf_url",
  VIDEO_URL: "video_url",
  MISSION_EN: "mission_en",
  SCENE_SETUP_EN: "scene_setup_en",
  SCENE_SETUP_ZH: "scene_setup_zh",
  LEARNING_GOAL_EN: "learning_goal_en",
  LEARNING_GOAL_ZH: "learning_goal_zh",
  SORT_ORDER: "sort_order",
  SYNC_STATUS: "sync_status",
  LAST_SYNCED_AT: "last_synced_at",
  SYNC_MESSAGE: "sync_message",
};

// Column order in the sheet is expected to lead with line_id, then
// scene_id, then line_order (see scenes-sync/README.md Tab 2) — but since
// every column here is read by header name, not position, that order is
// only a documentation convention, never enforced by this script.
const DIALOGUE_LINES_HEADERS = {
  LINE_ID: "line_id",
  SCENE_ID: "scene_id",
  LINE_ORDER: "line_order",
  STEP: "step",
  SPEAKER: "speaker",
  SPEAKER_ZH: "speaker_zh",
  DIALOGUE_EN: "dialogue_en",
  DIALOGUE_ZH: "dialogue_zh",
  START_TIME: "start_time",
  END_TIME: "end_time",
};

const TIPS_HEADERS = {
  SCENE_ID: "scene_id",
  SORT_ORDER: "sort_order",
  TITLE_EN: "title_en",
  TITLE_ZH: "title_zh",
  BODY_EN: "body_en",
  BODY_ZH: "body_zh",
};

// Resource_Collections is a fifth, independent tab in this same spreadsheet
// — multi-scene PDF packs shown on the Resources page (public.resource_
// collections). It has no row-selection step and no sync_status precondition
// like Scenes above; see syncResourceCollections() for its own semantics.
const RESOURCE_COLLECTIONS_SHEET_NAME = "Resource_Collections";
const RESOURCE_COLLECTIONS_HEADERS = {
  COLLECTION_ID: "collection_id",
  TITLE_EN: "title_en",
  TITLE_ZH: "title_zh",
  DESCRIPTION_EN: "description_en",
  DESCRIPTION_ZH: "description_zh",
  COLLECTION_TYPE: "collection_type",
  PRICE_TYPE: "price_type",
  PRICE: "price",
  COVER_IMAGE_URL: "cover_image_url",
  PDF_URL: "pdf_url",
  SCENE_IDS: "scene_ids",
  SCENE_COUNT: "scene_count",
  STATUS: "status",
  SORT_ORDER: "sort_order",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
  SYNC_STATUS: "sync_status",
  LAST_SYNCED_AT: "last_synced_at",
  SYNC_MESSAGE: "sync_message",
};

// A DISTINCT set of Script Properties from SCRIPT_PROPERTY_KEYS above.
// Resource_Collections must never be sent to the sync-scene Edge Function
// Scenes uses (it requires scene_id and knows nothing about collection_id
// or resource_collections) — it goes to its own sync-resource-collection
// Edge Function instead, configured with its own URL and its own secret.
// See supabase/functions/sync-resource-collection/index.ts, which reads a
// distinct RESOURCE_COLLECTION_SYNC_SECRET project secret for exactly this
// reason (Supabase project secrets are shared across every deployed Edge
// Function, so reusing sync-scene's SYNC_SECRET name would hand this
// function the exact same value). The Script Property value here MUST be
// set to the exact same secret as the Supabase Edge Function Secret of the
// same name — never store it in a sheet cell.
const RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS = {
  FUNCTION_URL: "RESOURCE_COLLECTIONS_SYNC_FUNCTION_URL",
  SECRET: "RESOURCE_COLLECTION_SYNC_SECRET",
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
    .addItem("Sync Selected Row(s)", "syncSelectedScenes")
    .addItem("Sync Resource Collections", "syncResourceCollections")
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

function syncSelectedScenes() {
  const ui = SpreadsheetApp.getUi();

  let sheet, rowIndices, headerMap, config, dialogueLinesBySceneId, tipsBySceneId;
  try {
    sheet = requireScenesSheet_();
    rowIndices = requireSelectedDataRows_(sheet);
    headerMap = getHeaderMap_(sheet);
    config = readSyncConfig_();
    // Loaded once per click regardless of how many Scenes rows are
    // selected, same reasoning as the Figma_Data script's
    // loadSubtitleCuesBySceneId_: avoid re-reading a whole tab per row.
    dialogueLinesBySceneId = loadDialogueLinesBySceneId_();
    tipsBySceneId = loadTipsBySceneId_();
  } catch (err) {
    ui.alert("Sync not started", describeError_(err), ui.ButtonSet.OK);
    return;
  }

  if (rowIndices.length === 1) {
    syncSingleRow_(ui, sheet, rowIndices[0], headerMap, config, dialogueLinesBySceneId, tipsBySceneId);
  } else {
    syncMultipleRows_(ui, sheet, rowIndices, headerMap, config, dialogueLinesBySceneId, tipsBySceneId);
  }
}

function syncSingleRow_(ui, sheet, rowIndex, headerMap, config, dialogueLinesBySceneId, tipsBySceneId) {
  let rowValues, payload;
  try {
    rowValues = getRowValues_(sheet, rowIndex, headerMap);
    requireSceneId_(headerMap, rowValues);
    requireReadyStatus_(headerMap, rowValues);
    payload = buildPayload_(rowValues, dialogueLinesBySceneId, tipsBySceneId);
  } catch (err) {
    ui.alert("Sync not started", describeError_(err), ui.ButtonSet.OK);
    return;
  }

  writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Syncing", message: "Sync started" });
  SpreadsheetApp.flush();

  const outcome = callSyncFunction_(config, payload);
  appendSyncLog_(payload.scene_id, payload.slug, "single", outcome.success ? "Synced" : "Error", outcome.message);

  if (outcome.success) {
    writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Synced", message: outcome.message, syncedAt: new Date() });
    ui.alert("Sync complete", outcome.message, ui.ButtonSet.OK);
  } else {
    writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Error", message: outcome.message });
    ui.alert("Sync failed", outcome.message, ui.ButtonSet.OK);
  }
}

/** Same permissive batch semantics as the Figma_Data script: not-Ready rows are skipped, not errors. */
function syncMultipleRows_(ui, sheet, rowIndices, headerMap, config, dialogueLinesBySceneId, tipsBySceneId) {
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  rowIndices.forEach(function (rowIndex) {
    const rowValues = getRowValues_(sheet, rowIndex, headerMap);
    const status = readText_(rowValues, SCENES_HEADERS.SYNC_STATUS);
    if (status !== READY_STATUS) {
      skipped++;
      return;
    }

    let payload;
    try {
      requireSceneId_(headerMap, rowValues);
      payload = buildPayload_(rowValues, dialogueLinesBySceneId, tipsBySceneId);
    } catch (err) {
      const message = describeError_(err);
      failed++;
      failures.push("Row " + rowIndex + ": " + message);
      writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Error", message: message });
      appendSyncLog_(readText_(rowValues, SCENES_HEADERS.SCENE_ID), readText_(rowValues, SCENES_HEADERS.SLUG), "batch", "Error", message);
      return;
    }

    writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Syncing", message: "Sync started" });
    SpreadsheetApp.flush();

    const outcome = callSyncFunction_(config, payload);
    appendSyncLog_(payload.scene_id, payload.slug, "batch", outcome.success ? "Synced" : "Error", outcome.message);

    if (outcome.success) {
      synced++;
      writeSyncStatus_(sheet, rowIndex, headerMap, { status: "Synced", message: outcome.message, syncedAt: new Date() });
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

function requireScenesSheet_() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SCENES_SHEET_NAME) {
    throw new ValidationError(
      'Please select a row on the "' + SCENES_SHEET_NAME + '" sheet before syncing (currently on "' + sheet.getName() + '").'
    );
  }
  return sheet;
}

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
      if (rowIndex === 1) continue;
      rowSet[rowIndex] = true;
    }
  });
  const rows = Object.keys(rowSet).map(Number).sort(function (a, b) { return a - b; });
  if (rows.length === 0) {
    throw new ValidationError("Only the header row is selected. Select one or more scene data rows instead.");
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Generic header-name-based reading (shared shape across all four tabs)
// ---------------------------------------------------------------------------

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
  getColumn_(headerMap, SCENES_HEADERS.SCENE_ID);
  const sceneId = readText_(rowValues, SCENES_HEADERS.SCENE_ID);
  if (sceneId.length === 0) {
    throw new ValidationError("This row has no scene_id. Fill it in before syncing.");
  }
  return sceneId;
}

function requireReadyStatus_(headerMap, rowValues) {
  getColumn_(headerMap, SCENES_HEADERS.SYNC_STATUS);
  const status = readText_(rowValues, SCENES_HEADERS.SYNC_STATUS);
  if (status !== READY_STATUS) {
    throw new ValidationError(
      'sync_status is "' + (status.length ? status : "(blank)") + '", not exactly "' + READY_STATUS + '". ' +
        "Set sync_status to " + READY_STATUS + " before syncing."
    );
  }
}

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
// Dialogue_Lines — read once, indexed by scene_id
// ---------------------------------------------------------------------------

/**
 * Mirrors the Figma_Data script's loadSubtitleCuesBySceneId_, but this is
 * now the ONLY source for a migrated scene's dialogue — one row here is
 * both a transcript line and a subtitle cue (see the ScenePayloadRow
 * comment in supabase/functions/sync-scene/validation.ts). start_time/
 * end_time are optional: a line can exist before its timing is filled
 * in, so a blank timecode does not exclude the row, only prevents it
 * from being used for subtitles/click-to-play until it's added.
 *
 * Phase A-0 change: every row must carry line_id — this is the row's
 * PERMANENT identity (public.dialogue_lines.external_line_id), and it is
 * never derived from this row's position, line_order, speaker, or text.
 * A row with a blank line_id (or any other missing required field) is a
 * hard stop for the whole sync, thrown here with the actual spreadsheet
 * row number, not silently skipped — skipping would mean a line's
 * identity gets silently dropped from what's sent, and re-adding it
 * later (once someone notices) has no way to know it should have reused
 * the same identity. See the "禁止静默跳过缺少ID的对白" requirement.
 * Duplicate line_id values are rejected the same way, checked across the
 * WHOLE tab (not just within one scene) because external_line_id must be
 * globally unique — see dialogue_lines_external_line_id_key in
 * supabase/migrations/0013_add_external_ids.sql.
 */
function loadDialogueLinesBySceneId_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DIALOGUE_LINES_SHEET_NAME);
  if (!sheet) {
    throw new ValidationError('Sheet "' + DIALOGUE_LINES_SHEET_NAME + '" was not found in this spreadsheet.');
  }
  const headerMap = getHeaderMap_(sheet);
  [
    DIALOGUE_LINES_HEADERS.LINE_ID, DIALOGUE_LINES_HEADERS.SCENE_ID, DIALOGUE_LINES_HEADERS.LINE_ORDER,
    DIALOGUE_LINES_HEADERS.SPEAKER, DIALOGUE_LINES_HEADERS.SPEAKER_ZH, DIALOGUE_LINES_HEADERS.DIALOGUE_EN,
    DIALOGUE_LINES_HEADERS.DIALOGUE_ZH, DIALOGUE_LINES_HEADERS.START_TIME, DIALOGUE_LINES_HEADERS.END_TIME,
  ].forEach(function (h) { getColumn_(headerMap, h); });

  const lastRow = sheet.getLastRow();
  const bySceneId = {};
  if (lastRow < 2) return bySceneId;

  const rawRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const col = function (name) { return headerMap[name] - 1; };
  const seenLineIds = {}; // line_id -> spreadsheet row number it was first seen on

  rawRows.forEach(function (raw, i) {
    const sheetRow = i + 2; // data starts at row 2 (row 1 is the header)
    const sceneId = String(raw[col(DIALOGUE_LINES_HEADERS.SCENE_ID)] || "").trim();
    if (sceneId.length === 0) return; // a fully scene-less row is still allowed to be blank/spacer

    const lineId = String(raw[col(DIALOGUE_LINES_HEADERS.LINE_ID)] || "").trim();
    if (lineId.length === 0) {
      throw new ValidationError(
        'Dialogue_Lines row ' + sheetRow + ' (scene_id "' + sceneId + '") has no line_id. ' +
          "Every dialogue line needs a permanent line_id before it can sync — it is never generated " +
          "automatically from the row number, line_order, or text. Fill it in, then sync again."
      );
    }
    if (seenLineIds[lineId] !== undefined) {
      throw new ValidationError(
        'Dialogue_Lines row ' + sheetRow + ' uses line_id "' + lineId + '", which is already used by row ' +
          seenLineIds[lineId] + ". line_id must be unique across the whole tab, not just within one scene."
      );
    }
    seenLineIds[lineId] = sheetRow;

    const lineOrderRaw = raw[col(DIALOGUE_LINES_HEADERS.LINE_ORDER)];
    const lineOrder = Number(lineOrderRaw);
    const speaker = String(raw[col(DIALOGUE_LINES_HEADERS.SPEAKER)] || "").trim();
    const speakerZh = String(raw[col(DIALOGUE_LINES_HEADERS.SPEAKER_ZH)] || "").trim();
    const dialogueEn = String(raw[col(DIALOGUE_LINES_HEADERS.DIALOGUE_EN)] || "").trim();
    const dialogueZh = String(raw[col(DIALOGUE_LINES_HEADERS.DIALOGUE_ZH)] || "").trim();
    if (!Number.isFinite(lineOrder) || speaker.length === 0 || speakerZh.length === 0 ||
        dialogueEn.length === 0 || dialogueZh.length === 0) {
      throw new ValidationError(
        'Dialogue_Lines row ' + sheetRow + ' (line_id "' + lineId + '") is missing a required field ' +
          "(line_order, speaker, speaker_zh, dialogue_en, or dialogue_zh). Fill it in, then sync again."
      );
    }

    // Number(), not parseInt — parseInt("2.023") truncates to 2 and drops
    // the fractional seconds. Blank cell reads back as "" — Number("")
    // is 0, not NaN, so blank must be excluded before conversion or a
    // missing start_time would silently become "starts at 0".
    const rawStart = raw[col(DIALOGUE_LINES_HEADERS.START_TIME)];
    const rawEnd = raw[col(DIALOGUE_LINES_HEADERS.END_TIME)];
    const startTime = rawStart === "" || rawStart === null ? NaN : Number(rawStart);
    const endTime = rawEnd === "" || rawEnd === null ? NaN : Number(rawEnd);
    const hasValidTimecode = Number.isFinite(startTime) && Number.isFinite(endTime) && startTime >= 0 && endTime > startTime;

    const stepRaw = raw[col(DIALOGUE_LINES_HEADERS.STEP)];
    const step = stepRaw === "" || stepRaw === null || stepRaw === undefined ? null : Number(stepRaw);

    if (!bySceneId[sceneId]) bySceneId[sceneId] = [];
    bySceneId[sceneId].push({
      line_id: lineId,
      line_order: lineOrder,
      step: Number.isFinite(step) ? step : null,
      speaker: speaker,
      speaker_zh: speakerZh,
      dialogue_en: dialogueEn,
      dialogue_zh: dialogueZh,
      start_time: hasValidTimecode ? startTime : null,
      end_time: hasValidTimecode ? endTime : null,
    });
  });

  Object.keys(bySceneId).forEach(function (sceneId) {
    bySceneId[sceneId].sort(function (a, b) { return a.line_order - b.line_order; });
  });

  return bySceneId;
}

// ---------------------------------------------------------------------------
// Tips — read once, indexed by scene_id
// ---------------------------------------------------------------------------

function loadTipsBySceneId_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TIPS_SHEET_NAME);
  if (!sheet) {
    throw new ValidationError('Sheet "' + TIPS_SHEET_NAME + '" was not found in this spreadsheet.');
  }
  const headerMap = getHeaderMap_(sheet);
  [
    TIPS_HEADERS.SCENE_ID, TIPS_HEADERS.SORT_ORDER, TIPS_HEADERS.TITLE_EN,
    TIPS_HEADERS.TITLE_ZH, TIPS_HEADERS.BODY_EN, TIPS_HEADERS.BODY_ZH,
  ].forEach(function (h) { getColumn_(headerMap, h); });

  const lastRow = sheet.getLastRow();
  const bySceneId = {};
  if (lastRow < 2) return bySceneId;

  const rawRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const col = function (name) { return headerMap[name] - 1; };

  rawRows.forEach(function (raw) {
    const sceneId = String(raw[col(TIPS_HEADERS.SCENE_ID)] || "").trim();
    if (sceneId.length === 0) return;

    const sortOrderRaw = raw[col(TIPS_HEADERS.SORT_ORDER)];
    const sortOrder = sortOrderRaw === "" || sortOrderRaw === null ? 0 : Number(sortOrderRaw);
    const titleEn = String(raw[col(TIPS_HEADERS.TITLE_EN)] || "").trim();
    const titleZh = String(raw[col(TIPS_HEADERS.TITLE_ZH)] || "").trim();
    const bodyEn = String(raw[col(TIPS_HEADERS.BODY_EN)] || "").trim();
    const bodyZh = String(raw[col(TIPS_HEADERS.BODY_ZH)] || "").trim();
    if (titleEn.length === 0 || titleZh.length === 0 || bodyEn.length === 0 || bodyZh.length === 0) return;

    if (!bySceneId[sceneId]) bySceneId[sceneId] = [];
    // type/title/titleZh/body/bodyZh matches the Edge Function's existing
    // TipRow shape (supabase/functions/sync-scene/validation.ts) — "tip"
    // is a fixed literal there's no dedicated column for, same as the
    // Figma_Data script's convention.
    bySceneId[sceneId].push({
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      type: "tip",
      title: titleEn,
      titleZh: titleZh,
      body: bodyEn,
      bodyZh: bodyZh,
    });
  });

  Object.keys(bySceneId).forEach(function (sceneId) {
    bySceneId[sceneId].sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    bySceneId[sceneId].forEach(function (tip) { delete tip.sortOrder; });
  });

  return bySceneId;
}

// ---------------------------------------------------------------------------
// Payload assembly
// ---------------------------------------------------------------------------

/**
 * Deliberately does NOT set dialogue/expressions/vocabulary/subtitle_cues
 * on the payload object at all — not even to null. JSON.stringify drops
 * keys that were never assigned, so the Edge Function sees them as
 * "omitted" and leaves those columns untouched (see the header comment
 * at the top of this file and ScenePayloadRow in validation.ts).
 *
 * tips follows the same "omit means leave alone" rule as of this fix: an
 * earlier version always set `tips: tipsBySceneId[sceneId] || []`, so a
 * scene with no rows yet in the Tips sheet synced an explicit empty
 * array — which the Edge Function/RPC (at the time) treated as "clear
 * it", silently wiping any real tips already in Supabase (this is
 * exactly what happened to scene_001's 2 tips during the first
 * scenes-sync run). Only include the key when the Tips sheet actually
 * has at least one row for this scene_id.
 */
function buildPayload_(rowValues, dialogueLinesBySceneId, tipsBySceneId) {
  const sceneId = readText_(rowValues, SCENES_HEADERS.SCENE_ID);
  const coverImage = readText_(rowValues, SCENES_HEADERS.COVER_IMAGE);
  const pdfUrl = readText_(rowValues, SCENES_HEADERS.PDF_URL);
  const videoUrl = readText_(rowValues, SCENES_HEADERS.VIDEO_URL);
  const tipsForScene = tipsBySceneId[sceneId];

  const payload = {
    scene_id: sceneId,
    slug: readText_(rowValues, SCENES_HEADERS.SLUG),
    title_en: readText_(rowValues, SCENES_HEADERS.TITLE_EN),
    title_zh: readText_(rowValues, SCENES_HEADERS.TITLE_ZH),
    category: readText_(rowValues, SCENES_HEADERS.CATEGORY_EN),
    region: readText_(rowValues, SCENES_HEADERS.REGION),
    level: readText_(rowValues, SCENES_HEADERS.LEVEL),
    duration: readText_(rowValues, SCENES_HEADERS.DURATION),
    description: readText_(rowValues, SCENES_HEADERS.MISSION_EN),
    photo_url: coverImage.length === 0 ? null : coverImage,
    pdf_url: pdfUrl.length === 0 ? null : pdfUrl,
    video_url: videoUrl.length === 0 ? null : videoUrl,
    status: readText_(rowValues, SCENES_HEADERS.STATUS),
    sort_order: readSortOrder_(rowValues),
    scene_setup_en: readText_(rowValues, SCENES_HEADERS.SCENE_SETUP_EN) || null,
    scene_setup_zh: readText_(rowValues, SCENES_HEADERS.SCENE_SETUP_ZH) || null,
    learning_goal_en: readText_(rowValues, SCENES_HEADERS.LEARNING_GOAL_EN) || null,
    learning_goal_zh: readText_(rowValues, SCENES_HEADERS.LEARNING_GOAL_ZH) || null,
    dialogue_lines: dialogueLinesBySceneId[sceneId] || [],
  };
  if (tipsForScene && tipsForScene.length > 0) {
    payload.tips = tipsForScene;
  }

  return payload;
}

function readSortOrder_(rowValues) {
  const raw = rowValues[SCENES_HEADERS.SORT_ORDER];
  if (raw === null || raw === undefined || String(raw).trim().length === 0) return 0;
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new ValidationError('sort_order must be a whole number. Got: "' + raw + '".');
  }
  return num;
}

// ---------------------------------------------------------------------------
// HTTP call
// ---------------------------------------------------------------------------

function callSyncFunction_(config, payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + config.secret },
  };

  let response;
  try {
    response = UrlFetchApp.fetch(config.url, options);
  } catch (err) {
    return { success: false, message: "Could not reach the sync service. Check SYNC_FUNCTION_URL and try again." };
  }
  return parseSyncResponse_(response);
}

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
  const safe = typeof (body && body.message) === "string" ? body.message : null;
  if (isSuccess) {
    return { success: true, message: truncateMessage_(safe || "Scene synced successfully") };
  }
  return { success: false, message: truncateMessage_("HTTP " + status + (safe ? ": " + safe : " — sync failed.")) };
}

function truncateMessage_(message) {
  const MAX_LENGTH = 500;
  if (message.length <= MAX_LENGTH) return message;
  return message.slice(0, MAX_LENGTH - 3) + "...";
}

// ---------------------------------------------------------------------------
// Status writeback (Scenes row) + Sync_Log (append-only history)
// ---------------------------------------------------------------------------

function writeSyncStatus_(sheet, rowIndex, headerMap, update) {
  const statusCol = getColumn_(headerMap, SCENES_HEADERS.SYNC_STATUS);
  const messageCol = getColumn_(headerMap, SCENES_HEADERS.SYNC_MESSAGE);
  sheet.getRange(rowIndex, statusCol).setValue(update.status);
  sheet.getRange(rowIndex, messageCol).setValue(update.message);
  if (update.syncedAt) {
    const syncedAtCol = getColumn_(headerMap, SCENES_HEADERS.LAST_SYNCED_AT);
    sheet.getRange(rowIndex, syncedAtCol).setValue(update.syncedAt);
  }
}

/**
 * Appends one row per sync attempt — unlike the Scenes row's
 * sync_status/sync_message (which only ever show the latest state), this
 * tab keeps full history. Missing tab or headers fails soft (logged to
 * the Apps Script execution log, not surfaced as a user-facing alert) —
 * a logging problem should never be treated the same as a sync problem.
 */
function appendSyncLog_(sceneId, slug, action, result, message) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SYNC_LOG_SHEET_NAME);
    if (!sheet) return;
    sheet.appendRow([new Date(), sceneId, slug, action, result, truncateMessage_(message || "")]);
  } catch (err) {
    console.error("appendSyncLog_ failed", err);
  }
}

// ---------------------------------------------------------------------------
// Resource_Collections sync — separate tab, no row-selection step
// ---------------------------------------------------------------------------

/**
 * Syncs the "Resource_Collections" tab (multi-scene PDF packs shown on the
 * Resources page) to public.resource_collections via its OWN Edge Function
 * (sync-resource-collection) and its OWN Script Properties
 * (RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS) — never the sync-scene
 * function Scenes uses, which requires scene_id and would reject a
 * collection_id-only payload. callSyncFunction_/parseSyncResponse_/
 * truncateMessage_/describeError_/ValidationError are still reused
 * verbatim from the Scenes sync above (same request headers, same error
 * handling, same ui.alert() toast conventions) — only the config source
 * (readResourceCollectionsSyncConfig_ instead of readSyncConfig_) differs.
 *
 * Unlike Scenes, there is no row-selection step and no sync_status
 * precondition: every row whose collection_id cell is non-blank is synced
 * (see listResourceCollectionRows_ for how those rows are found).
 * collection_id is the permanent identity the Edge Function upserts
 * against (resource_collections.external_collection_id), so re-running
 * this never creates duplicates.
 */
function syncResourceCollections() {
  const ui = SpreadsheetApp.getUi();

  let sheet, headerMap, config, rowIndices;
  try {
    sheet = requireResourceCollectionsSheet_();
    headerMap = getHeaderMap_(sheet);
    config = readResourceCollectionsSyncConfig_();
    rowIndices = listResourceCollectionRows_(sheet, headerMap);
  } catch (err) {
    ui.alert("Sync not started", describeError_(err), ui.ButtonSet.OK);
    return;
  }

  if (rowIndices.length === 0) {
    ui.alert("Nothing to sync", 'No row on "' + RESOURCE_COLLECTIONS_SHEET_NAME + '" has a collection_id.', ui.ButtonSet.OK);
    return;
  }

  let synced = 0;
  let failed = 0;
  const failures = [];

  rowIndices.forEach(function (rowIndex) {
    const rowValues = getRowValues_(sheet, rowIndex, headerMap);

    let payload;
    try {
      payload = buildResourceCollectionPayload_(headerMap, rowValues);
    } catch (err) {
      const message = describeError_(err);
      failed++;
      failures.push("Row " + rowIndex + ": " + message);
      writeResourceCollectionStatus_(sheet, rowIndex, headerMap, { status: "Error", message: message });
      return;
    }

    writeResourceCollectionStatus_(sheet, rowIndex, headerMap, { status: "Syncing", message: "Sync started" });
    SpreadsheetApp.flush();

    const outcome = callSyncFunction_(config, payload);
    if (outcome.success) {
      synced++;
      const now = new Date();
      writeResourceCollectionStatus_(sheet, rowIndex, headerMap, { status: "Synced", message: outcome.message, syncedAt: now });
      writeResourceCollectionTimestamps_(sheet, rowIndex, headerMap, rowValues, now);
    } else {
      failed++;
      failures.push("Row " + rowIndex + ": " + outcome.message);
      writeResourceCollectionStatus_(sheet, rowIndex, headerMap, { status: "Error", message: outcome.message });
    }
  });

  const lines = [
    rowIndices.length + " row(s) with a collection_id checked.",
    synced + " synced, " + failed + " failed.",
  ];
  if (failures.length > 0) {
    lines.push("");
    lines.push("Failures:");
    failures.forEach(function (line) { lines.push(truncateMessage_(line)); });
  }
  ui.alert("Sync complete", lines.join("\n"), ui.ButtonSet.OK);
}

function requireResourceCollectionsSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESOURCE_COLLECTIONS_SHEET_NAME);
  if (!sheet) {
    throw new ValidationError('Sheet "' + RESOURCE_COLLECTIONS_SHEET_NAME + '" was not found in this spreadsheet.');
  }
  return sheet;
}

/**
 * Mirrors readSyncConfig_ above, but reads RESOURCE_COLLECTIONS_SCRIPT_
 * PROPERTY_KEYS instead — a distinct URL/secret pair pointed at the
 * sync-resource-collection Edge Function, never sync-scene's.
 */
function readResourceCollectionsSyncConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = (props.getProperty(RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS.FUNCTION_URL) || "").trim();
  const secret = (props.getProperty(RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS.SECRET) || "").trim();
  const missingKeys = [];
  if (url.length === 0) missingKeys.push(RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS.FUNCTION_URL);
  if (secret.length === 0) missingKeys.push(RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS.SECRET);
  if (missingKeys.length > 0) {
    throw new ValidationError("Resource Collections sync is not configured. Missing Script Properties: " + missingKeys.join(", ") + ".");
  }
  return { url: url, secret: secret };
}

/**
 * Only rows whose collection_id cell has actual non-blank text are
 * returned — read directly from just the collection_id column, not
 * inferred from sheet.getLastRow()/getLastColumn() across the whole row.
 * getLastRow() reports the last row touched by ANY cell in ANY column
 * (data-validation dropdowns, formatting, a stray value in an unrelated
 * column), so scanning every column of every row up to it — as the
 * previous version did — could report far more "rows checked" than there
 * are actual collection rows. Reading only the collection_id column and
 * filtering on it avoids that entirely.
 */
function listResourceCollectionRows_(sheet, headerMap) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const collectionIdCol = getColumn_(headerMap, RESOURCE_COLLECTIONS_HEADERS.COLLECTION_ID);
  const values = sheet.getRange(2, collectionIdCol, lastRow - 1, 1).getValues();

  const rows = [];
  values.forEach(function (row, i) {
    const raw = row[0];
    const text = raw === null || raw === undefined ? "" : String(raw).trim();
    if (text.length > 0) rows.push(i + 2); // +2: data starts at row 2, i is 0-based
  });
  return rows;
}

/**
 * Every field is read by header name (getColumn_ throws on a missing
 * header, same "fail loud" convention as buildPayload_ above, not a fixed
 * column position). price/scene_count/sort_order are converted to real JS
 * numbers, never left as numeric strings; blank cover_image_url/pdf_url
 * become null; created_at/updated_at, when present, are converted to ISO
 * 8601 strings (blank -> null). scene_ids is passed through as the sheet
 * cell's raw comma-separated text, never split into an array — see
 * resource_collections.scene_ids (a plain text column) in
 * supabase/migrations/0023_create_resource_collections.sql.
 */
function buildResourceCollectionPayload_(headerMap, rowValues) {
  [
    RESOURCE_COLLECTIONS_HEADERS.COLLECTION_ID, RESOURCE_COLLECTIONS_HEADERS.TITLE_EN,
    RESOURCE_COLLECTIONS_HEADERS.TITLE_ZH, RESOURCE_COLLECTIONS_HEADERS.DESCRIPTION_EN,
    RESOURCE_COLLECTIONS_HEADERS.DESCRIPTION_ZH, RESOURCE_COLLECTIONS_HEADERS.COLLECTION_TYPE,
    RESOURCE_COLLECTIONS_HEADERS.PRICE_TYPE, RESOURCE_COLLECTIONS_HEADERS.PRICE,
    RESOURCE_COLLECTIONS_HEADERS.COVER_IMAGE_URL, RESOURCE_COLLECTIONS_HEADERS.PDF_URL,
    RESOURCE_COLLECTIONS_HEADERS.SCENE_IDS, RESOURCE_COLLECTIONS_HEADERS.SCENE_COUNT,
    RESOURCE_COLLECTIONS_HEADERS.STATUS, RESOURCE_COLLECTIONS_HEADERS.SORT_ORDER,
    RESOURCE_COLLECTIONS_HEADERS.CREATED_AT, RESOURCE_COLLECTIONS_HEADERS.UPDATED_AT,
  ].forEach(function (h) { getColumn_(headerMap, h); });

  const coverImageUrl = readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.COVER_IMAGE_URL);
  const pdfUrl = readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.PDF_URL);

  return {
    collection_id: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.COLLECTION_ID),
    title_en: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.TITLE_EN),
    title_zh: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.TITLE_ZH),
    description_en: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.DESCRIPTION_EN),
    description_zh: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.DESCRIPTION_ZH),
    collection_type: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.COLLECTION_TYPE),
    price_type: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.PRICE_TYPE),
    price: readResourceCollectionNumber_(rowValues, RESOURCE_COLLECTIONS_HEADERS.PRICE, "price"),
    cover_image_url: coverImageUrl.length === 0 ? null : coverImageUrl,
    pdf_url: pdfUrl.length === 0 ? null : pdfUrl,
    scene_ids: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.SCENE_IDS),
    scene_count: readResourceCollectionInt_(rowValues, RESOURCE_COLLECTIONS_HEADERS.SCENE_COUNT, "scene_count"),
    status: readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.STATUS),
    sort_order: readResourceCollectionInt_(rowValues, RESOURCE_COLLECTIONS_HEADERS.SORT_ORDER, "sort_order"),
    created_at: readResourceCollectionIsoDate_(rowValues, RESOURCE_COLLECTIONS_HEADERS.CREATED_AT, "created_at"),
    updated_at: readResourceCollectionIsoDate_(rowValues, RESOURCE_COLLECTIONS_HEADERS.UPDATED_AT, "updated_at"),
  };
}

/** Blank -> null. Non-blank must be a real number (never coerced/clamped). */
function readResourceCollectionNumber_(rowValues, headerName, fieldLabel) {
  const raw = rowValues[headerName];
  if (raw === null || raw === undefined || String(raw).trim().length === 0) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new ValidationError('"' + fieldLabel + '" must be a number. Got: "' + raw + '".');
  }
  return num;
}

/** Blank -> 0. Non-blank must be a whole number. */
function readResourceCollectionInt_(rowValues, headerName, fieldLabel) {
  const num = readResourceCollectionNumber_(rowValues, headerName, fieldLabel);
  if (num === null) return 0;
  if (!Number.isInteger(num)) {
    throw new ValidationError('"' + fieldLabel + '" must be a whole number. Got: "' + num + '".');
  }
  return num;
}

/**
 * Blank -> null. A Date (as Sheets returns for a date-formatted cell) or a
 * parseable date/timestamp string both convert to a proper ISO 8601 string
 * — never sent through as a raw Sheets-formatted string.
 */
function readResourceCollectionIsoDate_(rowValues, headerName, fieldLabel) {
  const raw = rowValues[headerName];
  if (raw === null || raw === undefined || String(raw).trim().length === 0) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(date.getTime())) {
    throw new ValidationError('"' + fieldLabel + '" must be a valid date. Got: "' + raw + '".');
  }
  return date.toISOString();
}

/** Mirrors writeSyncStatus_ above, scoped to Resource_Collections' own sync_status/sync_message/last_synced_at columns. */
function writeResourceCollectionStatus_(sheet, rowIndex, headerMap, update) {
  const statusCol = getColumn_(headerMap, RESOURCE_COLLECTIONS_HEADERS.SYNC_STATUS);
  const messageCol = getColumn_(headerMap, RESOURCE_COLLECTIONS_HEADERS.SYNC_MESSAGE);
  sheet.getRange(rowIndex, statusCol).setValue(update.status);
  sheet.getRange(rowIndex, messageCol).setValue(update.message);
  if (update.syncedAt) {
    const syncedAtCol = getColumn_(headerMap, RESOURCE_COLLECTIONS_HEADERS.LAST_SYNCED_AT);
    sheet.getRange(rowIndex, syncedAtCol).setValue(update.syncedAt); // Date object, not a formatted string
  }
}

/**
 * Mirrors the database's own created_at/updated_at back into the sheet.
 * created_at is only ever written once, the first time a row is
 * successfully synced with that cell blank; updated_at is refreshed on
 * every successful sync.
 */
function writeResourceCollectionTimestamps_(sheet, rowIndex, headerMap, rowValues, syncedAt) {
  const createdAtCol = getColumn_(headerMap, RESOURCE_COLLECTIONS_HEADERS.CREATED_AT);
  if (readText_(rowValues, RESOURCE_COLLECTIONS_HEADERS.CREATED_AT).length === 0) {
    sheet.getRange(rowIndex, createdAtCol).setValue(syncedAt);
  }
  const updatedAtCol = getColumn_(headerMap, RESOURCE_COLLECTIONS_HEADERS.UPDATED_AT);
  sheet.getRange(rowIndex, updatedAtCol).setValue(syncedAt);
}
