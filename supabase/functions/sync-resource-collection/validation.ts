import { SyncError } from "./errors.ts";

// Kept in sync with the resource_collections check constraints — see
// supabase/migrations/0023_create_resource_collections.sql and
// 0024_resource_collections_topic_taxonomy.sql.
const ALLOWED_STATUS = ["draft", "published"] as const;
type AllowedStatus = (typeof ALLOWED_STATUS)[number];

const ALLOWED_COLLECTION_TYPE = ["daily_life", "tests_licences", "essential_services", "travel"] as const;
type AllowedCollectionType = (typeof ALLOWED_COLLECTION_TYPE)[number];

const ALLOWED_PRICE_TYPE = ["free", "paid"] as const;
type AllowedPriceType = (typeof ALLOWED_PRICE_TYPE)[number];

// Fields ready to write to public.resource_collections, minus
// external_collection_id (a top-level field on ValidatedCollectionPayload,
// not on the row — same split as ScenePayloadRow/externalSceneId in
// sync-scene/validation.ts) and the DB-managed id/created_at/updated_at.
export interface CollectionPayloadRow {
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  collection_type: AllowedCollectionType;
  price_type: AllowedPriceType;
  price: number | null;
  cover_image_url: string | null;
  pdf_url: string | null;
  scene_ids: string;
  scene_count: number;
  status: AllowedStatus;
  sort_order: number;
}

export interface ValidatedCollectionPayload {
  // The permanent sync identity for this collection — REQUIRED, and the
  // sole field this Edge Function matches an existing row against (see
  // upsertResourceCollection in db.ts). Wire field is "collection_id",
  // maps to resource_collections.external_collection_id.
  externalCollectionId: string;
  row: CollectionPayloadRow;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SyncError(400, `Field "${field}" is required and must be a non-empty string.`);
  }
  return value.trim();
}

// Field must be present and be a string, but "" is a legitimate value —
// used for description_en/description_zh, which a freshly-added sheet row
// may not have filled in yet.
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

// Enum fields are matched case-insensitively — the sheet is hand-edited, so
// "Published"/"PUBLISHED"/"published" must all resolve the same way. Trimmed
// and lowercased BEFORE comparing against the allowed list, and the
// lowercased form is what gets written to the database (the allowed-list
// constants above, and the live CHECK constraints they mirror, are already
// all-lowercase).
function requireStatus(value: unknown): AllowedStatus {
  const status = requireNonEmptyString(value, "status").toLowerCase();
  if (!(ALLOWED_STATUS as readonly string[]).includes(status)) {
    throw new SyncError(400, `Field "status" must be one of: ${ALLOWED_STATUS.join(", ")}. Got "${status}".`);
  }
  return status as AllowedStatus;
}

function requireCollectionType(value: unknown): AllowedCollectionType {
  const type = requireNonEmptyString(value, "collection_type").toLowerCase();
  if (!(ALLOWED_COLLECTION_TYPE as readonly string[]).includes(type)) {
    throw new SyncError(400, `Field "collection_type" must be one of: ${ALLOWED_COLLECTION_TYPE.join(", ")}. Got "${type}".`);
  }
  return type as AllowedCollectionType;
}

function requirePriceType(value: unknown): AllowedPriceType {
  const type = requireNonEmptyString(value, "price_type").toLowerCase();
  if (!(ALLOWED_PRICE_TYPE as readonly string[]).includes(type)) {
    throw new SyncError(400, `Field "price_type" must be one of: ${ALLOWED_PRICE_TYPE.join(", ")}. Got "${type}".`);
  }
  return type as AllowedPriceType;
}

// Blank/omitted price -> null (a free collection, or a paid one whose price
// hasn't been set yet). When present, strips currency symbols/thousands
// separators/whitespace the sheet might contain (e.g. "$19.90", "CA$ 19.90",
// "19,900") before parsing — the numeric(10,2) column and the >= 0 check
// constraint only ever accept a plain number, never a currency string. Must
// end up a non-negative number — never silently clamped.
function optionalPrice(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const stripped = typeof value === "number" ? value : String(value).trim().replace(/[^0-9.\-]/g, "");
  if (stripped === "" || stripped === "-") return null;
  const num = typeof stripped === "number" ? stripped : Number(stripped);
  if (!Number.isFinite(num)) {
    throw new SyncError(400, `Field "price" must be a number. Got: ${JSON.stringify(value)}.`);
  }
  if (num < 0) {
    throw new SyncError(400, `Field "price" must be >= 0. Got: ${num}.`);
  }
  return num;
}

function requireSortOrder(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new SyncError(400, `Field "sort_order" must be an integer.`);
  }
  return num;
}

// Blank/omitted scene_count -> 0. Authored directly on the sheet row
// (not derived from scene_ids.length here) — same "trust the source, don't
// second-guess it" convention as sort_order above.
function requireSceneCount(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    throw new SyncError(400, `Field "scene_count" must be a non-negative integer.`);
  }
  return num;
}

// scene_ids is the sheet cell's raw comma-separated text, stored as-is — a
// loose association for display only (see the table comment in
// 0023_create_resource_collections.sql), never parsed or validated against
// public.scenes. Omitted/blank -> "", since a collection may legitimately
// have no scenes assigned yet while still in draft.
function requireSceneIdsText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new SyncError(400, `Field "scene_ids" must be a string (comma-separated external scene ids, or "" to clear it).`);
  }
  return value.trim();
}

// resource_collections.external_collection_id's wire counterpart — REQUIRED,
// the sole match key this Edge Function uses to find an existing row.
function requireExternalCollectionId(value: unknown): string {
  return requireNonEmptyString(value, "collection_id");
}

export function validateCollectionPayload(body: unknown): ValidatedCollectionPayload {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new SyncError(400, "Request body must be a JSON object.");
  }
  const payload = body as Record<string, unknown>;

  const externalCollectionId = requireExternalCollectionId(payload.collection_id);

  const priceType = requirePriceType(payload.price_type);

  const row: CollectionPayloadRow = {
    title_en: requireNonEmptyString(payload.title_en, "title_en"),
    title_zh: requireNonEmptyString(payload.title_zh, "title_zh"),
    description_en: requireString(payload.description_en, "description_en"),
    description_zh: requireString(payload.description_zh, "description_zh"),
    collection_type: requireCollectionType(payload.collection_type),
    price_type: priceType,
    price: optionalPrice(payload.price),
    cover_image_url: optionalString(payload.cover_image_url, "cover_image_url"),
    // Paid collections never store a URL here, regardless of what the sheet
    // cell contains: pdf_url is a public-read column (see the "public read
    // published resource_collections" RLS policy in
    // 0023_create_resource_collections.sql, which exposes every published
    // row's columns to anon/authenticated clients), and there are no
    // dedicated private-bucket/object-path columns on this table yet. A paid
    // resource's file therefore has nothing safe to put here — no public
    // URL, and never a signed URL persisted to a public-read column, which
    // would just be a public URL with extra steps. It stays private in
    // Storage (paid-resources bucket) and gets served through a separate,
    // access-checked download path, not this table. Only a free collection's
    // pdf_url is ever written through.
    pdf_url: priceType === "paid" ? null : optionalString(payload.pdf_url, "pdf_url"),
    scene_ids: requireSceneIdsText(payload.scene_ids),
    scene_count: requireSceneCount(payload.scene_count),
    status: requireStatus(payload.status),
    sort_order: requireSortOrder(payload.sort_order),
  };

  return { externalCollectionId, row };
}
