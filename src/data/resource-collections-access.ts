import { useAsyncData } from "./useAsyncData";
import type { ResourceCollection } from "./types";

// ---------------------------------------------------------------------------
// Resource collections (Supabase retired).
//
// There is currently no OSS source for multi-scene PDF bundle packs — the
// manifest only describes single episodes. Until collections are authored
// into the manifest (or a collections.json), these hooks resolve to an
// empty list, the same end state as "no published collections yet".
// Production surfaces a real fetch error rather than silently showing zero
// results; dev falls back to zero with a loud warning.
// ---------------------------------------------------------------------------

async function withDevFallback<T>(ossCall: () => Promise<T>, mockFallback: () => T, context: string): Promise<T> {
  try {
    return await ossCall();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[dev-only mock fallback] OSS request failed for ${context} — showing zero results.`, err);
      return mockFallback();
    }
    throw err;
  }
}

async function fetchResourceCollections(): Promise<ResourceCollection[]> {
  return withDevFallback(async () => [], async () => [], "resource collections");
}

export function useResourceCollections() {
  return useAsyncData(fetchResourceCollections, []);
}

// Collections shown in the homepage "PDF Resources" preview — a temporary,
// explicit allowlist (not "latest N", not array position). The array order
// IS the display order. A collection_id with no OSS source is simply
// omitted — never padded with a placeholder card.
export const HOMEPAGE_COLLECTION_IDS: string[] = [];

async function fetchHomepageResourceCollections(): Promise<ResourceCollection[]> {
  return withDevFallback(async () => [], async () => [], "homepage resource collections");
}

export function useHomepageResourceCollections() {
  return useAsyncData(fetchHomepageResourceCollections, []);
}
