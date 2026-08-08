// Phase A-0 logic verification — REVISED after external audit.
//
// ============================================================================
// READ THIS FIRST: what kind of tests these actually are
// ============================================================================
// These are JAVASCRIPT LOGIC SIMULATION tests. They are NOT:
//   - real SQL tests (nothing here executes against Postgres)
//   - real TypeScript / Edge Function tests (nothing here runs Deno or
//     imports supabase/functions/sync-scene/*.ts directly)
//   - integration tests of any kind
//
// What they actually do: re-implement, in plain Node, the exact decision
// logic written in supabase/migrations/0014, 0015, 0018, 0019, and (for
// the input-validation section) supabase/functions/sync-scene/validation.ts
// — kept in lockstep by hand — and assert against that re-implementation.
// This can prove the DESIGN is internally consistent (the rules don't
// contradict each other, the edge cases resolve the way they're documented
// to). It CANNOT prove the actual .sql files are syntactically valid, that
// they run against a real Postgres instance, that `jsonb_array_elements`
// behaves the way this file assumes, that the DEFERRABLE constraint
// actually defers the way commented, or that the real Edge Function wires
// requests through correctly.
//
// THERE IS NO REAL POSTGRES INTEGRATION TEST for any of this. That has not
// been run, because doing so would require executing a migration and/or
// deploying the Edge Function against a real database, both explicitly out
// of scope for this phase. This is a real, acknowledged gap — not
// something these simulation tests substitute for or paper over.
//
// There is still no test runner wired into this project (no vitest/jest in
// package.json, no `npm test` script, no local Deno) — same infra gap
// noted in the previous round.
// ============================================================================

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log("PASS:", name);
  } else {
    fail++;
    console.log("FAIL:", name, detail !== undefined ? "-- " + detail : "");
  }
}
function throwsMsg(name, fn, expectedSubstring) {
  try {
    fn();
    fail++;
    console.log("FAIL:", name, "-- expected to throw, did not");
  } catch (e) {
    if (expectedSubstring && !String(e.message).includes(expectedSubstring)) {
      fail++;
      console.log("FAIL:", name, `-- threw but message did not contain "${expectedSubstring}": ${e.message}`);
    } else {
      pass++;
      console.log("PASS:", name);
    }
  }
}

// ============================================================================
// SECTION 1 — Edge-Function input-validation layer
// Re-implemented from supabase/functions/sync-scene/validation.ts
// (SyncError -> plain Error; logic otherwise unchanged)
// ============================================================================
class SyncError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SyncError(400, `Field "${field}" is required and must be a non-empty string.`);
  }
  return value.trim();
}
function requireObjectItem(item, field, index) {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new SyncError(400, `Field "${field}[${index}]" must be an object.`);
  }
  return item;
}
function normalizeTimecode(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function validateDialogueLines(value) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new SyncError(400, `Field "dialogue_lines" must be an array.`);
  const lines = [];
  const seen = new Set();
  value.forEach((raw, i) => {
    const item = requireObjectItem(raw, "dialogue_lines", i);
    const externalLineId = requireNonEmptyString(item.line_id, `dialogue_lines[${i}].line_id`);
    if (seen.has(externalLineId)) throw new SyncError(400, `Field "dialogue_lines" contains a duplicate line_id "${externalLineId}"`);
    seen.add(externalLineId);
    const lineOrder = Number(item.line_order);
    if (!Number.isFinite(lineOrder) || !Number.isInteger(lineOrder) || lineOrder <= 0) {
      throw new SyncError(400, `dialogue_lines[${i}].line_order must be a positive integer.`);
    }
    const speaker = requireNonEmptyString(item.speaker, `dialogue_lines[${i}].speaker`);
    const speakerZh = requireNonEmptyString(item.speaker_zh, `dialogue_lines[${i}].speaker_zh`);
    const dialogueEn = requireNonEmptyString(item.dialogue_en, `dialogue_lines[${i}].dialogue_en`);
    const dialogueZh = requireNonEmptyString(item.dialogue_zh, `dialogue_lines[${i}].dialogue_zh`);
    const start = normalizeTimecode(item.start_time);
    const end = normalizeTimecode(item.end_time);
    const step = item.step === null || item.step === undefined || item.step === "" ? null : Number(item.step);
    lines.push({
      external_line_id: externalLineId, line_order: lineOrder, step: Number.isFinite(step) ? step : null,
      speaker, speaker_zh: speakerZh, dialogue_en: dialogueEn, dialogue_zh: dialogueZh,
      start_time: start, end_time: end,
    });
  });
  return lines;
}
function requireExternalSceneId(value) { return requireNonEmptyString(value, "scene_id"); }

