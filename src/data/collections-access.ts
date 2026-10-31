import { useAsyncData } from "./useAsyncData";
import { fetchManifestCollections, fetchManifestScenes, manifestEntryToScene } from "./oss-content";
import type { Scene, SceneCollection } from "./types";

export interface CollectionWithScenes extends SceneCollection {
  scenes: Scene[];
}

export async function fetchCollectionsWithScenes(): Promise<CollectionWithScenes[]> {
  const [collections, entries] = await Promise.all([fetchManifestCollections(), fetchManifestScenes()]);
  const scenes = entries.map(manifestEntryToScene);
  return collections
    .map(collection => ({
      ...collection,
      scenes: scenes
        .filter(scene => scene.collectionId === collection.id)
        .sort((a, b) => (a.collectionOrder ?? Number.MAX_SAFE_INTEGER) - (b.collectionOrder ?? Number.MAX_SAFE_INTEGER)),
    }))
    .sort((a, b) => a.shelfOrder - b.shelfOrder);
}

export function useCollections() {
  return useAsyncData(fetchCollectionsWithScenes, []);
}

export function useCollection(collectionId: string) {
  return useAsyncData(async () => {
    const collections = await fetchCollectionsWithScenes();
    return collections.find(collection => collection.id === collectionId) ?? null;
  }, [collectionId]);
}

export function useFreeTrialScenes() {
  return useAsyncData(async () => {
    const collections = await fetchCollectionsWithScenes();
    const namesById = new Map(collections.map(collection => [collection.id, collection.name]));
    return collections
      .flatMap(collection => collection.scenes)
      .filter(scene => scene.isFreeExperience)
      .sort((a, b) => ["SH-01-007", "ST-01-001", "DL-01-007"].indexOf(a.externalId ?? "") - ["SH-01-007", "ST-01-001", "DL-01-007"].indexOf(b.externalId ?? ""))
      .map(scene => ({
        scene,
        collectionLabel: scene.collectionId ? namesById.get(scene.collectionId) ?? "" : "",
      }));
  }, []);
}
