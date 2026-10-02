import { useAsyncData } from "./useAsyncData";
import { CATEGORIES, SCENES, VISIBLE_SCENE_SLUGS } from "./scenes";
import type { CultureTipItem, KeyExpressionItem, Scene } from "./types";

// The public site no longer reads lesson data from Supabase. Scene structure,
// bilingual copy, timings, and learning notes live in scenes.ts; video/media
// URLs on each scene point to Aliyun OSS. Keeping one source here guarantees
// local preview and the deployed site render the same published lessons.

const CURATED_FEATURED_SLUGS = [
  "returning-clothes-at-a-store",
  "ordering-a-pizza-by-phone-for-pickup",
  "calling-about-a-childs-fever",
];

const VISIBLE_SCENES = SCENES.filter((scene) => VISIBLE_SCENE_SLUGS.includes(scene.slug));

function cloneVisibleScenes() {
  return VISIBLE_SCENES.map((scene) => ({ ...scene }));
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
  return cloneVisibleScenes();
}

async function fetchFeaturedScenes(): Promise<Scene[]> {
  return cloneVisibleScenes().filter((scene) => scene.featured);
}

async function fetchCuratedFeaturedScenes(): Promise<Scene[]> {
  return CURATED_FEATURED_SLUGS
    .map((slug) => VISIBLE_SCENES.find((scene) => scene.slug === slug))
    .filter((scene): scene is Scene => Boolean(scene))
    .map((scene) => ({ ...scene }));
}

async function fetchLatestScenes(limit: number): Promise<Scene[]> {
  return cloneVisibleScenes().sort((a, b) => b.id - a.id).slice(0, limit);
}

async function fetchNewScenes(): Promise<Scene[]> {
  return cloneVisibleScenes().filter((scene) => scene.isNew);
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
  const sourceScene = VISIBLE_SCENES.find((scene) => scene.slug === slug) ?? null;
  if (!sourceScene) return { scene: null, related: [], prevScene: null, nextScene: null };

  const scene = deriveLanguageModules({ ...sourceScene });
  const relatedIds = scene.content?.relatedSceneIds;
  const related = relatedIds
    ? relatedIds
        .map((id) => VISIBLE_SCENES.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is Scene => Boolean(candidate))
        .map((candidate) => ({ ...candidate }))
    : VISIBLE_SCENES
        .filter((candidate) => candidate.id !== scene.id && candidate.category === scene.category)
        .slice(0, 3)
        .map((candidate) => ({ ...candidate }));

  const prevScene = scene.content?.prevSceneId
    ? VISIBLE_SCENES.find((candidate) => candidate.id === scene.content?.prevSceneId) ?? null
    : null;
  const nextScene = scene.content?.nextSceneId
    ? VISIBLE_SCENES.find((candidate) => candidate.id === scene.content?.nextSceneId) ?? null
    : null;

  return {
    scene,
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
