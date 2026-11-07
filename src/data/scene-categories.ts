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
  "Dental X-rays": "拍牙片",
  "Professional Teeth Cleaning": "洗牙",
  "Dental Filling": "补牙",
  "Dental Implant Surgery": "种牙手术",
  "Describing Pain at the Dentist": "描述牙疼",
  "Dental Front Desk": "预约复诊",
  "Orthodontic Consultation": "牙套咨询",
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

const COLLECTION_CARD_LABELS: Record<string, string> = {
  C1: "牙科英语",
  C2: "医疗英语",
  C3: "医疗英语",
  C4: "家校英语",
  C5: "日常英语",
  C6: "亲子英语",
  C7: "点餐英语",
  C8: "购物英语",
  C9: "安家英语",
  C10: "旅行英语",
  C11: "职场英语",
  C12: "日常英语",
};

export function getSceneCardCategoryLabel(collectionId: string | undefined, category: string): string {
  return (collectionId && COLLECTION_CARD_LABELS[collectionId]) || getSceneCategoryLabel(category);
}
