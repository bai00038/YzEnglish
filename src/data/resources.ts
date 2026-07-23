import type { PdfResource } from "./types";

export const PDF_RESOURCES: PdfResource[] = [
  { id: 1, title: "Shopping English Starter Pack", titleZh: "购物英语入门资料包", type: "free", desc: "Covers returns, price matching, and asking for help in stores.", scenes: 5, free: true, category: "Shopping & Returns" },
  { id: 2, title: "Airport & Hotels Travel Pack", titleZh: "机场与酒店旅行英语包", type: "travel", desc: "Airport check-in, hotel conversations, and emergency phrases for international travel.", scenes: 8, free: false, category: "Travel" },
  { id: 3, title: "Canada Life: First 30 Days", titleZh: "加拿大生活第一个月", type: "collection", desc: "Bank account, SIM card, family doctor, school, and grocery store.", scenes: 12, free: false, category: "Canada" },
  { id: 4, title: "Canadian Parenting English", titleZh: "加拿大家长沟通英语", type: "collection", desc: "School absence calls, parent-teacher talks, and allergy form conversations.", scenes: 7, free: false, category: "School & Family" },
  { id: 5, title: "Healthcare English Essentials", titleZh: "医疗场景英语基础", type: "free", desc: "Doctor appointments, describing symptoms, dental visits, and pharmacy conversations.", scenes: 6, free: true, category: "Healthcare" },
  { id: 6, title: "Real English in Canada — Series 1", titleZh: "加拿大真实英语系列一", type: "country", desc: "Eight everyday Canadian scenarios with full dialogue, culture notes, and vocabulary.", scenes: 8, free: false, category: "Canada" },
  { id: 7, title: "Travel Emergencies English", titleZh: "旅行紧急情况英语", type: "travel", desc: "Lost passport, medical emergency abroad, and reporting theft to local authorities.", scenes: 4, free: true, category: "Travel" },
  { id: 8, title: "Returning Clothes at a Store — PDF", titleZh: "在商店退衣服学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Shopping & Returns" },
];

export const PDF_TYPE_LABELS: Record<string, string> = {
  free: "Free Resource",
  scene: "Scene PDF",
  collection: "Topic Collection",
  travel: "Travel Pack",
  country: "Country Pack",
};