console.log("=== SECTION 1: Edge-Function validation.ts re-implementation ===");
throwsMsg("missing scene_id fails", () => requireExternalSceneId(undefined), "scene_id");
throwsMsg("blank scene_id fails", () => requireExternalSceneId("   "), "scene_id");
check("valid scene_id passes", requireExternalSceneId("scene_001") === "scene_001");
throwsMsg("missing line_id in a dialogue_lines row fails", () =>
  validateDialogueLines([{ line_order: 1, speaker: "A", speaker_zh: "甲", dialogue_en: "hi", dialogue_zh: "嗨" }]), "line_id");
throwsMsg("duplicate line_id within one request fails (validation layer)", () =>
  validateDialogueLines([
    { line_id: "L1", line_order: 1, speaker: "A", speaker_zh: "甲", dialogue_en: "hi", dialogue_zh: "嗨" },
    { line_id: "L1", line_order: 2, speaker: "B", speaker_zh: "乙", dialogue_en: "yo", dialogue_zh: "喂" },
  ]), "duplicate line_id");
check("undefined dialogue_lines means 'don't touch'", validateDialogueLines(undefined) === undefined);
check("empty array dialogue_lines preserved as []", Array.isArray(validateDialogueLines([])) && validateDialogueLines([]).length === 0);

// ============================================================================
// SECTION 2 — Adoption-migration validation logic
// Re-implemented from the DO $$ ... $$ blocks in
// 0014_adopt_scene_external_ids.sql and
// 0015_adopt_dialogue_line_external_ids.sql
// ============================================================================
console.log("\n=== SECTION 2: adoption-migration (0014/0015) validation re-implementation ===");

// Mirrors 0014's DO block. Throws on the first violated invariant;
// otherwise returns the slug -> external_scene_id map that would be
// applied.
function simulateSceneAdoptionMigration(existingScenes, mapping) {
  const todo = mapping.filter(m => m.external_scene_id === "TODO_CONFIRM");
  if (todo.length > 0) throw new Error(`ABORTED: ${todo.length} row(s) still have TODO_CONFIRM`);

  for (const m of mapping) {
    if (!existingScenes.some(s => s.slug === m.slug)) {
      throw new Error(`ABORTED: mapping references slug "${m.slug}" which does not exist`);
    }
  }
  for (const s of existingScenes) {
    if (!mapping.some(m => m.slug === s.slug)) {
      throw new Error(`ABORTED: public.scenes.slug "${s.slug}" has no entry in the mapping`);
    }
  }
  const idCounts = new Map();
  for (const m of mapping) idCounts.set(m.external_scene_id, (idCounts.get(m.external_scene_id) || 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) throw new Error(`ABORTED: mapping assigns external_scene_id "${id}" to more than one slug`);
  }
  for (const m of mapping) {
    const owner = existingScenes.find(s => s.external_scene_id === m.external_scene_id);
    const target = existingScenes.find(s => s.slug === m.slug);
    if (owner && target && owner.id !== target.id) {
      throw new Error(`ABORTED: external_scene_id "${m.external_scene_id}" is already assigned to a different scene`);
    }
  }
  // PERMANENCE: a scene whose external_scene_id is already non-null and
  // different from the mapped value aborts the WHOLE migration — mirrors
  // the DO block's new check in 0014_adopt_scene_external_ids.sql.
  for (const m of mapping) {
    const target = existingScenes.find(s => s.slug === m.slug);
    if (target && target.external_scene_id != null && target.external_scene_id !== m.external_scene_id) {
      throw new Error(`ABORTED: scene "${m.slug}" already has a permanent external_scene_id "${target.external_scene_id}" — tried to change it to "${m.external_scene_id}"`);
    }
  }
  // Final write is scoped to external_scene_id IS NULL only — a row
  // already equal to the mapped value is a safe no-op, not rewritten.
  return mapping
    .filter(m => {
      const target = existingScenes.find(s => s.slug === m.slug);
      return target && target.external_scene_id == null;
    })
    .map(m => ({ slug: m.slug, external_scene_id: m.external_scene_id }));
}

// Mirrors 0015's DO block, same shape, keyed by dialogue_lines.id.
function simulateLineAdoptionMigration(existingLines, mapping) {
  const todo = mapping.filter(m => m.external_line_id === "TODO_CONFIRM");
  if (todo.length > 0) throw new Error(`ABORTED: ${todo.length} row(s) still have TODO_CONFIRM`);

  for (const m of mapping) {
    if (!existingLines.some(l => l.id === m.dialogue_line_id)) {
      throw new Error(`ABORTED: mapping references dialogue_lines.id ${m.dialogue_line_id} which does not exist`);
    }
  }
  for (const l of existingLines) {
    if (l.external_line_id == null && !mapping.some(m => m.dialogue_line_id === l.id)) {
      throw new Error(`ABORTED: dialogue_lines.id ${l.id} has no external_line_id and no entry in the mapping`);
    }
  }
  const idCounts = new Map();
  for (const m of mapping) idCounts.set(m.external_line_id, (idCounts.get(m.external_line_id) || 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) throw new Error(`ABORTED: mapping assigns external_line_id "${id}" to more than one row`);
  }
  // PERMANENCE: mirrors 0015_adopt_dialogue_line_external_ids.sql's new check.
  for (const m of mapping) {
    const target = existingLines.find(l => l.id === m.dialogue_line_id);
    if (target && target.external_line_id != null && target.external_line_id !== m.external_line_id) {
      throw new Error(`ABORTED: dialogue_lines.id ${m.dialogue_line_id} already has a permanent external_line_id "${target.external_line_id}" — tried to change it to "${m.external_line_id}"`);
    }
  }
  // Final write scoped to external_line_id IS NULL only.
  return mapping
    .filter(m => {
      const target = existingLines.find(l => l.id === m.dialogue_line_id);
      return target && target.external_line_id == null;
    })
    .map(m => ({ dialogue_line_id: m.dialogue_line_id, external_line_id: m.external_line_id }));
}

