import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAsyncData } from "./useAsyncData";
import { PDF_RESOURCES as MOCK_PDF_RESOURCES } from "./resources";
import type { PdfResource } from "./types";
import type { PdfResourceRow } from "./database.types";

// Dev-only mock fallback — same policy as src/data/scenes-access.ts: only
// used when Supabase env vars are missing or a request fails, and only in
// local development. Production surfaces failures as a real error state.
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

function mapPdfResourceRow(row: PdfResourceRow): PdfResource {
  return {
    id: row.id,
    title: row.title,
    titleZh: row.title_zh,
    type: row.type,
    desc: row.description,
    scenes: row.scene_count,
    free: row.is_free,
    category: row.category,
  };
}

async function fetchResources(): Promise<PdfResource[]> {
  return withDevFallback(
    async () => {
      const { data, error } = await supabase!
        .from("pdf_resources")
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPdfResourceRow);
    },
    () => MOCK_PDF_RESOURCES,
    "pdf resources"
  );
}

export function useResources() {
  return useAsyncData(fetchResources, []);
}
