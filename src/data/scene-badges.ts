const NEW_BADGE_TIME_ZONE = "America/Toronto";
const newBadgeDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: NEW_BADGE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getNewBadgeDateKey(timestamp: number): string {
  return newBadgeDateFormatter.format(new Date(timestamp));
}

// A missing or invalid publication date is not treated as newly published.
// The old isNew flag is intentionally ignored: otherwise it never expires.
// A published scene is new only on its Toronto publication date.
export function isSceneNew(publishedAt: string | undefined, now = Date.now()): boolean {
  if (!publishedAt) return false;
  const publishedTime = Date.parse(publishedAt);
  return (
    Number.isFinite(publishedTime) &&
    now >= publishedTime &&
    getNewBadgeDateKey(now) === getNewBadgeDateKey(publishedTime)
  );
}
