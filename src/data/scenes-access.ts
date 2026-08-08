import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAsyncData } from "./useAsyncData";
import { CATEGORIES as MOCK_CATEGORIES, SCENES as MOCK_SCENES } from "./scenes";
import type { Scene } from "./types";
import type {
  SceneRow,
  DialogueLineRow,
  SceneDialogueJson,
  SceneExpressionsJson,
  SceneVocabularyJson,
  SceneTipsJson,
  SceneSubtitleCuesJson,
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

// Defensive Number() coercion, same rule as the Edge Function's
// normalizeTimecode (supabase/functions/sync-scene/validation.ts) and
// Code.gs's hasValidTimecode: never trust that a JSONB number necessarily
// deserializes as a JS number end-to-end, and never let one malformed
// cue in scenes.subtitle_cues break the whole page — it's just dropped.
function normalizeSubtitleCues(raw: unknown): SceneSubtitleCuesJson | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cues = (raw as Array<Record<string, unknown>>)
    .map(cue => ({
      start: Number(cue.start),
      end: Number(cue.end),
      en: typeof cue.en === "string" ? cue.en : "",
      zh: typeof cue.zh === "string" ? cue.zh : "",
    }))
    .filter(
      cue =>
        Number.isFinite(cue.start) &&
        Number.isFinite(cue.end) &&
        cue.end > cue.start &&
        cue.en.length > 0 &&
        cue.zh.length > 0
    );
  return cues.length > 0 ? cues : undefined;
}

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
    pdfUrl: row.pdf_url ?? undefined,
    video_url: row.video_url ?? undefined,
    subtitleCues: normalizeSubtitleCues(row.subtitle_cues),
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

// Scenes migrated to the dialogue_lines table (see
// supabase/migrations/0012_add_dialogue_lines.sql) get their
// content.dialogue overridden here with the row-per-line, natively-timed
// version — one row = one dialogue line = one subtitle cue (see the
// scene detail page's dialogueLineAudioRanges, which uses line.start/end
// directly when present instead of text-matching against subtitle_cues).
// A scene with no dialogue_lines rows yet is returned unchanged, still
// rendering from the legacy scenes.dialogue jsonb exactly as before —
// this is the only place that decides which structure a scene is on,
// nothing else in the data layer or UI needs to know.
async function applyDialogueLinesOverride(scene: Scene, sceneId: number): Promise<Scene> {
  const { data, error } = await supabase!
    .from("dialogue_lines")
    .select("*")
    .eq("scene_id", sceneId)
    .order("line_order", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return scene;

  const dialogue = (data as DialogueLineRow[]).map(row => ({
    speaker: row.speaker,
    speakerZh: row.speaker_zh,
    en: row.dialogue_en,
    zh: row.dialogue_zh,
    start: row.start_time ?? undefined,
    end: row.end_time ?? undefined,
    externalLineId: row.external_line_id ?? undefined,
    dialogueLineDbId: row.id,
  }));

  return {
    ...scene,
    content: {
      sceneSetup: scene.content?.sceneSetup ?? { en: "", zh: "" },
      learningGoal: scene.content?.learningGoal ?? { en: "", zh: "" },
      expressions: scene.content?.expressions ?? [],
      vocabulary: scene.content?.vocabulary ?? [],
      tips: scene.content?.tips ?? [],
      relatedSceneIds: scene.content?.relatedSceneIds,
      prevSceneId: scene.content?.prevSceneId,
      nextSceneId: scene.content?.nextSceneId,
      dialogue,
    },
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

// Manually curated Home page "Featured Scenes" — stable slugs, in display
// order. Update this list (not a `featured` flag) to change what's shown.
const CURATED_FEATURED_SLUGS = [
  "shopping-for-clothes", // 买衣服 — has video + subtitles + dialogue_lines
  "getting-a-dental-filling", // 补牙 — has video + subtitles
];

async function fetchCuratedFeaturedScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .in("slug", CURATED_FEATURED_SLUGS);
      if (error) throw error;
      const scenes = ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
      return CURATED_FEATURED_SLUGS.map(slug => scenes.find(s => s.slug === slug)).filter(
        (s): s is Scene => Boolean(s)
      );
    },
    () =>
      CURATED_FEATURED_SLUGS.map(slug => MOCK_SCENES.find(s => s.slug === slug)).filter(
        (s): s is Scene => Boolean(s)
      ),
    "curated featured scenes"
  );
}

async function fetchLatestScenes(limit: number): Promise<Scene[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => [...MOCK_SCENES].sort((a, b) => b.id - a.id).slice(0, limit),
    "latest scenes"
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
      const scene = await applyDialogueLinesOverride(mapSceneRow(row), row.id);

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
