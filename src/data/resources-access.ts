import { useAsyncData } from "./useAsyncData";
import { PDF_RESOURCES as MOCK_PDF_RESOURCES } from "./resources";
import { fetchManifestScenes } from "./oss-content";
import type { PdfResource } from "./types";

// ---------------------------------------------------------------------------
// OSS-backed PDF resources (Supabase retired).
//
// Single-scene PDF handouts are derived from the episode manifest: every
// episode with a published guide PDF becomes one downloadable resource.
// Episodes without a PDF (cover/asset still in production) are skipped —
// never a dead download button.
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

async function fetchResources(): Promise<PdfResource[]> {
  return withDevFallback(
    async () =>
      (await fetchManifestScenes())
        .filter(e => Boolean(e.pdfUrl))
        .map(e => ({
          id: e.id,
          title: e.titleEn,
          titleZh: e.titleZh,
          type: "PDF",
          desc: e.desc,
          scenes: 1,
          free: true,
          category: e.category,
          filePath: e.pdfUrl,
        })),
    () => MOCK_PDF_RESOURCES,
    "pdf resources"
  );
}

export function useResources() {
  return useAsyncData(fetchResources, []);
}