// #9a: mapping missing an entry for an existing scene -> whole migration fails
{
  const scenes = [{ id: 28, slug: "shopping-for-clothes", external_scene_id: null }, { id: 40, slug: "getting-a-dental-filling", external_scene_id: null }];
  throwsMsg("#9a scene adoption: missing coverage for an existing scene fails entirely",
    () => simulateSceneAdoptionMigration(scenes, [{ slug: "shopping-for-clothes", external_scene_id: "scene_001" }]),
    "has no entry in the mapping");
}
// #9b: duplicate proposed external_scene_id -> fails entirely
{
  const scenes = [{ id: 28, slug: "shopping-for-clothes", external_scene_id: null }, { id: 40, slug: "getting-a-dental-filling", external_scene_id: null }];
  throwsMsg("#9b scene adoption: duplicate proposed external_scene_id fails entirely",
    () => simulateSceneAdoptionMigration(scenes, [
      { slug: "shopping-for-clothes", external_scene_id: "scene_DUP" },
      { slug: "getting-a-dental-filling", external_scene_id: "scene_DUP" },
    ]), "more than one slug");
}
// #9c: mapping references a slug that doesn't exist -> fails entirely
{
  const scenes = [{ id: 28, slug: "shopping-for-clothes", external_scene_id: null }];
  throwsMsg("#9c scene adoption: mapping references nonexistent slug fails entirely",
    () => simulateSceneAdoptionMigration(scenes, [
      { slug: "shopping-for-clothes", external_scene_id: "scene_001" },
      { slug: "this-slug-does-not-exist", external_scene_id: "scene_999" },
    ]), "does not exist");
}
// #9d: line adoption mapping references a dialogue_lines.id that doesn't exist -> fails entirely
{
  const lines = [{ id: 1, external_line_id: null }, { id: 2, external_line_id: null }];
  throwsMsg("#9d line adoption: mapping references nonexistent dialogue_lines.id fails entirely",
    () => simulateLineAdoptionMigration(lines, [
      { dialogue_line_id: 1, external_line_id: "L1" },
      { dialogue_line_id: 2, external_line_id: "L2" },
      { dialogue_line_id: 999, external_line_id: "L999" },
    ]), "does not exist");
}
// #9e: line adoption with an unconfirmed TODO left in -> fails entirely
{
  const lines = [{ id: 1, external_line_id: null }];
  throwsMsg("#9e line adoption: any remaining TODO_CONFIRM aborts entirely",
    () => simulateLineAdoptionMigration(lines, [{ dialogue_line_id: 1, external_line_id: "TODO_CONFIRM" }]),
    "TODO_CONFIRM");
}

// --- PERMANENCE: adoption must never overwrite an already-established id ---
{
  const scenes = [{ id: 28, slug: "shopping-for-clothes", external_scene_id: "scene_001" }, { id: 40, slug: "getting-a-dental-filling", external_scene_id: null }];
  throwsMsg("scene adoption: already-confirmed scene_001 cannot be remapped to scene_099, whole migration fails",
    () => simulateSceneAdoptionMigration(scenes, [
      { slug: "shopping-for-clothes", external_scene_id: "scene_099" },
      { slug: "getting-a-dental-filling", external_scene_id: "scene_013" },
    ]), 'already has a permanent external_scene_id "scene_001"');
  // and the row is provably untouched by the attempt
  check("scene adoption: rejected remap left the original external_scene_id in place",
    scenes[0].external_scene_id === "scene_001");
}
{
  const lines = [{ id: 1, external_line_id: "line_001" }, { id: 2, external_line_id: null }];
  throwsMsg("line adoption: already-confirmed line_001 cannot be remapped to line_099, whole migration fails",
    () => simulateLineAdoptionMigration(lines, [
      { dialogue_line_id: 1, external_line_id: "line_099" },
      { dialogue_line_id: 2, external_line_id: "line_002" },
    ]), 'already has a permanent external_line_id "line_001"');
  check("line adoption: rejected remap left the original external_line_id in place",
    lines[0].external_line_id === "line_001");
}

