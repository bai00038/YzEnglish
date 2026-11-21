// Each file is fetched once per page load. A refresh revalidates through HTTP
// caching (OSS ETag); local imports remain the offline/bad-data fallback.
export function createKitRemoteLoader<T>({ url, bundled, validate, fetchImpl = fetch, timeoutMs = 5000 }: {
  url: string;
  bundled: () => Promise<T>;
  validate: (value: unknown) => value is T;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) {
      pending = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchImpl(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`Kit data HTTP ${response.status}`);
          const value: unknown = await response.json();
          if (!validate(value)) throw new Error("Invalid kit data");
          return value;
        } catch {
          return bundled();
        } finally {
          clearTimeout(timer);
        }
      })().catch(error => { pending = undefined; throw error; });
    }
    return pending;
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isKitAudioIndex(value: unknown): value is Record<string, { audioUrl: string }> {
  return record(value) && Object.keys(value).length > 0 && Object.values(value).every(item => record(item) && typeof item.audioUrl === "string" && item.audioUrl.length > 0);
}

export function isKitCatalogue(value: unknown): boolean {
  if (!record(value) || !Array.isArray(value.collections)) return false;
  if (!value.collections.every(item => record(item) && ["id", "name", "titleEn"].every(key => typeof item[key] === "string"))) return false;
  return ["expressions", "chunks", "words"].every(key => Array.isArray(value[key]) && value[key].every(entry =>
    record(entry) && ["id", "key", "text", "meaningZh"].every(field => typeof entry[field] === "string") &&
    ["expression", "chunk", "word"].includes(String(entry.kind)) &&
    (entry.audioUrl == null || typeof entry.audioUrl === "string") &&
    ["phonetic", "pos", "note"].every(field => entry[field] == null || typeof entry[field] === "string") &&
    Array.isArray(entry.occurrences) && entry.occurrences.length > 0 && entry.occurrences.every(item =>
      record(item) && ["sceneId", "titleZh", "collectionId", "displayExample"].every(field => typeof item[field] === "string") &&
      (item.anchor_start === null || (typeof item.anchor_start === "number" && Number.isFinite(item.anchor_start) && item.anchor_start >= 0)) &&
      (item.contextLine == null || typeof item.contextLine === "string") &&
      (item.slug == null || typeof item.slug === "string"))));
}
