import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAsyncData } from "./useAsyncData";
import type { ResourceCollection } from "./types";
import type { ResourceCollectionRow } from "./database.types";

// No dev-only mock fallback array exists for this table (unlike
// src/data/resources.ts's PDF_RESOURCES) — there's no legacy static data to
// fall back to, so an unconfigured/unreachable Supabase in dev just yields
// an empty list, same end state as "no published collections yet".
// Production still surfaces a real error rather than silently showing zero
// results.
async function fetchResourceCollections(): Promise<ResourceCollection[]> {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) {
      console.warn(
        "[dev-only mock fallback] Supabase env vars missing — showing zero resource collections. " +
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to load real data."
      );
      return [];
    }
    throw new Error("Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY): resource collections");
  }

  try {
    const { data, error } = await supabase!
      .from("resource_collections")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapResourceCollectionRow);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[dev-only mock fallback] Supabase request failed for resource collections — showing zero results.", err);
      return [];
    }
    throw err;
  }
}

function mapResourceCollectionRow(row: ResourceCollectionRow): ResourceCollection {
  return {
    id: row.id,
    collectionId: row.external_collection_id,
    titleEn: row.title_en,
    titleZh: row.title_zh,
    descriptionEn: row.description_en,
    descriptionZh: row.description_zh,
    collectionType: row.collection_type,
    priceType: row.price_type,
    price: row.price,
    coverImageUrl: row.cover_image_url,
    pdfUrl: row.pdf_url,
    sceneIds: row.scene_ids,
    sceneCount: row.scene_count,
    sortOrder: row.sort_order,
  };
}

export function useResourceCollections() {
  return useAsyncData(fetchResourceCollections, []);
}

// Collections shown in the homepage "PDF Resources" preview — a temporary,
// explicit allowlist (not "latest N", not array position, not mock content).
// The array order IS the display order: index 0 renders first regardless of
// sort_order/price/anything else. A collection_id missing from Supabase, not
// published, or not yet synced is simply omitted — never padded with a
// placeholder card.
export const HOMEPAGE_COLLECTION_IDS = ["collection01", "collection02"];

async function fetchHomepageResourceCollections(): Promise<ResourceCollection[]> {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) {
      console.warn(
        "[dev-only mock fallback] Supabase env vars missing — showing zero homepage resource collections. " +
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to load real data."
      );
      return [];
    }
    throw new Error("Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY): homepage resource collections");
  }

  try {
    const { data, error } = await supabase!
      .from("resource_collections")
      .select("*")
      .eq("status", "published")
      .in("external_collection_id", HOMEPAGE_COLLECTION_IDS);
    if (error) throw error;
    const byCollectionId = new Map((data ?? []).map(mapResourceCollectionRow).map(c => [c.collectionId, c]));
    // Re-derive order from HOMEPAGE_COLLECTION_IDS rather than trusting the
    // query result's row order — Supabase's `in()` does not guarantee it.
    return HOMEPAGE_COLLECTION_IDS
      .map(id => byCollectionId.get(id))
      .filter((c): c is ResourceCollection => c !== undefined);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[dev-only mock fallback] Supabase request failed for homepage resource collections — showing zero results.", err);
      return [];
    }
    throw err;
  }
}

export function useHomepageResourceCollections() {
  return useAsyncData(fetchHomepageResourceCollections, []);
}