// --- safe rerun: identical mapping succeeds and changes nothing ---
{
  const scenes = [{ id: 28, slug: "shopping-for-clothes", external_scene_id: "scene_001" }, { id: 40, slug: "getting-a-dental-filling", external_scene_id: "scene_013" }];
  const applied = simulateSceneAdoptionMigration(scenes, [
    { slug: "shopping-for-clothes", external_scene_id: "scene_001" },
    { slug: "getting-a-dental-filling", external_scene_id: "scene_013" },
  ]);
  check("scene adoption: rerunning with the exact same mapping succeeds and writes nothing (both rows already match, filtered out by the IS NULL scoping)",
    applied.length === 0);
}
{
  const lines = [{ id: 1, external_line_id: "line_001" }, { id: 2, external_line_id: "line_002" }];
  const applied = simulateLineAdoptionMigration(lines, [
    { dialogue_line_id: 1, external_line_id: "line_001" },
    { dialogue_line_id: 2, external_line_id: "line_002" },
  ]);
  check("line adoption: rerunning with the exact same mapping succeeds and writes nothing",
    applied.length === 0);
}
// success path, both adoption migrations
{
  const scenes = [{ id: 28, slug: "shopping-for-clothes", external_scene_id: null }, { id: 40, slug: "getting-a-dental-filling", external_scene_id: null }];
  const applied = simulateSceneAdoptionMigration(scenes, [
    { slug: "shopping-for-clothes", external_scene_id: "scene_001" },
    { slug: "getting-a-dental-filling", external_scene_id: "scene_013" },
  ]);
  check("scene adoption: fully-covered, non-duplicate mapping succeeds", applied.length === 2);
}

// ============================================================================
// SECTION 3 — sync_scene_with_dialogue_lines simulation
// Re-implemented from supabase/migrations/0019_sync_scene_rpc.sql
// ============================================================================
console.log("\n=== SECTION 3: sync_scene_with_dialogue_lines (0019) simulation ===");

function freshState() {
  return { nextSceneId: 1, nextLineId: 1, scenes: [], dialogueLines: [] };
}

// Isolated diff-apply step (WHERE-guarded upsert + RETURNING-style
// ownership verification + NULL-inclusive prune + final-state uniqueness
// check) — pulled out as its own function so it can be unit tested
// independent of the unmapped-legacy guard and the fast pre-check that
// gate it in the real RPC (see simulateSyncRpc below, which calls this
// after both, exactly like 0019 does). Deliberately does NOT go through
// simulateSyncRpc's own pre-check, so tests calling this function
// directly are exercising ONLY the write-time guard — the mechanism that
// actually matters once two requests race (see the concurrency section
// below and its disclaimer about what this can and cannot prove).
//
// Models the fixed upsert from 0019 exactly:
//   - an existing row is only updated in place if it already belongs to
//     `sceneId` (mirrors `on conflict (...) do update ... where
//     dialogue_lines.scene_id = v_scene_id`) — scene_id itself is never
//     reassigned by the update arm, only ever set once at insert time.
//   - a row that "conflicts" but belongs to a DIFFERENT scene is left
//     completely untouched (mirrors the WHERE clause simply not
//     matching, which is not an error by itself in Postgres).
//   - every submitted external_line_id is then checked against what was
//     actually written under `sceneId` (mirrors the RETURNING-based
//     verification) — anything not written throws
//     line_id_owned_by_other_scene, so a silently-skipped write is never
//     mistaken for success.
function applyDialogueLinesDiff(existingLines, sceneId, submittedLines, nextLineIdStart) {
  const working = existingLines.map(l => ({ ...l }));
  let nextLineIdLocal = nextLineIdStart;
  const writtenIds = new Set();
  for (const l of submittedLines) {
    const existing = working.find(x => x.external_line_id === l.external_line_id);
    if (existing) {
      if (existing.scene_id === sceneId) {
        Object.assign(existing, l); // scene_id intentionally never reassigned
        writtenIds.add(l.external_line_id);
      }
      // else: WHERE guard fails — row left untouched, NOT added to writtenIds
    } else {
      working.push({ id: nextLineIdLocal++, scene_id: sceneId, ...l });
      writtenIds.add(l.external_line_id);
    }
  }
  for (const l of submittedLines) {
    if (!writtenIds.has(l.external_line_id)) {
      throw new Error(`line_id_owned_by_other_scene: "${l.external_line_id}" was not written under scene ${sceneId} (write-time guard — detected via RETURNING-equivalent check, not the pre-check)`);
    }
  }
  const submittedIds = new Set(submittedLines.map(l => l.external_line_id));
  // NULL-inclusive prune — the actual fix. Mirrors the SQL:
  //   where scene_id = v_scene_id
  //     and (external_line_id is null or external_line_id <> all (...))
  const finalLines = working.filter(l =>
    l.scene_id !== sceneId ||
    (l.external_line_id != null && submittedIds.has(l.external_line_id))
  );
  // Deferred-constraint-style check: only the FINAL state's uniqueness
  // matters, not any intermediate state during the upsert above — mirrors
  // dialogue_lines_scene_id_line_order_key being DEFERRABLE INITIALLY
  // DEFERRED as of 0018.
  const seenOrders = new Set();
  for (const l of finalLines) {
    if (l.scene_id !== sceneId) continue;
    if (seenOrders.has(l.line_order)) {
      throw new Error(`unique_violation: (scene_id, line_order) collision at line_order ${l.line_order}`);
    }
    seenOrders.add(l.line_order);
  }
  return { finalLines, nextLineIdLocal };
}

