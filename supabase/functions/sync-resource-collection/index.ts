import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SyncError, errorResponse } from "./errors.ts";
import { validateCollectionPayload } from "./validation.ts";
import { upsertResourceCollection } from "./db.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Constant-time comparison — identical approach to sync-scene/index.ts.
// Kept as its own copy since each Edge Function is deployed independently
// with no shared module between them.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}

// A DISTINCT env var name from sync-scene's SYNC_SECRET — Supabase project
// secrets are shared across every deployed Edge Function (there is no
// per-function secret store), so reusing the literal name "SYNC_SECRET"
// here would mean both functions read the exact same value, and rotating
// one for this function would silently break sync-scene's already-working
// Apps Script credentials. Set via `supabase secrets set
// RESOURCE_COLLECTION_SYNC_SECRET=...` — must match the
// RESOURCE_COLLECTION_SYNC_SECRET Script Property in the Resource_Collections
// Apps Script project exactly (see google-apps-script/scenes-sync/Code.gs's
// RESOURCE_COLLECTIONS_SCRIPT_PROPERTY_KEYS).
async function authorize(req: Request): Promise<void> {
  const syncSecret = Deno.env.get("RESOURCE_COLLECTION_SYNC_SECRET");
  if (!syncSecret) {
    throw new SyncError(500, "Server is not configured for sync requests.");
  }

  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/);
  if (!match || !(await timingSafeEqual(match[1].trim(), syncSecret))) {
    throw new SyncError(401, "Missing or invalid sync credentials.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse(new SyncError(400, "Only POST is supported."), CORS_HEADERS);
  }

  try {
    await authorize(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new SyncError(400, "Request body must be valid JSON.");
    }

    const { externalCollectionId, row } = validateCollectionPayload(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new SyncError(500, "Server is not configured with Supabase credentials.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const result = await upsertResourceCollection(supabase, { externalCollectionId, row });

    console.log(
      `[sync-resource-collection] ${result.action} collection_id="${externalCollectionId}" database_id=${result.id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        action: result.action,
        collection_id: externalCollectionId,
        database_id: result.id,
        message: "Resource collection synced successfully",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (!(err instanceof SyncError)) {
      console.error("[sync-resource-collection] unexpected error", err);
    }
    return errorResponse(err, CORS_HEADERS);
  }
});
