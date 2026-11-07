import rawCollections from "../../tools/oss-manifest/collections.json";
import type { CollectionTag, SceneCollection } from "./types";

export const COLLECTION_TAGS: CollectionTag[] = [
  { id: "medical", label: "医疗" },
  { id: "shopping", label: "购物" },
  { id: "daily", label: "日常" },
  { id: "school", label: "家校" },
  { id: "parenting", label: "亲子" },
  { id: "dining", label: "点餐" },
  { id: "settling-in", label: "安家" },
  { id: "travel", label: "旅行" },
  { id: "work", label: "职场" },
];

export const DEFAULT_COLLECTIONS = rawCollections as SceneCollection[];

export interface SceneCatalogueMetadata {
  collectionId: string;
  collectionOrder: number;
  tags: string[];
  status: "live" | "coming";
  isFreeExperience: boolean;
}

// Compatibility metadata for the currently published OSS manifest. New
// manifest entries carry these fields directly and override this map.
export const CURRENT_SCENE_METADATA: Record<string, SceneCatalogueMetadata> = {
  "SH-01-004": { collectionId: "C8", collectionOrder: 1, tags: ["shopping"], status: "live", isFreeExperience: false },
  "FD-01-001": { collectionId: "C7", collectionOrder: 1, tags: ["dining", "daily"], status: "live", isFreeExperience: true },
  "FD-01-002": { collectionId: "C7", collectionOrder: 2, tags: ["dining", "daily"], status: "live", isFreeExperience: false },
  "HC-01-002": { collectionId: "C2", collectionOrder: 1, tags: ["medical", "parenting"], status: "live", isFreeExperience: false },
  "ST-01-001": { collectionId: "C5", collectionOrder: 1, tags: ["daily"], status: "live", isFreeExperience: true },
  "ST-01-002": { collectionId: "C5", collectionOrder: 2, tags: ["daily"], status: "live", isFreeExperience: false },
  "NCP-001": { collectionId: "C9", collectionOrder: 1, tags: ["settling-in"], status: "live", isFreeExperience: false },
};

export const PLANNED_FREE_SCENES = [
  {
    id: 16,
    externalId: "SH-01-007",
    slug: "self-checkout-barcode-wont-scan",
    titleEn: "When a Barcode Won't Scan at Self-Checkout",
    titleZh: "自助结账时条码扫不上",
    category: "Shopping & Beauty",
    region: "Canada",
    level: "Beginner",
    duration: "",
    featured: false,
    desc: "在超市自助结账时遇到条码无法扫描，学习如何说明问题并向店员求助。",
    collectionId: "C8",
    collectionOrder: 2,
    tags: ["shopping"],
    status: "coming" as const,
    isFreeExperience: true,
  },
  {
    id: 13,
    externalId: "ST-01-001",
    slug: "elevator-small-talk",
    titleEn: "Elevator Small Talk",
    titleZh: "电梯里的简短寒暄",
    category: "Social English",
    region: "Canada",
    level: "Beginner",
    duration: "",
    featured: false,
    desc: "用一句问候、一个轻松问题和自然的结束语完成友好的电梯寒暄。",
    collectionId: "C5",
    collectionOrder: 1,
    tags: ["daily"],
    status: "coming" as const,
    isFreeExperience: true,
  },
  {
    id: 17,
    externalId: "FD-01-001",
    slug: "ordering-a-pizza-by-phone-for-pickup",
    titleEn: "Ordering a Pizza by Phone for Pickup",
    titleZh: "电话订披萨并到店自取",
    category: "Food & Restaurants",
    region: "Canada",
    level: "Beginner",
    duration: "",
    featured: false,
    desc: "电话订披萨时，练习确认自取、尺寸、配料、饼底、取餐时间和订单姓名，自然完成整通电话。",
    collectionId: "C7",
    collectionOrder: 1,
    tags: ["dining", "daily"],
    status: "coming" as const,
    isFreeExperience: true,
  },
];

export function getCollectionTagLabel(tagId: string): string {
  return COLLECTION_TAGS.find(tag => tag.id === tagId)?.label ?? "";
}
