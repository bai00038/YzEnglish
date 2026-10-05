import { useAsyncData } from "./useAsyncData";
import { CATEGORIES } from "./scenes";
import {
  fetchEpisodeDetail,
  fetchManifestScenes,
  manifestEntryToScene,
} from "./oss-content";
import type { CultureTipItem, KeyExpressionItem, Scene } from "./types";

// ---------------------------------------------------------------------------
// OSS manifest-backed data layer.
//
// The public site fetches lesson data at runtime from content/manifest.json
// on OSS (see src/data/oss-content.ts). Adding a new episode = uploading its
// content package + appending one manifest entry — no rebuild, no redeploy.
//
// All hook APIs and filtering logic below are unchanged from the previous
// static version; only the data source moved from embedded ./scenes to the
// runtime manifest.
// ---------------------------------------------------------------------------

const CURATED_FEATURED_SLUGS = [
  "returning-clothes-at-a-store",
  "ordering-a-pizza-by-phone-for-pickup",
  "calling-about-a-childs-fever",
];

// The manifest IS the visible list — every entry in it is a published episode.
async function fetchVisibleScenes(): Promise<Scene[]> {
  const entries = await fetchManifestScenes();
  return entries.map(manifestEntryToScene);
}

function deriveLanguageModules(scene: Scene): Scene {
  if (!scene.content) return scene;

  const tips = scene.content.tips ?? [];
  const keyExpressions: KeyExpressionItem[] = tips
    .filter((tip) => tip.tipType === "key_expression")
    .map((tip) => ({ expressionEn: tip.title, expressionZh: tip.titleZh }));
  const cultureTips: CultureTipItem[] = tips
    .filter((tip) => tip.tipType === "culture_tip")
    .map((tip) => ({ bodyEn: tip.body, bodyZh: tip.bodyZh }));

  return {
    ...scene,
    content: {
      ...scene.content,
      keyExpressions,
      cultureTips,
    },
  };
}

async function fetchScenes(): Promise<Scene[]> {
  return fetchVisibleScenes();
}

async function fetchFeaturedScenes(): Promise<Scene[]> {
  const scenes = await fetchVisibleScenes();
  return scenes.filter((scene) => scene.featured);
}

async function fetchCuratedFeaturedScenes(): Promise<Scene[]> {
  const scenes = await fetchVisibleScenes();
  return CURATED_FEATURED_SLUGS
    .map((slug) => scenes.find((scene) => scene.slug === slug))
    .filter((scene): scene is Scene => Boolean(scene))
    .map((scene) => ({ ...scene }));
}

async function fetchLatestScenes(limit: number): Promise<Scene[]> {
  const scenes = await fetchVisibleScenes();
  return [...scenes].sort((a, b) => {
    const aPublished = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
    const bPublished = b.publishedAt ? Date.parse(b.publishedAt) : NaN;
    const aHasDate = Number.isFinite(aPublished);
    const bHasDate = Number.isFinite(bPublished);
    if (aHasDate && bHasDate) return bPublished - aPublished || b.id - a.id;
    if (aHasDate !== bHasDate) return bHasDate ? 1 : -1;
    return b.id - a.id;
  }).slice(0, limit);
}

async function fetchNewScenes(): Promise<Scene[]> {
  const scenes = await fetchVisibleScenes();
  return scenes.filter((scene) => scene.isNew);
}

async function fetchCategoryNames(): Promise<string[]> {
  return [...CATEGORIES];
}

export interface SceneDetail {
  scene: Scene | null;
  related: Scene[];
  prevScene: Scene | null;
  nextScene: Scene | null;
}

async function fetchSceneDetail(slug: string): Promise<SceneDetail> {
  const scenes = await fetchVisibleScenes();
  const entry = scenes.find((scene) => scene.slug === slug) ?? null;
  if (!entry) return { scene: null, related: [], prevScene: null, nextScene: null };

  // Full content (dialogue, tips) comes from the episode's scene.json.
  const manifestEntries = await fetchManifestScenes();
  const manifestEntry = manifestEntries.find((e) => e.slug === slug) ?? null;
  const fullScene = manifestEntry
    ? deriveLanguageModules(await fetchEpisodeDetail(manifestEntry))
    : deriveLanguageModules({ ...entry });

  const relatedIds = fullScene.content?.relatedSceneIds;
  const related = relatedIds
    ? relatedIds
        .map((id) => scenes.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is Scene => Boolean(candidate))
        .map((candidate) => ({ ...candidate }))
    : scenes
        .filter((candidate) => candidate.id !== fullScene.id && candidate.category === fullScene.category)
        .slice(0, 3)
        .map((candidate) => ({ ...candidate }));

  const prevScene = fullScene.content?.prevSceneId
    ? scenes.find((candidate) => candidate.id === fullScene.content?.prevSceneId) ?? null
    : null;
  const nextScene = fullScene.content?.nextSceneId
    ? scenes.find((candidate) => candidate.id === fullScene.content?.nextSceneId) ?? null
    : null;

  return {
    scene: fullScene,
    related,
    prevScene: prevScene ? { ...prevScene } : null,
    nextScene: nextScene ? { ...nextScene } : null,
  };
}

export function useScenes() {
  return useAsyncData(fetchScenes, []);
}

export function useFeaturedScenes() {
  return useAsyncData(fetchFeaturedScenes, []);
}

export function useCuratedFeaturedScenes() {
  return useAsyncData(fetchCuratedFeaturedScenes, []);
}

export function useNewScenes() {
  return useAsyncData(fetchNewScenes, []);
}

export function useLatestScenes(limit = 3) {
  return useAsyncData(() => fetchLatestScenes(limit), [limit]);
}

export function useCategoryNames() {
  return useAsyncData(fetchCategoryNames, []);
}

export function useSceneDetail(slug: string) {
  return useAsyncData(() => fetchSceneDetail(slug), [slug]);
}
