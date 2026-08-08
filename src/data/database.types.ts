// Hand-written to match supabase/migrations/*.sql exactly.
// If the schema changes, prefer regenerating with the Supabase CLI:
//   supabase gen types typescript --local > src/data/database.types.ts
// and re-adding the trailing convenience aliases below.
//
// Not used by the app yet — src/data/scenes-access.ts and src/data/resources.ts
// still read from the static mock arrays. This file exists so the future
// swap to querying Supabase has a typed client (`SupabaseClient<Database>`)
// ready to go.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          slug: string;
          name_en: string;
          name_zh: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          slug: string;
          name_en: string;
          name_zh?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          slug?: string;
          name_en?: string;
          name_zh?: string | null;
          sort_order?: number;
          created_at?: string;
        };
      };
      scenes: {
        Row: {
          id: number;
          slug: string;
          title_en: string;
          title_zh: string;
          category_id: number;
          region: string;
          level: string;
          duration: string;
          featured: boolean;
          is_new: boolean;
          description: string;
          photo_url: string | null;
          pdf_url: string | null;
          video_url: string | null;
          subtitle_cues: Json | null;
          status: "draft" | "published";
          scene_setup_en: string | null;
          scene_setup_zh: string | null;
          learning_goal_en: string | null;
          learning_goal_zh: string | null;
          dialogue: Json | null;
          expressions: Json | null;
          vocabulary: Json | null;
          tips: Json | null;
          related_scene_ids: number[] | null;
          prev_scene_id: number | null;
          next_scene_id: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          slug: string;
          title_en: string;
          title_zh: string;
          category_id: number;
          region: string;
          level: string;
          duration: string;
          featured?: boolean;
          is_new?: boolean;
          description: string;
          photo_url?: string | null;
          pdf_url?: string | null;
          video_url?: string | null;
          subtitle_cues?: Json | null;
          status?: "draft" | "published";
          scene_setup_en?: string | null;
          scene_setup_zh?: string | null;
          learning_goal_en?: string | null;
          learning_goal_zh?: string | null;
          dialogue?: Json | null;
          expressions?: Json | null;
          vocabulary?: Json | null;
          tips?: Json | null;
          related_scene_ids?: number[] | null;
          prev_scene_id?: number | null;
          next_scene_id?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          slug?: string;
          title_en?: string;
          title_zh?: string;
          category_id?: number;
          region?: string;
          level?: string;
          duration?: string;
          featured?: boolean;
          is_new?: boolean;
          description?: string;
          photo_url?: string | null;
          pdf_url?: string | null;
          video_url?: string | null;
          subtitle_cues?: Json | null;
          status?: "draft" | "published";
          scene_setup_en?: string | null;
          scene_setup_zh?: string | null;
          learning_goal_en?: string | null;
          learning_goal_zh?: string | null;
          dialogue?: Json | null;
          expressions?: Json | null;
          vocabulary?: Json | null;
          tips?: Json | null;
          related_scene_ids?: number[] | null;
          prev_scene_id?: number | null;
          next_scene_id?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      pdf_resources: {
        Row: {
          id: number;
          title: string;
          title_zh: string;
          type: string;
          description: string;
          scene_count: number;
          is_free: boolean;
          category: string;
          file_path: string | null;
          status: "draft" | "published";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          title_zh: string;
          type: string;
          description: string;
          scene_count?: number;
          is_free?: boolean;
          category: string;
          file_path?: string | null;
          status?: "draft" | "published";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          title_zh?: string;
          type?: string;
          description?: string;
          scene_count?: number;
          is_free?: boolean;
          category?: string;
          file_path?: string | null;
          status?: "draft" | "published";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

// Convenience row aliases for the future data-layer swap.
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type SceneRow = Database["public"]["Tables"]["scenes"]["Row"];
export type PdfResourceRow = Database["public"]["Tables"]["pdf_resources"]["Row"];

// The shape of scenes.dialogue / expressions / vocabulary / tips once parsed
// out of Json, matching src/data/types.ts (DialogueLine, Expression,
// VocabularyEntry, CultureTip). Kept here (not imported) since this file
// mirrors the database schema, not the frontend's runtime types.
export type SceneDialogueJson = Array<{
  speaker: string;
  speakerZh: string;
  en: string;
  zh: string;
}>;

export type SceneExpressionsJson = Array<{
  label: string;
  en: string;
  zh: string;
  note: string;
}>;

export type SceneVocabularyJson = Array<{
  word: string;
  phonetic: string;
  pos: string;
  zh: string;
  example: string;
}>;

export type SceneTipsJson = Array<{
  type: string;
  title: string;
  titleZh: string;
  body: string;
  bodyZh: string;
}>;

// One subtitle cue = one WebVTT-ready line, timed against the scene video.
// start/end are seconds from video start. Synced from the "Dialogue_Lines"
// Google Sheet tab (see google-apps-script/Code.gs), not from `dialogue`.
export type SceneSubtitleCuesJson = Array<{
  start: number;
  end: number;
  en: string;
  zh: string;
}>;
