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

export function getSceneCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? "其他场景";
}
