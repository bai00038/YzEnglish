// Keep the source categories as-is for content syncing. This is the single
// display taxonomy shared by scene cards, filters, and detail pages.
export const PRIMARY_SCENE_CATEGORIES = [
  "购物英语",
  "日常生活",
  "医疗英语",
  "家校沟通",
  "安家办事",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  "Shopping & Beauty": "购物英语",
  "Shopping & Returns": "购物英语",
  "Food & Restaurants": "日常生活",
  "Food & Dining": "日常生活",
  "Social Life": "日常生活",
  "Social English": "日常生活",
  Travel: "日常生活",
  Healthcare: "医疗英语",
  "School & Family": "家校沟通",
  "Banking & Services": "安家办事",
  Housing: "安家办事",
  Transportation: "安家办事",
  Work: "安家办事",
  Emergencies: "安家办事",
  Immigration: "安家办事",
};

const CATEGORY_TAG_IDS: Record<string, string> = {
  "Shopping & Beauty": "shopping",
  "Shopping & Returns": "shopping",
  "Food & Restaurants": "daily",
  "Food & Dining": "daily",
  "Social Life": "daily",
  "Social English": "daily",
  Travel: "daily",
  Healthcare: "medical",
  "School & Family": "school",
  "Banking & Services": "settling-in",
  Housing: "settling-in",
  Transportation: "settling-in",
  Work: "settling-in",
  Emergencies: "settling-in",
  Immigration: "settling-in",
};

export function getSceneCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? "其他场景";
}

export function getSceneCategoryTagId(category: string): string | null {
  return CATEGORY_TAG_IDS[category] ?? null;
}
