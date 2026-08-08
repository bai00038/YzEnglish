import type { PdfResource } from "./types";

// PDF_TYPE_LABELS is a presentation-only constant with no Supabase
// equivalent — it stays as-is regardless of data source.
//
// PDF_RESOURCES below is now only the dev-only fallback data set, used by
// src/data/resources-access.ts when Supabase isn't configured or
// unreachable during local development. Production reads resources from
// the pdf_resources table.

// One free "scene" PDF per real scene (see SCENES in src/data/scenes.ts) —
// no bundled/collection packs exist yet, so none are listed here. Once
// combined packs are ready they'll be added as their own (likely premium)
// entries alongside these.
export const PDF_RESOURCES: PdfResource[] = [
  { id: 1, title: "Returning Clothes at a Store — PDF", titleZh: "在商店退衣服学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Shopping & Returns" },
  { id: 2, title: "Picking Up a Child Early from School — PDF", titleZh: "提前接孩子放学学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "School & Family" },
  { id: 3, title: "Booking a Dentist Appointment — PDF", titleZh: "预约牙医学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Healthcare" },
  { id: 4, title: "Asking for a Costco Price Adjustment — PDF", titleZh: "Costco价格调整申请学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Shopping & Returns" },
  { id: 5, title: "Ordering at a Drive-Through — PDF", titleZh: "得来速点餐学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Food & Restaurants" },
  { id: 6, title: "Reporting a Repair Issue to Your Landlord — PDF", titleZh: "向房东报修学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Housing" },
  { id: 7, title: "Checking In at a Hotel — PDF", titleZh: "酒店入住学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Travel" },
  { id: 8, title: "Airport Check-In and Baggage Drop — PDF", titleZh: "机场值机与行李托运学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Travel" },
  { id: 9, title: "Calling in Sick at Work — PDF", titleZh: "打电话请病假学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Work" },
];

export const PDF_TYPE_LABELS: Record<string, string> = {
  free: "Free Resource",
  scene: "Scene PDF",
  collection: "Topic Collection",
  travel: "Travel Pack",
  country: "Country Pack",
};

// Multi-scene collection types shown on the Resources page. Single-scene
// "scene" rows are excluded there — those PDFs stay downloadable from their
// own Scene Detail page instead (SceneDetailPage.tsx uses scene.pdfUrl,
// which is unrelated to this table).
export const COLLECTION_TYPES = ["collection", "travel", "country"];

// Presentation-only: several source titles (see PDF_RESOURCES above and the
// pdf_resources table) were authored with a trailing "— PDF" / "PDF" /
// ".pdf" marker. Users already know these are downloadable PDFs, so the
// marker is stripped for display — this never touches the underlying title,
// title_zh, or file_path/pdf_url data.
export function displayResourceTitle(title: string): string {
  return title.replace(/\s*[—–-]?\s*\.?pdf\s*$/i, "").trim();
}