function simulateSyncRpc(state, params) {
  const { external_scene_id, slug, status, optional_fields, dialogue_lines } = params;
  if (!external_scene_id || !external_scene_id.trim()) throw new Error("missing_external_scene_id");
  if (!slug || !slug.trim()) throw new Error("missing_slug");

  const scenesCopy = state.scenes.map(s => ({ ...s }));
  const linesCopy = state.dialogueLines.map(l => ({ ...l }));

  let scene = scenesCopy.find(s => s.external_scene_id === external_scene_id);
  let action, sceneId;

  if (!scene) {
    const conflict = scenesCopy.find(s => s.slug === slug);
    if (conflict) throw new Error(`slug_conflict: slug "${slug}" already used by database id ${conflict.id}`);
    sceneId = state.nextSceneId;
    scene = { id: sceneId, external_scene_id, slug, status, ...optional_fields };
    scenesCopy.push(scene);
    action = "inserted";
  } else {
    const conflict = scenesCopy.find(s => s.slug === slug && s.id !== scene.id);
    if (conflict) throw new Error(`slug_conflict: slug "${slug}" already used by database id ${conflict.id}`);
    scene.slug = slug;
    scene.status = status;
    Object.assign(scene, optional_fields);
    sceneId = scene.id;
    action = "updated";
  }

  let finalLines = linesCopy;
  let nextLineIdLocal = state.nextLineId;

  if (dialogue_lines !== undefined) {
    const unmappedCount = linesCopy.filter(l => l.scene_id === sceneId && l.external_line_id == null).length;
    if (unmappedCount > 0) {
      throw new Error(`unmapped_legacy_dialogue_lines: scene "${external_scene_id}" still has ${unmappedCount} row(s) with no external_line_id`);
    }

    if (dialogue_lines.length === 0) {
      if (status === "published") throw new Error(`empty_dialogue_rejected: scene "${external_scene_id}" is published`);
      finalLines = linesCopy.filter(l => l.scene_id !== sceneId);
    } else {
      const ids = dialogue_lines.map(l => l.external_line_id);
      if (new Set(ids).size !== ids.length) throw new Error(`duplicate_line_id: request for "${external_scene_id}" has duplicates`);
      for (const l of dialogue_lines) {
        const owner = linesCopy.find(x => x.external_line_id === l.external_line_id);
        if (owner && owner.scene_id !== sceneId) {
          throw new Error(`line_id_owned_by_other_scene: "${l.external_line_id}" belongs to scene ${owner.scene_id}`);
        }
      }
      const result = applyDialogueLinesDiff(linesCopy, sceneId, dialogue_lines, nextLineIdLocal);
      finalLines = result.finalLines;
      nextLineIdLocal = result.nextLineIdLocal;
    }
  }

  state.scenes = scenesCopy;
  state.dialogueLines = finalLines;
  if (action === "inserted") state.nextSceneId++;
  state.nextLineId = nextLineIdLocal;
  return { scene_id: sceneId, action };
}

// The OLD, rejected design: scenes can carry a placeholder
// external_scene_id, and (crucially) this is the SAME matching logic as
// simulateSyncRpc — the bug was never in the RPC's matching, it was in
// letting 0014 (the old version) put a scene into a broken state by
// assigning it a placeholder instead of leaving it unmapped until a real
// value was confirmed. This function just documents/reproduces that
// broken PRE-STATE for the contrast test below; the sync call itself
// reuses the real (also unchanged-in-this-regard) simulateSyncRpc.
function applyOldFlawedPlaceholderBackfill(scenes) {
  return scenes.map(s => ({ ...s, external_scene_id: s.external_scene_id ?? `scene_${String(s.id).padStart(3, "0")}` }));
}

// --- #1: old design's placeholder scheme fails on the first real sync ---
{
  const st = freshState();
  st.scenes.push({ id: 28, slug: "shopping-for-clothes", status: "published", external_scene_id: null });
  st.nextSceneId = 29;
  st.scenes = applyOldFlawedPlaceholderBackfill(st.scenes); // -> external_scene_id = "scene_028"
  let threw = false;
  try {
    // Sheet's first REAL submission uses "scene_001", same slug
    simulateSyncRpc(st, { external_scene_id: "scene_001", slug: "shopping-for-clothes", status: "published", optional_fields: {}, dialogue_lines: undefined });
  } catch (e) {
    threw = /slug_conflict/.test(e.message);
  }
  check("#1 REJECTED DESIGN: placeholder external_scene_id causes the first real-scene_id sync to fail with slug_conflict (proves the old design was broken, not a demonstration of current behavior)",
    threw);
}

