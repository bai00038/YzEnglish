import { SCENES } from "./scenes";
import type { Scene } from "./types";

export function getScenes(): Scene[] {
  return SCENES;
}

export function getFeaturedScenes(): Scene[] {
  return SCENES.filter(s => s.featured);
}

export function getNewScenes(): Scene[] {
  return SCENES.filter(s => s.isNew);
}

export function getSceneBySlug(slug: string): Scene | undefined {
  return SCENES.find(s => s.slug === slug);
}

export function getSceneById(id: number): Scene | undefined {
  return SCENES.find(s => s.id === id);
}

export function getRelatedScenes(slug: string, limit = 3): Scene[] {
  const scene = getSceneBySlug(slug);
  if (!scene) return [];

  if (scene.content?.relatedSceneIds) {
    return scene.content.relatedSceneIds
      .map(id => getSceneById(id))
      .filter((s): s is Scene => Boolean(s));
  }

  return SCENES
    .filter(s => s.id !== scene.id && s.category === scene.category)
    .slice(0, limit);
}
