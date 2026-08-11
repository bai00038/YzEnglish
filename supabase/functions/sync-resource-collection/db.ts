import type { PostgrestError, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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

// Human-readable hints for the CHECK constraints on public.resource_collections
// — see supabase/migrations/0023_create_resource_collections.sql and
// 0024_resource_collections_topic_taxonomy.sql. Keyed by constraint name so a
// 23514 (check_violation) can point the Google Sheets operator at exactly
// which field/values are wrong, without exposing any driver/connection
// internals.
const CONSTRAINT_HINTS: Record<string, string> = {
  resource_collections_collection_type_check:
    'collection_type must be one of: daily_life, tests_licences, essential_services, travel.',
  resource_collections_price_type_check: "price_type must be one of: free, paid.",
  resource_collections_status_check: "status must be one of: draft, published.",
  resource_collections_price_check: "price must be null or >= 0.",
};

// Postgres error messages for a check_violation are of the form
// `new row for relation "..." violates check constraint "constraint_name"` —
// PostgrestError has no dedicated field for the constraint name, so it's
// pulled out of the message text.
function extractConstraintName(message: string | undefined): string | null {
  if (!message) return null;
  const match = message.match(/constraint "([^"]+)"/);
  return match ? match[1] : null;
}

// Logs the full Postgres error server-side (code/message/details/hint/
// constraint — everything needed to diagnose a future schema/validation
// mismatch like this one) and returns a SyncError with a message that is
// safe to hand back to Google Sheets: never the raw driver error, never any
// credential/connection detail, but specific enough (constraint name + what
// it requires) to actually fix a bad row.
function toSyncError(context: string, error: PostgrestError): SyncError {
  const constraint = extractConstraintName(error.message);
  console.error(
    `[sync-resource-collection] ${context}`,
    JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      constraint,
    })
  );

  if (error.code === "23514") {
    const fieldHint = constraint ? CONSTRAINT_HINTS[constraint] : undefined;
    return new SyncError(
      400,
      fieldHint
        ? `Rejected by database constraint "${constraint}": ${fieldHint}`
        : `Rejected by a database constraint${constraint ? ` ("${constraint}")` : ""}.`
    );
  }
  if (error.code === "23502") {
    return new SyncError(400, "Database rejected a missing required value (not-null constraint).");
  }
  if (error.code === "23505") {
    return new SyncError(409, "A conflicting row already exists for this collection_id.");
  }
  return new SyncError(500, `Database error while syncing collection (code ${error.code ?? "unknown"}).`);
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
    throw toSyncError("lookup failed", lookupError);
  }

  // row never carries created_at/updated_at/sync_status/sync_message (see
  // CollectionPayloadRow — those columns are either DB-managed or don't
  // exist on this table), so this upsert can never overwrite created_at on
  // an update: updated_at is bumped by the resource_collections_set_updated_at
  // trigger instead, and created_at simply isn't in the SET list.
  const { data, error } = await supabase
    .from("resource_collections")
    .upsert(
      { external_collection_id: externalCollectionId, ...row },
      { onConflict: "external_collection_id" }
    )
    .select("id")
    .single();

  if (error) {
    throw toSyncError("upsert failed", error);
  }
  if (!data) {
    throw new SyncError(500, "Database error while syncing collection: no result returned.");
  }

  return { id: data.id as number, action: existing ? "updated" : "inserted" };
}
