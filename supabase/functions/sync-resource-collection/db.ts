import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SyncError } from "./errors.ts";
import type { CollectionPayloadRow } from "./validation.ts";

export interface UpsertCollectionParams {
  externalCollectionId: string;
  row: CollectionPayloadRow;
}

export interface UpsertCollectionResult {
  id: number;
  action: "inserted" | "updated";
}

// A plain upsert keyed on external_collection_id, unlike sync-scene's
// syncSceneWithDialogueLines: there is no child table (no dialogue_lines
// equivalent) to keep in a transaction alongside the row write, so a
// single upsert() call is enough. The existence check up front is only
// to report "inserted" vs "updated" back to the caller/Sync log — it does
// not gate the write itself.
export async function upsertResourceCollection(
  supabase: SupabaseClient,
  params: UpsertCollectionParams
): Promise<UpsertCollectionResult> {
  const { externalCollectionId, row } = params;

  const { data: existing, error: lookupError } = await supabase
    .from("resource_collections")
    .select("id")
    .eq("external_collection_id", externalCollectionId)
    .maybeSingle();

  if (lookupError) {
    console.error("[sync-resource-collection] lookup failed", lookupError);
    throw new SyncError(500, "Database error while looking up collection.");
  }

  const { data, error } = await supabase
    .from("resource_collections")
    .upsert(
      { external_collection_id: externalCollectionId, ...row },
      { onConflict: "external_collection_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[sync-resource-collection] upsert failed", error);
    throw new SyncError(500, "Database error while syncing collection.");
  }
  if (!data) {
    throw new SyncError(500, "Database error while syncing collection: no result returned.");
  }

  return { id: data.id as number, action: existing ? "updated" : "inserted" };
}
