import { useSyncExternalStore } from "react";
import { loadKitAudioIndex, loadKitClipsIndex, normalizeKitText, type KitOccurrence } from "./kit";
import { fetchEpisodeDetail, fetchManifestScenes } from "./oss-content";
import { requestProtectedAssetUrl, SECURE_MEMBERSHIP_ENABLED } from "./membership";
import { connectTtsBoost } from './tts-volume';

let player: HTMLAudioElement | null = null;
let boostContext: AudioContext | null = null;
let disconnectBoost: (() => void) | null = null;

async function prepareTtsBoost() {
  try {
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return undefined;
    boostContext ??= new Context();
    // Called synchronously from the user's tap, before any data fetch.
    if (boostContext.state !== 'running') await boostContext.resume();
    return boostContext.state === 'running' ? boostContext : undefined;
  } catch { return undefined; } // Unsupported browsers retain normal playback.
}
let frame: number | null = null;
let request = 0;
let snapshot = { id: "", loading: false, error: "" };
const subscribers = new Set<() => void>();

function update(id = "", loading = false, error = "") {
  snapshot = { id, loading, error };
  subscribers.forEach(listener => listener());
}

export function stopKitAudio() {
  request += 1;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  disconnectBoost?.();
  disconnectBoost = null;
  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
  }
  player = null;
  update();
}

function startRequest(id: string) {
  const toggleOff = snapshot.id === id && !snapshot.error;
  stopKitAudio();
  if (toggleOff) return null;
  document.querySelectorAll<HTMLMediaElement>("video, audio").forEach(media => media.pause());
  update(id, true);
  return request;
}

async function playAudio(id: string, token: number, url: string, start = 0, end?: number, context?: AudioContext) {
  if (request !== token) return;
  const audio = new Audio();
  player = audio;
  audio.preload = "auto";
  audio.onwaiting = () => { if (request === token) update(id, true); };
  audio.onplaying = () => { if (request === token) update(id); };
  if (context) {
    audio.crossOrigin = 'anonymous';
    try { disconnectBoost = connectTtsBoost(context, audio); }
    catch { await playAudio(id, token, url, start, end); return; }
  }
  audio.onended = () => { if (request === token) stopKitAudio(); };
  audio.onerror = () => {
    if (request !== token) return;
    if (context) {
      // If a future audio host lacks CORS, retry once with native playback.
      disconnectBoost?.(); disconnectBoost = null;
      audio.onerror = null;
      void playAudio(id, token, url, start, end);
      return;
    }
    stopKitAudio();
    update(id, false, "音频暂时无法播放，请重试");
  };
  const checkBoundary = () => {
    if (request === token && end !== undefined && audio.currentTime >= end) stopKitAudio();
  };
  audio.ontimeupdate = checkBoundary;
  audio.onloadedmetadata = () => {
    if (request !== token) return;
    const begin = async () => {
      if (request !== token) return;
      try {
        await audio.play();
        if (request !== token) return;
        update(id);
        const checkEnd = () => {
          if (request !== token) return;
          if (end !== undefined && audio.currentTime >= end) {
            stopKitAudio();
            return;
          }
          frame = requestAnimationFrame(checkEnd);
        };
        if (end !== undefined) checkEnd();
      } catch {
        if (request !== token) return;
        stopKitAudio();
        update(id, false, "播放未成功，请再次点击");
      }
    };
    if (start > 0) {
      audio.addEventListener("seeked", () => { void begin(); }, { once: true });
      audio.currentTime = start;
    } else {
      void begin();
    }
  };
  audio.src = url;
}

export async function playKitTts(text: string, audioUrl?: string | null, options?: { boost?: boolean }) {
  const id = `tts:${normalizeKitText(text)}`;
  const token = startRequest(id);
  if (token === null) return;
  const context = options?.boost ? prepareTtsBoost() : Promise.resolve(undefined);
  try {
    const index = await loadKitAudioIndex();
    audioUrl = index[normalizeKitText(text)]?.audioUrl ?? audioUrl;
    if (!audioUrl) throw new Error("短语发音制作中");
    await playAudio(id, token, audioUrl, 0, undefined, await context);
  } catch (error) {
    if (request === token) update(id, false, error instanceof Error ? error.message : "发音加载失败");
  }
}

export async function playKitExample(occurrence: KitOccurrence) {
  if (occurrence.anchor_start === null) return;
  const id = `source:${occurrence.sceneId}:${occurrence.anchor_start}`;
  const token = startRequest(id);
  if (token === null) return;
  try {
    const clips = await loadKitClipsIndex();
    const clipUrl = clips[`${occurrence.sceneId}@${occurrence.anchor_start.toFixed(2)}`]?.audioUrl;
    if (clipUrl) { await playAudio(id, token, clipUrl); return; }
  } catch { /* no clip index or clip missing: fall through to the video seek path */ }
  try {
    const entries = await fetchManifestScenes();
    const entry = entries.find(scene => scene.externalId === occurrence.sceneId);
    if (!entry?.video_url) throw new Error("这集的原声暂未就绪");
    const scene = await fetchEpisodeDetail(entry);
    const start = occurrence.anchor_start;
    const ranges = [
      ...(scene.content?.dialogue ?? []).map(line => ({ start: line.start, end: line.end })),
      ...(scene.subtitleCues ?? []).map(cue => ({ start: cue.start, end: cue.end })),
    ].filter((range): range is { start: number; end: number } =>
      typeof range.start === "number" && typeof range.end === "number" && range.end > range.start);
    const range = ranges.find(item => Math.abs(item.start - start) < 0.04)
      ?? ranges.find(item => item.start <= start && item.end > start);
    if (!range) throw new Error("这句的播放结束时间暂未就绪");
    let url = entry.video_url;
    if (SECURE_MEMBERSHIP_ENABLED && !entry.isFreeExperience) {
      url = await requestProtectedAssetUrl(occurrence.sceneId, url);
    }
    await playAudio(id, token, url, start, range.end);
  } catch (error) {
    if (request === token) update(id, false, error instanceof Error ? error.message : "原声加载失败");
  }
}

export function useKitAudio() {
  return useSyncExternalStore(
    listener => { subscribers.add(listener); return () => { subscribers.delete(listener); }; },
    () => snapshot,
  );
}
