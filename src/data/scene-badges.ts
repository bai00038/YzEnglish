const NEW_BADGE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// A missing or invalid publication date is not treated as newly published.
// The old isNew flag is intentionally ignored: otherwise it never expires.
export function isSceneNew(publishedAt: string | undefined, now = Date.now()): boolean {
  if (!publishedAt) return false;
  const publishedTime = Date.parse(publishedAt);
  return Number.isFinite(publishedTime) && now >= publishedTime && now - publishedTime < NEW_BADGE_DURATION_MS;
}
