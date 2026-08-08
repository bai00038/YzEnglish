import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SyncError, errorResponse } from "./errors.ts";
import { validateScenePayload } from "./validation.ts";
import { findCategoryIdByName, findSceneIdBySlug, insertScene, updateScene } from "./db.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Constant-time comparison without any external import: SHA-256 both sides
// (Web Crypto is a Deno global, no dependency needed) so the compared
// buffers are always the same fixed length, then XOR every byte so no
// early-exit timing leak depends on where the secrets first differ.
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

async function authorize(req: Request): Promise<void> {
  const syncSecret = Deno.env.get("SYNC_SECRET");
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

    const { sceneIdLabel, categoryName, row } = validateScenePayload(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new SyncError(500, "Server is not configured with Supabase credentials.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const categoryId = await findCategoryIdByName(supabase, categoryName);
    const writeRow = { ...row, category_id: categoryId };

    const existingId = await findSceneIdBySlug(supabase, writeRow.slug);
    const action = existingId === null ? "inserted" : "updated";
    const result =
      existingId === null
        ? await insertScene(supabase, writeRow)
        : await updateScene(supabase, existingId, writeRow);

    console.log(
      `[sync-scene] ${action} slug="${writeRow.slug}" database_id=${result.id} scene_id=${sceneIdLabel ?? "n/a"}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        action,
        scene_id: sceneIdLabel,
        slug: writeRow.slug,
        database_id: result.id,
        message: "Scene synced successfully",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (!(err instanceof SyncError)) {
      console.error("[sync-scene] unexpected error", err);
    }
    return errorResponse(err, CORS_HEADERS);
  }
});
