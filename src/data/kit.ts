import { createKitRemoteLoader, isKitAudioIndex, isKitCatalogue } from "./kit-remote";
import bundledCatalogue from "./kit/catalogue.json";
import bundledClipsIndex from "./kit/clips-index.json";
import bundledAudioIndex from "./kit/audio-index.json";

export interface KitOccurrence {
  sceneId: string;
  titleZh: string;
  collectionId: string;
  collectionOrder: number;
  slug: string | null;
  videoUrl: string | null;
  dataUrl: string | null;
  isFreeExperience: boolean;
  anchor_line?: string;
  anchor_start: number | null;
  displayExample: string;
  contextLine?: string;
  contextStart?: number;
}

export interface KitEntry {
  id: string;
  key: string;
  kind: "expression" | "chunk" | "word";
  chunkType?: string;
  text: string;
  meaningZh: string;
  explanation?: string;
  phonetic?: string;
  pos?: string;
  note?: string;
  audioUrl: string | null;
  occurrences: KitOccurrence[];
}

export interface KitCatalogue {
  expressions: KitEntry[];
  chunks: KitEntry[];
  words: KitEntry[];
  collections: { id: string; name: string; titleEn: string; tagId: string; shelfOrder: number }[];
}

export function normalizeKitText(value: string) {
  return value.toLowerCase().replace(/\p{P}/gu, "").replace(/\s+/g, " ").trim();
}

function kitDataUrl(file: string) {
  return import.meta.env.DEV ? `/dev-content/kit/${file}` : `https://go.learnyzenglish.com/content/kit/${file}`;
}

const loadRemoteKitCatalogue = createKitRemoteLoader<KitCatalogue>({
  url: kitDataUrl("catalogue.json"),
  bundled: async () => bundledCatalogue as KitCatalogue,
  validate: (value): value is KitCatalogue => isKitCatalogue(value),
});

export async function loadKitCatalogue(): Promise<KitCatalogue> {
  const catalogue = await loadRemoteKitCatalogue();
  const localWords = new Map(bundledCatalogue.words.map(entry => [entry.key, entry]));
  return { ...catalogue, words: catalogue.words.map(entry => {
    const local = localWords.get(entry.key) as KitEntry | undefined;
    return { ...entry, pos: entry.pos ?? local?.pos, note: entry.note ?? local?.note };
  }) };
}

export const loadKitClipsIndex = createKitRemoteLoader<Record<string, { audioUrl: string }>>({
  url: kitDataUrl("clips-index.json"),
  bundled: async () => bundledClipsIndex,
  validate: isKitAudioIndex,
});

export const loadKitAudioIndex = createKitRemoteLoader<Record<string, { audioUrl: string }>>({
  url: import.meta.env.MODE === "staging" ? "/kit/audio-index-v2-staging.json" : kitDataUrl("audio-index.json"),
  bundled: async () => bundledAudioIndex,
  validate: isKitAudioIndex,
});

export function matchesKitSearch(entry: KitEntry, query: string) {
  const text = query.toLowerCase().trim();
  return entry.text.toLowerCase().includes(text) || entry.meaningZh.toLowerCase().includes(text);
}
