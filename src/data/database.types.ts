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
          // See supabase/migrations/0022_add_scene_status_workflow_states.sql
          // — only 'published' is ever visible to anon/authenticated clients
          // (enforced by RLS, not by the app), the other three are CMS
          // review-workflow states.
          status: "draft" | "ready_to_review" | "hidden" | "published";
          // Permanent sync identity — see
          // supabase/migrations/0013_add_external_ids.sql /
          // 0014_adopt_scene_external_ids.sql. Nullable here because
          // those migrations have not been run against live data yet
          // (Phase A-0 is design-only); becomes NOT NULL once
          // 0017_set_external_ids_not_null.sql runs.
          external_scene_id: string | null;
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
          status?: "draft" | "ready_to_review" | "hidden" | "published";
          external_scene_id?: string | null;
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
          status?: "draft" | "ready_to_review" | "hidden" | "published";
          external_scene_id?: string | null;
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
      dialogue_lines: {
        Row: {
          id: number;
          scene_id: number;
          // Permanent line identity — see
          // supabase/migrations/0013_add_external_ids.sql. Nullable here
          // because it has not been backfilled against live data yet
          // (Phase A-0 is design-only) — the 18 existing rows for
          // shopping-for-clothes currently have NULL, see
          // 0019_sync_scene_rpc.sql's header comment.
          external_line_id: string | null;
          line_order: number;
          step: number | null;
          speaker: string;
          speaker_zh: string;
          dialogue_en: string;
          dialogue_zh: string;
          start_time: number | null;
          end_time: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          scene_id: number;
          external_line_id?: string | null;
          line_order: number;
          step?: number | null;
          speaker: string;
          speaker_zh: string;
          dialogue_en: string;
          dialogue_zh: string;
          start_time?: number | null;
          end_time?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          scene_id?: number;
          external_line_id?: string | null;
          line_order?: number;
          step?: number | null;
          speaker?: string;
          speaker_zh?: string;
          dialogue_en?: string;
          dialogue_zh?: string;
          start_time?: number | null;
          end_time?: number | null;
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
      resource_collections: {
        Row: {
          id: number;
          // Permanent sync identity — see
          // supabase/migrations/0023_create_resource_collections.sql and
          // google-apps-script/resource-collections-sync/Code.gs.
          external_collection_id: string;
          title_en: string;
          title_zh: string;
          description_en: string;
          description_zh: string;
          collection_type: "daily_life" | "tests_licences" | "essential_services" | "travel";
          price_type: "free" | "paid";
          price: number | null;
          cover_image_url: string | null;
          pdf_url: string | null;
          // Raw comma-separated external scene ids, e.g. "scene01, scene08"
          // — display-only, not a foreign key into public.scenes, and never
          // parsed/split server-side. See the migration's table comment.
          scene_ids: string;
          scene_count: number;
          status: "draft" | "published";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          external_collection_id: string;
          title_en: string;
          title_zh: string;
          description_en?: string;
          description_zh?: string;
          collection_type: "daily_life" | "tests_licences" | "essential_services" | "travel";
          price_type: "free" | "paid";
          price?: number | null;
          cover_image_url?: string | null;
          pdf_url?: string | null;
          scene_ids?: string;
          scene_count?: number;
          status?: "draft" | "published";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          external_collection_id?: string;
          title_en?: string;
          title_zh?: string;
          description_en?: string;
          description_zh?: string;
          collection_type?: "daily_life" | "tests_licences" | "essential_services" | "travel";
          price_type?: "free" | "paid";
          price?: number | null;
          cover_image_url?: string | null;
          pdf_url?: string | null;
          scene_ids?: string;
          scene_count?: number;
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
export type DialogueLineRow = Database["public"]["Tables"]["dialogue_lines"]["Row"];
export type PdfResourceRow = Database["public"]["Tables"]["pdf_resources"]["Row"];
export type ResourceCollectionRow = Database["public"]["Tables"]["resource_collections"]["Row"];

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
