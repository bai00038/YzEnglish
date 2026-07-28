import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAsyncData } from "./useAsyncData";
import { CATEGORIES as MOCK_CATEGORIES, SCENES as MOCK_SCENES } from "./scenes";
import type { Scene } from "./types";
import type {
  SceneRow,
  SceneDialogueJson,
  SceneExpressionsJson,
  SceneVocabularyJson,
  SceneTipsJson,
} from "./database.types";

// ---------------------------------------------------------------------------
// Dev-only mock fallback
//
// If Supabase isn't configured (missing env vars) or a request fails, local
// development falls back to the static mock data in ./scenes so the app
// still renders — loudly logged so it's never mistaken for real data.
// Production never falls back: a missing/broken Supabase connection surfaces
// as a real error state in the UI instead of silently serving mock content.
// ---------------------------------------------------------------------------
async function withDevFallback<T>(supabaseCall: () => Promise<T>, mockFallback: () => T, context: string): Promise<T> {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) {
      console.warn(
        `[dev-only mock fallback] Supabase env vars missing — using mock data for ${context}. ` +
          `Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to load real data.`
      );
      return mockFallback();
    }
    throw new Error(`Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY): ${context}`);
  }

  try {
    return await supabaseCall();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[dev-only mock fallback] Supabase request failed for ${context} — using mock data.`, err);
      return mockFallback();
    }
    throw err;
  }
}

type SceneRowWithCategory = SceneRow & { categories: { name_en: string } | null };

const SCENE_SELECT = "*, categories(name_en)";

function mapSceneRow(row: SceneRowWithCategory): Scene {
  // A scene "has content" (vs. the coming-soon placeholder) exactly when its
  // dialogue column is populated — expressions/vocabulary/tips/setup/goal are
  // always seeded together with it.
  const hasContent = row.dialogue !== null;

  return {
    id: row.id,
    slug: row.slug,
    titleEn: row.title_en,
    titleZh: row.title_zh,
    category: row.categories?.name_en ?? "",
    region: row.region,
    level: row.level,
    duration: row.duration,
    featured: row.featured,
    isNew: row.is_new,
    desc: row.description,
    photo: row.photo_url ?? undefined,
    content: hasContent
      ? {
          sceneSetup: { en: row.scene_setup_en ?? "", zh: row.scene_setup_zh ?? "" },
          learningGoal: { en: row.learning_goal_en ?? "", zh: row.learning_goal_zh ?? "" },
          dialogue: (row.dialogue as unknown as SceneDialogueJson) ?? [],
          expressions: (row.expressions as unknown as SceneExpressionsJson) ?? [],
          vocabulary: (row.vocabulary as unknown as SceneVocabularyJson) ?? [],
          tips: (row.tips as unknown as SceneTipsJson) ?? [],
          relatedSceneIds: row.related_scene_ids ?? undefined,
          prevSceneId: row.prev_scene_id ?? undefined,
          nextSceneId: row.next_scene_id ?? undefined,
        }
      : undefined,
  };
}

async function fetchScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES,
    "scenes list"
  );
}

async function fetchFeaturedScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .eq("featured", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES.filter(s => s.featured),
    "featured scenes"
  );
}

async function fetchNewScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .eq("is_new", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES.filter(s => s.isNew),
    "new scenes"
  );
}

async function fetchCategoryNames(): Promise<string[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("categories")
        .select("name_en")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(c => c.name_en);
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
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { scene: null, related: [], prevScene: null, nextScene: null };

      const row = data as SceneRowWithCategory;
      const scene = mapSceneRow(row);

      let related: Scene[] = [];
      const relatedIds = row.related_scene_ids ?? [];
      if (relatedIds.length > 0) {
        const { data: relatedRows, error: relatedError } = await supabase!
          .from("scenes")
          .select(SCENE_SELECT)
          .eq("status", "published")
          .in("id", relatedIds);
        if (relatedError) throw relatedError;
        related = ((relatedRows ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
      } else {
        const { data: sameCategoryRows, error: sameCategoryError } = await supabase!
          .from("scenes")
          .select(SCENE_SELECT)
          .eq("status", "published")
          .eq("category_id", row.category_id)
          .neq("id", row.id)
          .limit(3);
        if (sameCategoryError) throw sameCategoryError;
        related = ((sameCategoryRows ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
      }

      let prevScene: Scene | null = null;
      let nextScene: Scene | null = null;
      const navIds = [row.prev_scene_id, row.next_scene_id].filter((id): id is number => id != null);
      if (navIds.length > 0) {
        const { data: navRows, error: navError } = await supabase!
          .from("scenes")
          .select(SCENE_SELECT)
          .eq("status", "published")
          .in("id", navIds);
        if (navError) throw navError;
        const navScenes = ((navRows ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
        prevScene = navScenes.find(s => s.id === row.prev_scene_id) ?? null;
        nextScene = navScenes.find(s => s.id === row.next_scene_id) ?? null;
      }

      return { scene, related, prevScene, nextScene };
    },
    () => {
      const scene = MOCK_SCENES.find(s => s.slug === slug) ?? null;
      if (!scene) return { scene: null, related: [], prevScene: null, nextScene: null };

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
// Public hooks — used directly by pages
// ---------------------------------------------------------------------------
export function useScenes() {
  return useAsyncData(fetchScenes, []);
}

export function useFeaturedScenes() {
  return useAsyncData(fetchFeaturedScenes, []);
}

export function useNewScenes() {
  return useAsyncData(fetchNewScenes, []);
}

export function useCategoryNames() {
  return useAsyncData(fetchCategoryNames, []);
}

export function useSceneDetail(slug: string) {
  return useAsyncData(() => fetchSceneDetail(slug), [slug]);
}
