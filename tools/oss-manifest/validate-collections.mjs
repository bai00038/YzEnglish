import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const defaultManifestUrl = new URL("../../../05_Publish/content/manifest.json", import.meta.url);
const collectionsUrl = new URL("./collections.json", import.meta.url);
const manifestPath = process.argv[2] || fileURLToPath(defaultManifestUrl);

const [manifest, collections] = await Promise.all([
  readFile(manifestPath, "utf8").then(JSON.parse),
  readFile(collectionsUrl, "utf8").then(JSON.parse),
]);

const expectedCollectionIds = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"];
const allowedTags = new Set(["medical", "shopping", "daily", "school", "parenting", "dining", "settling-in"]);
const expectedFreeSceneIds = new Set(["SH-01-007", "ST-01-001", "DL-01-007"]);
const errors = [];

const collectionIds = collections.map((collection) => collection.id);
if (JSON.stringify(collectionIds) !== JSON.stringify(expectedCollectionIds)) {
  errors.push(`合集 id 或货架顺序错误；必须严格为 ${expectedCollectionIds.join(", ")}`);
}

const legalCollectionIds = new Set(collectionIds);
const seenSceneIds = new Set();
const orderOwners = new Map();

for (const scene of manifest.scenes ?? []) {
  const label = `${scene.titleZh || scene.titleEn || scene.slug || "未命名场景"} (${scene.externalId || "无 externalId"})`;
  if (!scene.externalId || seenSceneIds.has(scene.externalId)) errors.push(`${label}：externalId 缺失或重复`);
  seenSceneIds.add(scene.externalId);
  if ("collectionIds" in scene) errors.push(`${label}：不再支持 collectionIds；每个场景只能使用一个 collectionId`);

  if (scene.status === "live") {
    if (typeof scene.collectionId !== "string" || !legalCollectionIds.has(scene.collectionId)) {
      errors.push(`${label}：live 场景必须有且仅有一个合法 collectionId`);
    }
    if (!Number.isInteger(scene.collectionOrder) || scene.collectionOrder < 1) {
      errors.push(`${label}：live 场景必须有大于 0 的整数 collectionOrder`);
    }
    if (!Array.isArray(scene.tags) || scene.tags.length === 0) {
      errors.push(`${label}：live 场景至少需要一个 tags 值`);
    } else {
      for (const tag of scene.tags) if (!allowedTags.has(tag)) errors.push(`${label}：未知标签 ${tag}`);
    }
    if (legalCollectionIds.has(scene.collectionId) && Number.isInteger(scene.collectionOrder)) {
      const key = `${scene.collectionId}:${scene.collectionOrder}`;
      if (orderOwners.has(key)) errors.push(`${label}：collectionOrder 与 ${orderOwners.get(key)} 冲突（${key}）`);
      else orderOwners.set(key, label);
    }
  }
}

const freeSceneIds = new Set((manifest.scenes ?? []).filter((scene) => scene.isFreeExperience === true).map((scene) => scene.externalId));
for (const id of expectedFreeSceneIds) if (!freeSceneIds.has(id)) errors.push(`免费体验缺少固定场景 ${id}`);
for (const id of freeSceneIds) if (!expectedFreeSceneIds.has(id)) errors.push(`免费体验包含了非固定场景 ${id}`);

if (errors.length > 0) {
  console.error(`合集数据校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`合集数据校验通过：${collections.length} 个合集，${manifest.scenes.length} 个场景，3 个免费体验场景。`);
}
