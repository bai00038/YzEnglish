import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SyncError } from "./errors.ts";
import type { DialogueLineRowPayload, ScenePayloadRow } from "./validation.ts";

export type SceneWriteRow = ScenePayloadRow & { category_id: number };

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

export async function findSceneIdBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<number | null> {
  const { data, error } = await supabase.from("scenes").select("id").eq("slug", slug);

  if (error) {
    console.error("[sync-scene] scene lookup failed", error);
    throw new SyncError(500, "Database error while looking up scene by slug.");
  }
  if (!data || data.length === 0) return null;
  if (data.length > 1) {
    throw new SyncError(
      409,
      `Slug "${slug}" matches ${data.length} rows in public.scenes — expected at most 1. Refusing to update arbitrarily.`
    );
  }
  return data[0].id;
}

export async function insertScene(
  supabase: SupabaseClient,
  row: SceneWriteRow
): Promise<{ id: number }> {
  // id/created_at/updated_at are intentionally absent from `row` — serial
  // default and the scenes_set_updated_at trigger handle them.
  const { data, error } = await supabase.from("scenes").insert(row).select("id").single();
  if (error) {
    console.error("[sync-scene] insert failed", error);
    throw new SyncError(500, "Database error while inserting scene.");
  }
  return data;
}

export async function updateScene(
  supabase: SupabaseClient,
  id: number,
  row: SceneWriteRow
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("scenes")
    .update(row)
    .eq("id", id)
    .select("id")
    .single();
  if (error) {
    console.error("[sync-scene] update failed", error);
    throw new SyncError(500, "Database error while updating scene.");
  }
  return data;
}

// Delete-then-insert for one scene's dialogue_lines, done inside a single
// Postgres function call (public.replace_dialogue_lines — see
// supabase/migrations/0012_add_dialogue_lines.sql) so it's one atomic
// transaction: if the insert half fails, the delete half is rolled back
// too. A plain two-step client-side delete+insert here would risk leaving
// a scene's dialogue_lines empty if the insert failed after the delete
// already committed.
export async function replaceDialogueLines(
  supabase: SupabaseClient,
  sceneId: number,
  lines: DialogueLineRowPayload[]
): Promise<void> {
  const { error } = await supabase.rpc("replace_dialogue_lines", {
    p_scene_id: sceneId,
    p_lines: lines,
  });
  if (error) {
    console.error("[sync-scene] replace_dialogue_lines failed", error);
    throw new SyncError(500, "Database error while replacing dialogue_lines.");
  }
}
