import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SyncError } from "./errors.ts";
import type { DialogueLineRowPayload, ScenePayloadRow } from "./validation.ts";

export async function findCategoryIdByName(
  supabase: SupabaseClient,
  categoryName: string
): Promise<number> {
  // .eq on a text column is a case-sensitive exact match in Postgres by
  // default — matches the "区分大小写的精确匹配" requirement without extra work.
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("name_en", categoryName);

  if (error) {
    console.error("[sync-scene] category lookup failed", error);
    throw new SyncError(500, "Database error while looking up category.");
  }
  if (!data || data.length === 0) {
    throw new SyncError(
      404,
      `Category not found: no public.categories row has name_en = "${categoryName}".`
    );
  }
  if (data.length > 1) {
    throw new SyncError(
      409,
      `Category name "${categoryName}" matches ${data.length} rows in public.categories — expected exactly 1.`
    );
  }
  return data[0].id;
}

// Every machine-readable error prefix that
// public.sync_scene_with_dialogue_lines (supabase/migrations/0019_sync_scene_rpc.sql)
// can RAISE, mapped to the HTTP status a caller should see. Anything else
// surfaces as a generic 500: an unrecognized prefix means the database
// failed in a way this function doesn't specifically know how to
// explain, not that it's safe to guess.
//
// Kept in lockstep with 0019 by hand — cross-check against that file
// whenever a RAISE EXCEPTION prefix there changes. Full list, one row per
// `raise exception '<prefix>: ...'` in 0019, as of this file's last
// update:
//
//   missing_external_scene_id    400  external_scene_id absent/blank
//   missing_slug                 400  slug absent/blank
//   missing_line_id              400  a dialogue_lines[] entry has no line_id
//   duplicate_line_id            400  same line_id twice in one request
//   slug_conflict                409  slug already owned by a different scene (insert or update path)
//   unmapped_legacy_dialogue_lines 409  scene still has dialogue_lines rows with no
//                                      external_line_id — needs its own adoption
//                                      migration (0015_adopt_dialogue_line_external_ids.sql)
//                                      before this RPC will touch its dialogue_lines at all
//   line_id_owned_by_other_scene  409  a submitted line_id already belongs to a
//                                      different scene — raised either by the
//                                      fast pre-check, or by the write-time
//                                      RETURNING-based verification that closes
//                                      the concurrent-request race (see 0019's
//                                      header, bug 3, and the comment on the
//                                      upsert itself)
//   empty_dialogue_rejected       409  tried to clear all dialogue_lines on a
//                                      published scene
const RPC_ERROR_STATUS: Record<string, number> = {
  missing_external_scene_id: 400,
  missing_slug: 400,
  missing_line_id: 400,
  duplicate_line_id: 400,
  slug_conflict: 409,
  unmapped_legacy_dialogue_lines: 409,
  line_id_owned_by_other_scene: 409,
  empty_dialogue_rejected: 409,
};

function statusForRpcError(message: string): number {
  const prefix = message.split(":", 1)[0];
  return RPC_ERROR_STATUS[prefix] ?? 500;
}

export interface SyncSceneParams {
  externalSceneId: string;
  categoryId: number;
  row: ScenePayloadRow;
  // undefined = don't touch dialogue_lines for this scene at all.
  dialogueLines: DialogueLineRowPayload[] | undefined;
}

export interface SyncSceneResult {
  id: number;
  action: "inserted" | "updated";
}

// scenes.duration and scenes.description are `not null` at the DB level
// (0002_create_scenes.sql), so they can never simply be left blank — but
// a freshly-populated Sheet row may not have that content filled in yet.
// Rather than reject the whole sync (blocking every other field on this
// scene) or write an empty string over real existing content, a blank
// submitted value falls back to whatever is already stored for this
// external_scene_id, making the write a no-op for that one column. Only
// a scene with no existing row at all (a genuine first-time insert) still
// requires the field outright, since there's nothing to fall back to and
// the column cannot be left null.
async function resolveWithExistingFallback(
  supabase: SupabaseClient,
  externalSceneId: string,
  field: "duration" | "description",
  submitted: string
): Promise<string> {
  if (submitted.length > 0) return submitted;

  const { data, error } = await supabase
    .from("scenes")
    .select(field)
    .eq("external_scene_id", externalSceneId)
    .maybeSingle();

  if (error) {
    console.error(`[sync-scene] ${field} fallback lookup failed`, error);
    throw new SyncError(500, `Database error while resolving "${field}".`);
  }
  if (!data || typeof (data as Record<string, unknown>)[field] !== "string") {
    throw new SyncError(
      400,
      `Field "${field}" is required and must be a non-empty string (no existing scene found for scene_id "${externalSceneId}" to preserve a prior value).`
    );
  }
  return (data as Record<string, string>)[field];
}

