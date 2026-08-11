// Presentation-only constants for ResourceCollection (see types.ts and
// resource-collections-access.ts) — no Supabase equivalent, safe to change
// freely without touching the schema or sync pipeline.

export const COLLECTION_TYPE_LABELS: Record<string, string> = {
  topic: "Topic Collection",
  travel: "Travel Pack",
  country: "Country Pack",
};

export const COLLECTION_TYPE_BADGE_STYLE: Record<string, string> = {
  topic: "bg-purple-100 text-purple-800",
  travel: "bg-amber-100 text-amber-800",
  country: "bg-emerald-100 text-emerald-800",
};

// Card header background, one per collection_type — replaces the old
// CATEGORY_BG (scene-category-keyed) lookup: a collection spans multiple
// scenes/categories, so its card has no single category to color by.
export const COLLECTION_TYPE_BG: Record<string, string> = {
  topic: "bg-purple-50",
  travel: "bg-amber-50",
  country: "bg-emerald-50",
};
