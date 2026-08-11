// Presentation-only constants for ResourceCollection (see types.ts and
// resource-collections-access.ts) — no Supabase equivalent, safe to change
// freely without touching the schema or sync pipeline.
//
// Keys are collection_type's topic-based taxonomy — see
// supabase/migrations/0024_resource_collections_topic_taxonomy.sql.
// essential_services has no published collections yet; kept here so the
// card footer already has a label ready once one exists.
export const COLLECTION_TYPE_LABELS: Record<string, string> = {
  daily_life: "Daily Life",
  tests_licences: "Tests & Guides",
  essential_services: "Essential Services",
  travel: "Travel",
};
