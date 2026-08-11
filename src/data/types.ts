export interface DialogueLine {
  // Raw role name as authored on the sheet (e.g. "Teacher", "Dentist",
  // "Parent A") — not a fixed enum. See src/data/speakerRoles.ts for how
  // the UI derives a legend and per-line labels from whatever roles a
  // scene's dialogue actually contains.
  speaker: string;
  speakerZh: string;
  en: string;
  zh: string;
  // Present only for scenes migrated to the dialogue_lines table (see
  // supabase/migrations/0012_add_dialogue_lines.sql) — seconds from video
  // start, one line = one subtitle cue. Absent for scenes still on the
  // legacy scenes.dialogue/subtitle_cues jsonb pair, where SceneDetailPage
  // falls back to matching dialogue text against subtitle_cues instead.
  start?: number;
  end?: number;
  // Permanent line identity (public.dialogue_lines.external_line_id) —
  // see supabase/migrations/0013_add_external_ids.sql. Present only for
  // scenes migrated to dialogue_lines AND whose rows have already been
  // backfilled with a real external_line_id (not yet true for any scene
  // as of Phase A-0 — see 0019_sync_scene_rpc.sql's header
  // comment). Prefer this as the React key when rendering dialogue lines;
  // fall back to `id` (stable per scene, but not across a delete+reinsert
  // sync — see dialogueLineDbId below) and finally array index only for
  // scenes with neither.
  externalLineId?: string;
  // The dialogue_lines table's own internal database id — present for any
  // scene migrated to dialogue_lines, regardless of external_line_id
  // backfill status. NOT guaranteed stable across a sync for a scene that
  // has not yet been cut over to the external_line_id-based upsert RPC
  // (see 0019_sync_scene_rpc.sql) — the old replace_dialogue_lines
  // path (0012) still deletes and reinserts every row, so this id changes
  // on every sync until that cutover happens for a given scene.
  dialogueLineDbId?: number;
}

export interface Expression {
  label: string;
  en: string;
  zh: string;
  note: string;
}

export interface VocabularyEntry {
  word: string;
  phonetic: string;
  pos: string;
  zh: string;
  example: string;
}

export interface CultureTip {
  type: string;
  title: string;
  titleZh: string;
  body: string;
  bodyZh: string;
}

export interface BilingualText {
  en: string;
  zh: string;
}

// One WebVTT-ready subtitle line, timed against the scene video (seconds
// from video start). Synced from the "Dialogue_Lines" Google Sheet tab —
// independent of SceneContent.dialogue, which has no per-line timing.
export interface SubtitleCue {
  start: number;
  end: number;
  en: string;
  zh: string;
}

export interface SceneContent {
  sceneSetup: BilingualText;
  learningGoal: BilingualText;
  dialogue: DialogueLine[];
  expressions: Expression[];
  vocabulary: VocabularyEntry[];
  tips: CultureTip[];
  relatedSceneIds?: number[];
  prevSceneId?: number;
  nextSceneId?: number;
}

export interface Scene {
  id: number;
  slug: string;
  titleEn: string;
  titleZh: string;
  category: string;
  region: string;
  level: string;
  duration: string;
  featured: boolean;
  isNew: boolean;
  desc: string;
  photo?: string;
  pdfUrl?: string;
  video_url?: string | null;
  subtitleCues?: SubtitleCue[] | null;
  content?: SceneContent;
}

export interface PdfResource {
  id: number;
  title: string;
  titleZh: string;
  type: string;
  desc: string;
  scenes: number;
  free: boolean;
  category: string;
  filePath?: string;
}

// A multi-scene PDF bundle pack shown on the Resources page — see
// src/data/resource-collections-access.ts and
// supabase/migrations/0023_create_resource_collections.sql. Independent of
// PdfResource/pdf_resources above (single-scene downloads linked from a
// Scene Detail page); this page never reads from that table.
export interface ResourceCollection {
  id: number;
  collectionId: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  collectionType: "daily_life" | "tests_licences" | "essential_services" | "travel";
  priceType: "free" | "paid";
  price: number | null;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  // Raw comma-separated external scene ids, e.g. "scene01, scene08" — see
  // ResourceCollectionRow.scene_ids. Display-only, never parsed here.
  sceneIds: string;
  sceneCount: number;
  sortOrder: number;
}
