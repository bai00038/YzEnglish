import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SplitPlayer } from './engine';
import { usesIosSeekControls } from './platform';
export { SplitPlayer } from './engine';
export type { Track, Timing, PlayerEvent, PlaybackMode, Fallback } from './engine';
const PlayerContext = createContext<SplitPlayer | null>(null);
export function SplitPlayerProvider({ children }: { children: ReactNode }) {
  const [player] = useState(() => new SplitPlayer(document.createElement('audio'), {
    visibility: document, mediaSession: navigator.mediaSession,
    sessionNavigation: usesIosSeekControls(navigator) ? 'seek' : 'tracks',
    metadata: typeof MediaMetadata === 'undefined' ? undefined : value => new MediaMetadata(value),
  }));
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    host.current?.appendChild(player.audio); player.audio.dataset.splitPlayer = 'master'; player.start();
    return () => { player.destroy(); player.audio.remove(); };
  }, [player]);
  return <PlayerContext.Provider value={player}><div ref={host} hidden aria-hidden="true" />{children}</PlayerContext.Provider>;
}
export function useSplitPlayer() {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('SplitPlayerProvider is required');
  return player;
}
