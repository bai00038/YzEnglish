import { useAsyncData } from "./useAsyncData";
import { CATEGORIES as MOCK_CATEGORIES, SCENES as MOCK_SCENES } from "./scenes";
import {
  fetchEpisodeDetail,
  fetchManifestScenes,
  manifestEntryToScene,
  type ManifestScene,
} from "./oss-content";
import type { CultureTip, CultureTipItem, KeyExpressionItem, Scene } from "./types";

// ---------------------------------------------------------------------------
// OSS-backed data layer (Supabase retired).
//
// List views read the episode manifest; the detail view additionally fetches
// the episode's scene.json. See src/data/oss-content.ts for the fetch +
// schema-normalization logic.
//
// Dev-only mock fallback policy (unchanged): if the OSS fetch fails in local
// development, fall back to the static mock data in ./scenes so the app
// still renders — loudly logged so it's never mistaken for real data.
// Production never falls back: a failed fetch surfaces as a real error state
// in the UI instead of silently serving mock content.
// ---------------------------------------------------------------------------
async function withDevFallback<T>(ossCall: () => Promise<T>, mockFallback: () => T, context: string): Promise<T> {
  try {
    return await ossCall();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[dev-only mock fallback] OSS request failed for ${context} — using mock data.`, err);
      return mockFallback();
    }
    throw err;
  }
}

// ─── Legacy Tips fallback (unchanged) ─────────────────────────────────────
//
// The scene detail page's "Learn the Language" module renders
// content.keyExpressions / content.cultureTips. OSS scene.json files only
// carry the legacy tips[] array, so those two fields are derived here —
// the same split rule as before: key_expression-type tips feed the Key
// Expressions grid, culture_tip-type tips feed the Culture Tips cards.
// The two sources are never combined for the same module (no duplicates).
function deriveKeyExpressionsFromLegacyTips(tips: CultureTip[]): KeyExpressionItem[] {
  return tips
    .filter(tip => tip.tipType === "key_expression")
    .map(tip => ({ expressionEn: tip.title, expressionZh: tip.titleZh }));
}

function deriveCultureTipsFromLegacyTips(tips: CultureTip[]): CultureTipItem[] {
  return tips
    .filter(tip => tip.tipType === "culture_tip")
    .map(tip => ({ bodyEn: tip.body, bodyZh: tip.bodyZh }));
}

function withDerivedLanguageModule(scene: Scene): Scene {
  const legacyTips = scene.content?.tips ?? [];
  return {
    ...scene,
    content: scene.content
      ? {
          ...scene.content,
          keyExpressions: deriveKeyExpressionsFromLegacyTips(legacyTips),
          cultureTips: deriveCultureTipsFromLegacyTips(legacyTips),
        }
      : scene.content,
  };
}
// ─── End legacy Tips fallback ─────────────────────────────────────────────

async function fetchScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => (await fetchManifestScenes()).map(manifestEntryToScene),
    () => MOCK_SCENES,
    "scenes list"
  );
}

async function fetchFeaturedScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => (await fetchManifestScenes()).filter(e => e.featured).map(manifestEntryToScene),
    () => MOCK_SCENES.filter(s => s.featured),
    "featured scenes"
  );
}

// Manually curated Home page "Featured Scenes" — stable slugs, in display
// order. Update this list (not a `featured` flag) to change what's shown.
const CURATED_FEATURED_SLUGS = [
  "returning-clothes-at-a-store", // SH-01-004 — 挑选温和的卸妆产品
  "ordering-a-pizza-by-phone-for-pickup", // FD-01-001 — 电话订披萨
  "calling-about-a-childs-fever", // HC-01-002 — 孩子发烧电话约诊
  "ordering-restaurant-delivery-by-phone", // FD-01-002 — 电话点外卖
];

function orderBySlugList(entries: ManifestScene[], slugs: string[]): ManifestScene[] {
  const bySlug = new Map(entries.map(e => [e.slug, e]));
  return slugs.map(slug => bySlug.get(slug)).filter((e): e is ManifestScene => Boolean(e));
}

async function fetchCuratedFeaturedScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () =>
      orderBySlugList(await fetchManifestScenes(), CURATED_FEATURED_SLUGS).map(manifestEntryToScene),
    () =>
      CURATED_FEATURED_SLUGS.map(slug => MOCK_SCENES.find(s => s.slug === slug)).filter(
        (s): s is Scene => Boolean(s)
      ),
    "curated featured scenes"
  );
}

async function fetchLatestScenes(limit: number): Promise<Scene[]> {
  return withDevFallback(
    async () =>
      [...(await fetchManifestScenes())]
        .reverse()
        .slice(0, limit)
        .map(manifestEntryToScene),
    () => [...MOCK_SCENES].sort((a, b) => b.id - a.id).slice(0, limit),
    "latest scenes"
  );
}

async function fetchNewScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => (await fetchManifestScenes()).filter(e => e.isNew).map(manifestEntryToScene),
    () => MOCK_SCENES.filter(s => s.isNew),
    "new scenes"
  );
}

async function fetchCategoryNames(): Promise<string[]> {
  return withDevFallback(
    async () => {
      const seen = new Set<string>();
      for (const entry of await fetchManifestScenes()) {
        if (entry.category && !seen.has(entry.category)) seen.add(entry.category);
      }
      return [...seen];
    },
    () => MOCK_CATEGORIES,
    "category list"
  );
}

export interface SceneDetail {
  scene: Scene | null;
  related: Scene[];
  prevScene: Scene | null;
  nextScene: Scene | null;
}

async function fetchSceneDetail(slug: string): Promise<SceneDetail> {
  return withDevFallback(
    async () => {
      const entries = await fetchManifestScenes();
      const entry = entries.find(e => e.slug === slug);
      if (!entry) return { scene: null, related: [], prevScene: null, nextScene: null };

      const scene = withDerivedLanguageModule(await fetchEpisodeDetail(entry));
      const idx = entries.indexOf(entry);

      // Related: same-category episodes first (max 3), excluding self.
      const related = entries
        .filter(e => e.slug !== slug && e.category === entry.category)
        .slice(0, 3)
        .map(manifestEntryToScene);

      // Prev/next: manifest order is the curated episode order.
      const prevScene = idx > 0 ? manifestEntryToScene(entries[idx - 1]) : null;
      const nextScene = idx < entries.length - 1 ? manifestEntryToScene(entries[idx + 1]) : null;

      return { scene, related, prevScene, nextScene };
    },
    () => {
      const mockScene = MOCK_SCENES.find(s => s.slug === slug) ?? null;
      if (!mockScene) return { scene: null, related: [], prevScene: null, nextScene: null };

      // Dev-only mock fallback has no database — derive the language module
      // from the mock's own tips[] so it still renders locally without OSS.
      const scene = withDerivedLanguageModule(mockScene);

      const relatedIds = scene.content?.relatedSceneIds;
      const related = relatedIds
        ? relatedIds.map(id => MOCK_SCENES.find(s => s.id === id)).filter((s): s is Scene => Boolean(s))
        : MOCK_SCENES.filter(s => s.id !== scene.id && s.category === scene.category).slice(0, 3);

      const prevScene = scene.content?.prevSceneId
        ? MOCK_SCENES.find(s => s.id === scene.content!.prevSceneId) ?? null
        : null;
      const nextScene = scene.content?.nextSceneId
        ? MOCK_SCENES.find(s => s.id === scene.content!.nextSceneId) ?? null
        : null;

      return { scene, related, prevScene, nextScene };
    },
    `scene detail for slug "${slug}"`
  );
}

// ---------------------------------------------------------------------------
// Public hooks — used directly by pages (signatures unchanged)
// ---------------------------------------------------------------------------
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
