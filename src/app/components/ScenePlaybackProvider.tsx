import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { SplitPlayerProvider, useSplitPlayer, type Track, type PlayerEvent } from '@/lib/split-player';
import { requestProtectedAssetUrl, SECURE_MEMBERSHIP_ENABLED, useMembershipAccess } from '@/data/membership';
import { collectionPlaybackQueue, scenePlaybackId } from '@/data/scene-playback-model';
import { buildSceneHref, type SceneOrigin } from '@/data/scene-navigation';
import { updateLearningPosition, writeLearningProgress } from '@/data/learning-progress';
import { stopKitAudio } from '@/data/kit-audio';
import type { Scene } from '@/data/types';
const LOOP_KEY = "yzenglish:episodeLoop";
interface ScenePlayback { episodeLoop: boolean; setEpisodeLoop: (enabled: boolean) => void; openScene: (scene: Scene, sequence: Scene[], from: SceneOrigin | undefined, startTime?: number) => Promise<Track | null> }
const Context = createContext<ScenePlayback | null>(null);
function Coordinator({ children }: { children: ReactNode }) {
  const player = useSplitPlayer(); const navigate = useNavigate(); const location = useLocation();
  const { isUnlocked } = useMembershipAccess(); const unlocked = useRef(isUnlocked); unlocked.current = isUnlocked;
  const locationRef = useRef(location); locationRef.current = location;
  const sceneMap = useRef(new Map<string, Scene>()); const origin = useRef<SceneOrigin | undefined>(undefined);
  const [episodeLoop, updateEpisodeLoop] = useState(() => {
    try { return localStorage.getItem(LOOP_KEY) !== 'false'; } catch { return true; }
  });
  useEffect(() => { player.setLoop(episodeLoop); }, [player, episodeLoop]);
  const setEpisodeLoop = useCallback((enabled: boolean) => {
    player.setLoop(enabled); updateEpisodeLoop(enabled);
    try { localStorage.setItem(LOOP_KEY, String(enabled)); } catch { /* In-memory setting still works. */ }
  }, [player]);
  const lastWrite = useRef(new Map<string, number>());
  const resolveScene = useCallback(async (track: Track): Promise<Track> => {
    const scene = sceneMap.current.get(track.id); if (!scene) throw new Error('Unknown lesson');
    if (!scene.isFreeExperience && !unlocked.current) throw new Error('membership_required');
    const sign = (url?: string | null) => !url ? Promise.resolve(null)
      : scene.isFreeExperience || !SECURE_MEMBERSHIP_ENABLED ? Promise.resolve(url)
      : requestProtectedAssetUrl(scene.externalId!, url);
    const [videoUrl, audioUrl, lowUrl] = await Promise.all([
      sign(scene.video_url), sign(scene.audioUrl).catch(() => null), sign(scene.lowUrl).catch(() => null),
    ]);
    if (!videoUrl) throw new Error('Missing lesson video');
    // Protected links are short-lived. Keep cache lifetime below signed validity.
    const expiries = [videoUrl, audioUrl, lowUrl].filter(Boolean).map(value => {
      const params = new URL(value!, window.location.origin).searchParams;
      const date = params.get('x-oss-date'); const seconds = Number(params.get('x-oss-expires'));
      if (date && /^\d{8}T\d{6}Z$/.test(date) && seconds > 0) {
        return Date.parse(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${date.slice(9,11)}:${date.slice(11,13)}:${date.slice(13,15)}Z`) + seconds * 1000;
      }
      const legacy = Number(params.get('Expires'));
      return legacy > 0 ? legacy * 1000 : Date.now() + 5 * 60 * 1000;
    });
    return { ...track, videoUrl, audioUrl, lowUrl, expiresAt: Math.min(...expiries) };

  }, []);
  const openScene = useCallback(async (scene: Scene, sequence: Scene[], from: SceneOrigin | undefined, startTime = 0) => {
    origin.current = from;
    const queue = collectionPlaybackQueue(sequence, scene);
    for (const item of [...queue, scene]) sceneMap.current.set(scenePlaybackId(item), item);
    player.setPlaylist(queue.map(item => ({ id: scenePlaybackId(item), title: item.titleZh || item.titleEn,
      artist: 'YZ English', artwork: item.photo ? [{ src: new URL(item.photo, window.location.origin).href }] : [],
      videoUrl: item.video_url || '', audioUrl: item.audioUrl, lowUrl: item.lowUrl,
    })), resolveScene);
    return player.load(scenePlaybackId(scene), { startTime });
  }, [player, resolveScene]);
  useEffect(() => {
    const syncPage = () => {
      if (document.hidden || !player.track || !locationRef.current.pathname.startsWith('/scenes/')) return;
      const scene = sceneMap.current.get(player.track.id); if (!scene) return;
      const href = buildSceneHref(scene.slug, { from: origin.current });
      if (locationRef.current.pathname !== href.split('?')[0]) navigate(href);
    };
    const off = player.on((event: PlayerEvent) => {
      const scene = event.track && sceneMap.current.get(event.track.id); if (!scene) return;
      if (event.type === 'trackchange') { syncPage(); return; }
      if (event.type === 'play') stopKitAudio();
      if (event.type === 'time' && event.paused && event.time === 0) return;
      const id = scenePlaybackId(scene), now = Date.now();
      if (event.type === 'ended' && event.mode === 'episode') {
        writeLearningProgress(id, { videoPercent: 100, videoTime: 0, lastStep: 'watch' });
      } else if (['time', 'play', 'pause'].includes(event.type) && (event.type !== 'time' || now - (lastWrite.current.get(id) ?? 0) >= 1500)) {
        lastWrite.current.set(id, now);
        if (event.mode === 'episode' && event.duration > 0) {
          writeLearningProgress(id, { videoPercent: event.time / event.duration * 100, videoTime: event.time, lastStep: 'watch',
            ...(scene.sentenceCount ? { sentencesTotal: scene.sentenceCount } : {}) });
        } else updateLearningPosition(id, { videoTime: event.time, lastStep: event.mode === 'episode' ? 'watch' : 'dialogue' });
      }
    });
    document.addEventListener('visibilitychange', syncPage);
    return () => { off(); document.removeEventListener('visibilitychange', syncPage); };
  }, [navigate, player]);
  useEffect(() => { if (!location.pathname.startsWith('/scenes/')) player.stop(); }, [location.pathname, player]);
  useEffect(() => { if (player.track) { const scene = sceneMap.current.get(player.track.id); if (scene && !scene.isFreeExperience && !isUnlocked) player.stop(); } }, [isUnlocked, player]);
  return <Context.Provider value={{ openScene, episodeLoop, setEpisodeLoop }}>{children}</Context.Provider>;
}
export function ScenePlaybackProvider({ children }: { children: ReactNode }) {
  return <SplitPlayerProvider><Coordinator>{children}</Coordinator></SplitPlayerProvider>;
}
export function useScenePlayback() { const context = useContext(Context); if (!context) throw new Error('ScenePlaybackProvider required'); return context; }
