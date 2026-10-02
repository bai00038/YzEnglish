import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAsyncData } from "./useAsyncData";
import { CATEGORIES as MOCK_CATEGORIES, SCENES as MOCK_SCENES, VISIBLE_SCENE_SLUGS } from "./scenes";
import type { CultureTip, CultureTipItem, KeyExpressionItem, Scene, TipType } from "./types";
import type {
  SceneRow,
  DialogueLineRow,
  KeyExpressionRow,
  CultureTipRow,
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

// Missing/unrecognized tipType -> "key_expression" — same compat default
// as the Edge Function's requireTipType (supabase/functions/sync-scene/
// validation.ts) and Code.gs's loadTipsBySceneId_, for tips synced before
// tip_type existed. Never throws: a malformed tip here must not break the
// whole scene page.
function normalizeTipType(raw: unknown): TipType {
  return raw === "culture_tip" ? "culture_tip" : "key_expression";
}

function normalizeTips(raw: SceneTipsJson | null | undefined): CultureTip[] {
  if (!raw) return [];
  return raw.map(tip => ({ ...tip, tipType: normalizeTipType(tip.tipType) }));
}

function mapSceneRow(row: SceneRowWithCategory): Scene {
  // A scene "has content" (vs. the coming-soon placeholder) when EITHER of
  // two independent pipelines has populated it:
  //  - Figma_Data (legacy): dialogue jsonb populated, and expressions/
  //    vocabulary/tips/setup/goal always seeded together with it.
  //  - scenes-sync (current): dialogue jsonb is deliberately NEVER set (see
  //    the header comment in google-apps-script/scenes-sync/Code.gs) — this
  //    pipeline's scenes are fully on dialogue_lines instead, but still
  //    seed scene_setup_en/learning_goal_en/tips, so dialogue alone can't be
  //    the signal or a scenes-sync-only scene (e.g. scene_030) would wrongly
  //    render as "coming soon" with its real tips/setup/goal silently
  //    dropped by applyDialogueLinesOverride below.
  const hasContent = row.dialogue !== null || row.scene_setup_en !== null;

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
          tips: normalizeTips(row.tips as unknown as SceneTipsJson),
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

  const dialogue = (data as DialogueLineRow[]).map(row => {
    // Defensive Number() coercion, same rule as normalizeSubtitleCues
    // above — dialogue_lines.start_time/end_time are already seconds
    // (see 0012_add_dialogue_lines.sql and Code.gs's hasValidTimecode),
    // never milliseconds, so this must never divide by 1000.
    const start = row.start_time === null || row.start_time === undefined ? undefined : Number(row.start_time);
    const end = row.end_time === null || row.end_time === undefined ? undefined : Number(row.end_time);
    return {
      speaker: row.speaker,
      speakerZh: row.speaker_zh,
      en: row.dialogue_en,
      zh: row.dialogue_zh,
      start: start !== undefined && Number.isFinite(start) ? start : undefined,
      end: end !== undefined && Number.isFinite(end) ? end : undefined,
      externalLineId: row.external_line_id ?? undefined,
      dialogueLineDbId: row.id,
    };
  });

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

// Reads one child table for a scene, never throwing — a failed query for
// key_expressions must not take down culture_tips or the rest of the
// page. Returning [] on error also correctly triggers this module's own
// legacy-tips fallback below, the same as a genuinely-empty table would.
async function fetchChildRows<T>(table: "key_expressions" | "culture_tips", sceneId: number): Promise<T[]> {
  try {
    const { data, error } = await supabase!
      .from(table)
      .select("*")
      .eq("scene_id", sceneId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (err) {
    console.error(`[scenes-access] failed to load ${table} for scene_id=${sceneId}`, err);
    return [];
  }
}

// ─── Temporary legacy Tips fallback ─────────────────────────────────────
//
// public.key_expressions/public.culture_tips (see
// supabase/migrations/0025_create_key_expressions_and_culture_tips.sql)
// are the new, primary source for the scene detail page's "Learn the
// Language" module. Until every scene has been re-authored into them,
// though, most scenes still only have data in the legacy scenes.tips
// jsonb column (already loaded onto scene.content.tips by mapSceneRow).
//
// Fallback is decided independently per module, never both-or-nothing:
// if key_expressions has any rows for this scene, those rows are used
// exclusively for the Key Expressions module (legacy key_expression-type
// tips are ignored); otherwise the legacy tips are used for that module
// alone. Same independent rule for culture_tips. This guarantees the two
// sources are never combined for the same module (no duplicates), while
// still letting a partially-migrated scene (e.g. only Key_Expressions
// authored so far) render correctly.
//
// DELETE THIS WHOLE FUNCTION (and its one call site in fetchSceneDetail
// below) once every scene has real key_expressions/culture_tips rows and
// scenes.tips/the old Tips sheet are retired — nothing else needs to
// change at that point, SceneContent.tips can stay or go independently.
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

async function applyKeyExpressionsAndCultureTips(scene: Scene, sceneId: number): Promise<Scene> {
  const [keyExpressionRows, cultureTipRows] = await Promise.all([
    fetchChildRows<KeyExpressionRow>("key_expressions", sceneId),
    fetchChildRows<CultureTipRow>("culture_tips", sceneId),
  ]);

  const legacyTips = scene.content?.tips ?? [];

  const keyExpressions: KeyExpressionItem[] =
    keyExpressionRows.length > 0
      ? keyExpressionRows.map(row => ({
          expressionEn: row.expression_en,
          expressionZh: row.expression_zh,
        }))
      : deriveKeyExpressionsFromLegacyTips(legacyTips);

  const cultureTips: CultureTipItem[] =
    cultureTipRows.length > 0
      ? cultureTipRows.map(row => ({
          bodyEn: row.body_en,
          bodyZh: row.body_zh,
        }))
      : deriveCultureTipsFromLegacyTips(legacyTips);

  return {
    ...scene,
    content: scene.content ? { ...scene.content, keyExpressions, cultureTips } : scene.content,
  };
}
// ─── End temporary legacy Tips fallback ─────────────────────────────────

async function fetchScenes(): Promise<Scene[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("scenes")
        .select(SCENE_SELECT)
        .eq("status", "published")
        .in("slug", VISIBLE_SCENE_SLUGS)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES.filter(scene => VISIBLE_SCENE_SLUGS.includes(scene.slug)),
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
        .in("slug", VISIBLE_SCENE_SLUGS)
        .eq("featured", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES.filter(s => s.featured && VISIBLE_SCENE_SLUGS.includes(s.slug)),
    "featured scenes"
  );
}

// Manually curated Home page "Featured Scenes" — stable slugs, in display
// order. Update this list (not a `featured` flag) to change what's shown.
// As of 2026-08-10 these are the only three published scenes.
const CURATED_FEATURED_SLUGS = [
  "returning-clothes-at-a-store",
  "ordering-a-pizza-by-phone-for-pickup",
  "calling-about-a-childs-fever",
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
        .in("slug", VISIBLE_SCENE_SLUGS)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES.filter(scene => VISIBLE_SCENE_SLUGS.includes(scene.slug)).sort((a, b) => b.id - a.id).slice(0, limit),
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
        .in("slug", VISIBLE_SCENE_SLUGS)
        .eq("is_new", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
    },
    () => MOCK_SCENES.filter(s => s.isNew && VISIBLE_SCENE_SLUGS.includes(s.slug)),
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
      let scene = await applyDialogueLinesOverride(mapSceneRow(row), row.id);
      scene = await applyKeyExpressionsAndCultureTips(scene, row.id);

      let related: Scene[] = [];
      const relatedIds = row.related_scene_ids ?? [];
      if (relatedIds.length > 0) {
        const { data: relatedRows, error: relatedError } = await supabase!
          .from("scenes")
          .select(SCENE_SELECT)
          .eq("status", "published")
          .in("slug", VISIBLE_SCENE_SLUGS)
          .in("id", relatedIds);
        if (relatedError) throw relatedError;
        related = ((relatedRows ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
      } else {
        const { data: sameCategoryRows, error: sameCategoryError } = await supabase!
          .from("scenes")
          .select(SCENE_SELECT)
          .eq("status", "published")
          .in("slug", VISIBLE_SCENE_SLUGS)
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
          .in("slug", VISIBLE_SCENE_SLUGS)
          .in("id", navIds);
        if (navError) throw navError;
        const navScenes = ((navRows ?? []) as SceneRowWithCategory[]).map(mapSceneRow);
        prevScene = navScenes.find(s => s.id === row.prev_scene_id) ?? null;
        nextScene = navScenes.find(s => s.id === row.next_scene_id) ?? null;
      }

      return { scene, related, prevScene, nextScene };
    },
    () => {
      const mockScene = MOCK_SCENES.find(s => s.slug === slug) ?? null;
      if (!mockScene) return { scene: null, related: [], prevScene: null, nextScene: null };

      // Dev-only mock fallback has no database to query key_expressions/
      // culture_tips from — derive them from the mock's own tips[] so the
      // Language module still renders locally without Supabase. See
      // "Temporary legacy Tips fallback" above.
      const legacyTips = mockScene.content?.tips ?? [];
      const scene: Scene = {
        ...mockScene,
        content: mockScene.content
          ? {
              ...mockScene.content,
              keyExpressions: deriveKeyExpressionsFromLegacyTips(legacyTips),
              cultureTips: deriveCultureTipsFromLegacyTips(legacyTips),
            }
          : mockScene.content,
      };

      const relatedIds = scene.content?.relatedSceneIds;
      const related = relatedIds
        ? relatedIds.map(id => MOCK_SCENES.find(s => s.id === id && VISIBLE_SCENE_SLUGS.includes(s.slug))).filter((s): s is Scene => Boolean(s))
        : MOCK_SCENES.filter(s => s.id !== scene.id && s.category === scene.category && VISIBLE_SCENE_SLUGS.includes(s.slug)).slice(0, 3);

      const prevScene = scene.content?.prevSceneId
        ? MOCK_SCENES.find(s => s.id === scene.content!.prevSceneId && VISIBLE_SCENE_SLUGS.includes(s.slug)) ?? null
        : null;
      const nextScene = scene.content?.nextSceneId
        ? MOCK_SCENES.find(s => s.id === scene.content!.nextSceneId && VISIBLE_SCENE_SLUGS.includes(s.slug)) ?? null
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
