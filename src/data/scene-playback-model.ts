import type { Scene } from './types';
export function scenePlaybackId(scene: Pick<Scene, 'id' | 'externalId'>) { return scene.externalId || String(scene.id); }
// One rule for page links, lock-screen buttons and autoplay. Preview-only
// coming lessons may be played explicitly but never enter a live queue.
export function collectionPlaybackQueue(scenes: Scene[], current: Scene): Scene[] {
  if (current.status !== 'live' || !current.collectionId) return [current];
  const live = scenes.filter(scene => scene.status === 'live' && scene.collectionId === current.collectionId);
  if (!live.some(scene => scenePlaybackId(scene) === scenePlaybackId(current))) live.push(current);
  return live.sort((a, b) => (a.collectionOrder ?? Number.MAX_SAFE_INTEGER) - (b.collectionOrder ?? Number.MAX_SAFE_INTEGER));
}