// --- #2: explicit human-confirmed adoption, then real scene_id updates correctly ---
{
  const st = freshState();
  st.scenes.push({ id: 28, slug: "shopping-for-clothes", status: "published", external_scene_id: null });
  st.nextSceneId = 29;
  // Simulates 0014 (NEW version) actually applying a confirmed mapping —
  // direct assignment, no placeholder ever existed.
  st.scenes[0].external_scene_id = "scene_001";
  simulateSyncRpc(st, { external_scene_id: "scene_001", slug: "shopping-for-clothes", status: "published", optional_fields: { description: "v2" }, dialogue_lines: undefined });
  check("#2 after explicit adoption, syncing with the real scene_id updates the SAME scene (still 1 row, still id 28)",
    st.scenes.length === 1 && st.scenes[0].id === 28 && st.scenes[0].description === "v2");
}

// --- swap test: L1 1->2, L2 2->1 ---
{
  const existing = [
    { id: 101, scene_id: 28, external_line_id: "L1", line_order: 1 },
    { id: 102, scene_id: 28, external_line_id: "L2", line_order: 2 },
  ];
  const { finalLines } = applyDialogueLinesDiff(existing, 28, [
    { external_line_id: "L1", line_order: 2, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "a", dialogue_zh: "啊", start_time: null, end_time: null },
    { external_line_id: "L2", line_order: 1, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
  ], 200);
  const l1 = finalLines.find(l => l.external_line_id === "L1");
  const l2 = finalLines.find(l => l.external_line_id === "L2");
  check("#swap two-line line_order swap (1<->2) succeeds in one call",
    l1.line_order === 2 && l2.line_order === 1);
  check("#swap internal ids unchanged after swap", l1.id === 101 && l2.id === 102);
}

// --- 3-line cycle: L1 1->2, L2 2->3, L3 3->1 ---
{
  const existing = [
    { id: 201, scene_id: 28, external_line_id: "L1", line_order: 1 },
    { id: 202, scene_id: 28, external_line_id: "L2", line_order: 2 },
    { id: 203, scene_id: 28, external_line_id: "L3", line_order: 3 },
  ];
  const { finalLines } = applyDialogueLinesDiff(existing, 28, [
    { external_line_id: "L1", line_order: 2, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "a", dialogue_zh: "啊", start_time: null, end_time: null },
    { external_line_id: "L2", line_order: 3, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
    { external_line_id: "L3", line_order: 1, step: null, speaker: "C", speaker_zh: "丙", dialogue_en: "c", dialogue_zh: "呲", start_time: null, end_time: null },
  ], 300);
  const byId = Object.fromEntries(finalLines.map(l => [l.external_line_id, l]));
  check("#cycle three-line cyclic reorder (1->2->3->1) succeeds in one call",
    byId.L1.line_order === 2 && byId.L2.line_order === 3 && byId.L3.line_order === 1);
  check("#cycle internal ids unchanged after cyclic reorder",
    byId.L1.id === 201 && byId.L2.id === 202 && byId.L3.id === 203);
}

// --- a genuinely broken reorder (two lines end up sharing a line_order) still fails ---
{
  const existing = [
    { id: 301, scene_id: 28, external_line_id: "L1", line_order: 1 },
    { id: 302, scene_id: 28, external_line_id: "L2", line_order: 2 },
  ];
  throwsMsg("#swap a genuine final-state collision (both lines submitted with line_order=1) still fails, deferred checking isn't a loophole",
    () => applyDialogueLinesDiff(existing, 28, [
      { external_line_id: "L1", line_order: 1, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "a", dialogue_zh: "啊", start_time: null, end_time: null },
      { external_line_id: "L2", line_order: 1, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
    ], 400),
    "unique_violation");
}

// --- NULL-inclusive prune correctness (isolated from the guard) ---
{
  const existing = [
    { id: 401, scene_id: 28, external_line_id: null, line_order: 1 }, // legacy, unmapped
    { id: 402, scene_id: 28, external_line_id: "L2", line_order: 2 },
  ];
  const { finalLines } = applyDialogueLinesDiff(existing, 28, [
    { external_line_id: "L2", line_order: 1, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
  ], 500);
  check("#null-prune a pre-existing NULL external_line_id row is actually removed by the prune (old `<> all(...)` alone would have kept it forever)",
    finalLines.filter(l => l.scene_id === 28).length === 1 && finalLines[0].external_line_id === "L2");
}

// --- unmapped-legacy guard blocks a scene with any NULL row, even an empty submission ---
{
  const st = freshState();
  const sceneId = 28;
  st.scenes.push({ id: sceneId, external_scene_id: "scene_001", slug: "shopping-for-clothes", status: "published" });
  st.nextSceneId = 29;
  for (let i = 1; i <= 18; i++) st.dialogueLines.push({ id: 1000 + i, scene_id: sceneId, external_line_id: null, line_order: i });

  let threw1 = false;
  try {
    simulateSyncRpc(st, {
      external_scene_id: "scene_001", slug: "shopping-for-clothes", status: "published", optional_fields: {},
      dialogue_lines: [{ external_line_id: "REAL-L1", line_order: 1, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "hi", dialogue_zh: "嗨", start_time: null, end_time: null }],
    });
  } catch (e) { threw1 = /unmapped_legacy_dialogue_lines/.test(e.message); }
  check("#7 first sync attempt on scene with unmapped legacy dialogue_lines fails outright (unmapped_legacy_dialogue_lines), before touching any row",
    threw1 && st.dialogueLines.filter(l => l.scene_id === sceneId).length === 18);

  let threw2 = false;
  try {
    simulateSyncRpc(st, { external_scene_id: "scene_001", slug: "shopping-for-clothes", status: "published", optional_fields: {}, dialogue_lines: [] });
  } catch (e) { threw2 = /unmapped_legacy_dialogue_lines/.test(e.message); }
  check("#7b the guard also blocks an EMPTY dialogue_lines submission, not just a non-empty one",
    threw2 && st.dialogueLines.filter(l => l.scene_id === sceneId).length === 18);

  // --- #8: after adoption (simulated by directly setting external_line_id
  // on all 18, mirroring what 0015 would do), the first full sync succeeds ---
  st.dialogueLines.forEach((l, i) => { l.external_line_id = "REAL-L" + (i + 1); });
  simulateSyncRpc(st, {
    external_scene_id: "scene_001", slug: "shopping-for-clothes", status: "published", optional_fields: {},
    dialogue_lines: st.dialogueLines.map(l => ({
      external_line_id: l.external_line_id, line_order: l.line_order, step: null,
      speaker: "A", speaker_zh: "甲", dialogue_en: "hi", dialogue_zh: "嗨", start_time: null, end_time: null,
    })),
  });
  check("#8 after adoption, the first full sync succeeds and all 18 lines survive with their identities",
    st.dialogueLines.filter(l => l.scene_id === sceneId).length === 18 &&
    st.dialogueLines.every(l => l.external_line_id && l.external_line_id.startsWith("REAL-L")));
}

// --- #6 (renumbered from previous round): insert doesn't disturb other lines ---
{
  const existing = [{ id: 501, scene_id: 28, external_line_id: "L1", line_order: 1 }];
  const { finalLines } = applyDialogueLinesDiff(existing, 28, [
    { external_line_id: "L1", line_order: 1, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "hi", dialogue_zh: "嗨", start_time: null, end_time: null },
    { external_line_id: "L2", line_order: 2, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "yo", dialogue_zh: "喂", start_time: null, end_time: null },
  ], 600);
  const l1 = finalLines.find(l => l.external_line_id === "L1");
  check("inserting a new line leaves the existing line's internal id untouched", l1.id === 501);
}

// --- delete removes only the targeted line, never another scene's rows ---
{
  const existing = [
    { id: 701, scene_id: 28, external_line_id: "L1", line_order: 1 },
    { id: 702, scene_id: 28, external_line_id: "L2", line_order: 2 },
    { id: 703, scene_id: 99, external_line_id: "OTHER", line_order: 1 },
  ];
  const { finalLines } = applyDialogueLinesDiff(existing, 28, [
    { external_line_id: "L1", line_order: 1, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "hi", dialogue_zh: "嗨", start_time: null, end_time: null },
  ], 800);
  const remaining = finalLines.map(l => l.external_line_id).sort();
  check("deleting L2 (omitted from submission) leaves L1 and OTHER (different scene) untouched",
    JSON.stringify(remaining) === JSON.stringify(["L1", "OTHER"]));
}

// --- #10: scene write + dialogue write roll back together ---
{
  const st = freshState();
  st.scenes.push({ id: 28, external_scene_id: "scene_001", slug: "s1", status: "draft", description: "v1" });
  st.nextSceneId = 29;
  const before = JSON.stringify(st);
  let threw = false;
  try {
    simulateSyncRpc(st, {
      external_scene_id: "scene_001", slug: "s1-renamed", status: "draft", optional_fields: { description: "v2" },
      dialogue_lines: [
        { external_line_id: "X", line_order: 1, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "a", dialogue_zh: "啊", start_time: null, end_time: null },
        { external_line_id: "X", line_order: 2, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
      ],
    });
  } catch (e) { threw = true; }
  check("#10 scene field changes + dialogue failure roll back together (state byte-for-byte unchanged)",
    threw && before === JSON.stringify(st));
}

// --- #11: empty dialogue_lines: draft allowed, published rejected ---
{
  const st = freshState();
  st.scenes.push({ id: 1, external_scene_id: "scene_D", slug: "sd", status: "draft" });
  st.dialogueLines.push({ id: 1, scene_id: 1, external_line_id: "L1", line_order: 1 });
  st.nextSceneId = 2;
  simulateSyncRpc(st, { external_scene_id: "scene_D", slug: "sd", status: "draft", optional_fields: {}, dialogue_lines: [] });
  check("#11a draft scene: empty dialogue_lines[] clears all lines", st.dialogueLines.filter(l => l.scene_id === 1).length === 0);

  st.scenes.push({ id: 2, external_scene_id: "scene_P", slug: "sp", status: "published" });
  st.dialogueLines.push({ id: 2, scene_id: 2, external_line_id: "P1", line_order: 1 });
  st.nextSceneId = 3;
  let threw = false;
  try {
    simulateSyncRpc(st, { external_scene_id: "scene_P", slug: "sp", status: "published", optional_fields: {}, dialogue_lines: [] });
  } catch (e) { threw = /empty_dialogue_rejected/.test(e.message); }
  check("#11b published scene: empty dialogue_lines[] rejected, line P1 survives",
    threw && !!st.dialogueLines.find(l => l.external_line_id === "P1"));
}

// ============================================================================
// SECTION 4 — concurrency-safe upsert: what these tests can and cannot show
// ============================================================================
console.log("\n=== SECTION 4: concurrency guard on the external_line_id upsert ===");
console.log(
  "DISCLAIMER: JavaScript in this test runner is single-threaded. Nothing\n" +
  "below runs two database transactions at the same time, and nothing below\n" +
  "is a proof that Postgres actually serializes concurrent `INSERT ... ON\n" +
  "CONFLICT` the way its documentation says it does, or that the DEFERRABLE\n" +
  "constraint from 0018 behaves as commented under real concurrent load.\n" +
  "These tests only exercise the LOGIC of the write-time guard in\n" +
  "applyDialogueLinesDiff (the WHERE-scoped conflict update + the\n" +
  "RETURNING-equivalent post-write ownership check) in isolation, by\n" +
  "constructing the STATE that a race would leave behind (a row that\n" +
  "already belongs to a different scene at the moment of the conflicting\n" +
  "write) and confirming the guard rejects it instead of silently\n" +
  "reassigning it. A real concurrent-transaction integration test against\n" +
  "an actual Postgres instance has NOT been run and is the only thing that\n" +
  "can actually confirm the race is closed in production — see the final\n" +
  "report's explicit callout of this gap."
);

// This is the state a genuine race would leave behind: scene B's request
// includes external_line_id "RACE-1", but by the time scene B's write is
// attempted, that row already exists and belongs to scene A (because
// scene A's concurrent transaction committed first). The pre-check in
// simulateSyncRpc is deliberately bypassed here — calling
// applyDialogueLinesDiff directly — specifically so this test exercises
// ONLY the write-time guard, not the (admittedly race-prone) pre-check.
{
  const existing = [{ id: 900, scene_id: 111 /* scene A */, external_line_id: "RACE-1", line_order: 1 }];
  throwsMsg("write-time guard: a conflicting external_line_id already owned by a different scene is rejected, not silently reassigned",
    () => applyDialogueLinesDiff(existing, 222 /* scene B */, [
      { external_line_id: "RACE-1", line_order: 1, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
    ], 901),
    "line_id_owned_by_other_scene");
}
{
  const existing = [{ id: 900, scene_id: 111, external_line_id: "RACE-1", line_order: 1 }];
  let caught = false;
  try {
    applyDialogueLinesDiff(existing, 222, [
      { external_line_id: "RACE-1", line_order: 1, step: null, speaker: "B", speaker_zh: "乙", dialogue_en: "b", dialogue_zh: "呗", start_time: null, end_time: null },
    ], 901);
  } catch (e) { caught = true; }
  check("write-time guard: rejected write leaves the winning scene's row completely unchanged",
    caught && existing[0].scene_id === 111 && existing[0].dialogue_en === undefined);
}
// Legitimate same-scene update (the common, non-racing case) still works
// through the exact same WHERE-guarded code path — the guard only blocks
// cross-scene writes, never a scene updating its own line.
{
  const existing = [{ id: 900, scene_id: 111, external_line_id: "L1", line_order: 1, dialogue_en: "old" }];
  const { finalLines } = applyDialogueLinesDiff(existing, 111, [
    { external_line_id: "L1", line_order: 1, step: null, speaker: "A", speaker_zh: "甲", dialogue_en: "new", dialogue_zh: "新", start_time: null, end_time: null },
  ], 901);
  const l1 = finalLines.find(l => l.external_line_id === "L1");
  check("write-time guard: a scene updating its own existing line still succeeds normally", l1.id === 900 && l1.dialogue_en === "new");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