// Single call into public.sync_scene_with_dialogue_lines — the scene row
// write and the full dialogue_lines upsert/prune happen inside one
// Postgres function body, i.e. one transaction (see that function's
// header comment in 0019_sync_scene_rpc.sql for exactly what it
// enforces: external_scene_id-based matching, slug-conflict rejection,
// external_line_id upsert with cross-scene/duplicate rejection, and
// status-gated empty-dialogue semantics). This replaces the previous
// two-step flow (a plain `.update("scenes")` followed by a separate
// `.rpc("replace_dialogue_lines")` call) specifically to close the gap
// where the scene row could be written successfully and the dialogue
// write could still fail afterward — see this file's git history before
// Phase A-0 for the old shape.
export async function syncSceneWithDialogueLines(
  supabase: SupabaseClient,
  params: SyncSceneParams
): Promise<SyncSceneResult> {
  const { externalSceneId, categoryId, row, dialogueLines } = params;

  const duration = await resolveWithExistingFallback(supabase, externalSceneId, "duration", row.duration);
  const description = await resolveWithExistingFallback(supabase, externalSceneId, "description", row.description);

  // Only the keys actually present on `row` for the five legacy/shared
  // jsonb fields — the RPC uses jsonb's `?` key-existence operator to
  // decide "leave this column alone" vs "write (possibly null/[]) this
  // value", so this object must NOT gain keys for fields that were never
  // present in the original payload. See ScenePayloadRow's comment.
  const optionalFields: Record<string, unknown> = {};
  if ("subtitle_cues" in row) optionalFields.subtitle_cues = row.subtitle_cues;
  if ("dialogue" in row) optionalFields.dialogue = row.dialogue;
  if ("expressions" in row) optionalFields.expressions = row.expressions;
  if ("vocabulary" in row) optionalFields.vocabulary = row.vocabulary;
  if ("tips" in row) optionalFields.tips = row.tips;

  const { data, error } = await supabase.rpc("sync_scene_with_dialogue_lines", {
    p_external_scene_id: externalSceneId,
    p_slug: row.slug,
    p_title_en: row.title_en,
    p_title_zh: row.title_zh,
    p_category_id: categoryId,
    p_region: row.region,
    p_level: row.level,
    p_duration: duration,
    p_description: description,
    p_photo_url: row.photo_url,
    p_pdf_url: row.pdf_url,
    p_video_url: row.video_url,
    p_status: row.status,
    p_sort_order: row.sort_order,
    p_scene_setup_en: row.scene_setup_en,
    p_scene_setup_zh: row.scene_setup_zh,
    p_learning_goal_en: row.learning_goal_en,
    p_learning_goal_zh: row.learning_goal_zh,
    p_optional_fields: optionalFields,
    p_dialogue_lines: dialogueLines ?? null,
  });

  if (error) {
    // Postgres RAISE EXCEPTION messages from the function body arrive
    // here as error.message, prefixed with the machine-readable tag the
    // function used (e.g. "slug_conflict: ...") — see RPC_ERROR_STATUS.
    console.error("[sync-scene] sync_scene_with_dialogue_lines failed", error);
    const status = statusForRpcError(error.message ?? "");
    // Only the messages this function itself recognizes (and therefore
    // authored deliberately, with no internal/driver detail in them) are
    // safe to hand back to the caller. An unrecognized failure — a real
    // constraint violation this RPC didn't anticipate, a connection
    // error, etc. — stays server-side-only, same convention as every
    // other 500 in this Edge Function (see errors.ts).
    throw new SyncError(status, status === 500 ? "Database error while syncing scene." : error.message);
  }
  if (!data || data.length === 0) {
    console.error("[sync-scene] sync_scene_with_dialogue_lines returned no row", data);
    throw new SyncError(500, "Database error while syncing scene: no result returned.");
  }

  const resultRow = data[0] as { scene_id: number; action: string };
  return { id: resultRow.scene_id, action: resultRow.action as "inserted" | "updated" };
}
