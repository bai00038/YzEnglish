import type { KitCatalogue } from './kit';

export const KIT_TEST_ENTRIES_PER_KIND = 10;

// Limit the library presentation only. Keep the complete catalogue available
// for existing learning records, authored matches and later release.
export function kitTestCatalogue(catalogue: KitCatalogue): KitCatalogue {
  return {
    ...catalogue,
    expressions: catalogue.expressions.slice(0, KIT_TEST_ENTRIES_PER_KIND),
    chunks: catalogue.chunks.slice(0, KIT_TEST_ENTRIES_PER_KIND),
    words: catalogue.words.slice(0, KIT_TEST_ENTRIES_PER_KIND),
  };
}
