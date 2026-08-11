// Presentation-only constants for ResourceCollection (see types.ts and
// resource-collections-access.ts) — no Supabase equivalent, safe to change
// freely without touching the schema or sync pipeline.

export const COLLECTION_TYPE_LABELS: Record<string, string> = {
  topic: "Topic Collection",
  travel: "Travel Series",
  country: "Country Guide",
};
