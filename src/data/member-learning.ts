import { useSyncExternalStore } from 'react';

export interface CloudProgress { percent: number; updatedAt: string }
export interface Mistake { entryId: string; source: 'manual' | 'dictation'; sceneId: string | null; addedAt: string }
export interface MemberLearning { progress: Record<string, CloudProgress>; learned: string[]; mistakes: Mistake[] }
type Change = { type: 'progress'; sceneId: string; value: CloudProgress } | { type: 'learn' | 'unlearn' | 'removeMistake'; entryId: string } | { type: 'addMistake'; value: Mistake };
const API = String(import.meta.env.VITE_MEMBERSHIP_API_URL ?? '').replace(/\/+$/, '');
const empty = (): MemberLearning => ({ progress: {}, learned: [], mistakes: [] });
const EVENT = 'yz-member-learning-change';
const OWNER = 'yz_learning_owner';
const ANONYMOUS = 'yz_learning_anonymous';
const cacheKey = (id: string) => `yz_learning_cache_${id}`;
const queueKey = (id: string) => `yz_learning_pending_${id}`;
const read = (key: string, fallback: any) => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Cookie and in-memory data still work. */ } };
let state = empty();
let owner = '';
let ready = false;
let active = false;
let phase: 'local' | 'syncing' | 'synced' | 'offline' = 'local';
let revision = 0;
let generation = 0;
let pending: Change[] = [];
let running: Promise<void> | null = null;
let again = false;
let retryDelay = 2000;
let timer: ReturnType<typeof setTimeout> | undefined;
function emit() { revision += 1; window.dispatchEvent(new Event(EVENT)); window.dispatchEvent(new Event('yz-progress-change')); }
function persist() { if (owner) { write(cacheKey(owner), state); write(queueKey(owner), pending); } emit(); }
function apply(data: MemberLearning, change: Change): MemberLearning {
  const next = { progress: { ...data.progress }, learned: [...data.learned], mistakes: data.mistakes.map(item => ({ ...item })) };
  if (change.type === 'progress') {
    if (!next.progress[change.sceneId] || change.value.updatedAt >= next.progress[change.sceneId].updatedAt) next.progress[change.sceneId] = change.value;
  } else if (change.type === 'learn') next.learned = [...new Set([...next.learned, change.entryId])];
  else if (change.type === 'unlearn') next.learned = next.learned.filter(id => id !== change.entryId);
  else if (change.type === 'removeMistake') next.mistakes = next.mistakes.filter(item => item.entryId !== change.entryId);
  else if (change.type === 'addMistake') {
    const previous = next.mistakes.find(item => item.entryId === change.value.entryId);
    if (previous) Object.assign(previous, change.value); else next.mistakes.push(change.value);
  }
  return next;
}
function legacyData(): MemberLearning {
  const result = empty();
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith('yz_progress_')) continue;
      const value = read(key, null);
      if (/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(key.slice(12)) && !['constructor', 'prototype', '__proto__'].includes(key.slice(12)) && value && Number.isFinite(value.percent) && value.percent >= 0 && value.percent <= 100 && Number.isFinite(Date.parse(value.updatedAt))) result.progress[key.slice(12)] = { percent: value.percent, updatedAt: value.updatedAt };
    }
    // Reserved local fallback for the lightweight learned/mistake controls.
    const entryId = /^(?:word|chunk|pattern)-[A-Za-z0-9_-]{1,160}$/;
    const learned = read('yz_kit_learned', []);
    const mistakes = read('yz_kit_mistakes', []);
    result.learned = Array.isArray(learned) ? learned.filter(id => typeof id === 'string' && entryId.test(id)) : [];
    result.mistakes = Array.isArray(mistakes) ? mistakes.filter(item => item && entryId.test(item.entryId) && ['manual', 'dictation'].includes(item.source) && Number.isFinite(Date.parse(item.addedAt)) && (item.sceneId == null || /^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(item.sceneId))) : [];
  } catch { /* A fresh browser has no legacy data. */ }
  return result;
}
async function request(body?: unknown) {
  const response = await fetch(`${API}/v1/learning`, { method: body ? 'POST' : 'GET', credentials: 'include',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`learning_${response.status}`);
  const result = await response.json();
  if (!result.learningId || !result.data?.progress || !Array.isArray(result.data.learned) || !Array.isArray(result.data.mistakes)) throw new Error('invalid_learning_response');
  return result as { learningId: string; data: MemberLearning; migrated: boolean };
}
export function activateMemberLearning(fresh = false) {
  if (!API) return Promise.resolve();
  active = true;
  if (!owner && !fresh) {
    owner = read(OWNER, '');
    if (owner) { state = read(cacheKey(owner), empty()); pending = read(queueKey(owner), []); }
  }
  return syncMemberLearning();
}
export function deactivateMemberLearning() {
  active = false; ready = false; generation++; owner = ''; pending = []; state = empty(); phase = 'local';
  if (timer) clearTimeout(timer);
  timer = undefined;
  emit();
}
export function syncMemberLearning(): Promise<void> {
  if (!active || !API) return Promise.resolve();
  if (running) { again = true; return running; }
  const epoch = generation;
  phase = 'syncing'; emit();
  running = (async () => {
    try {
      let result = await request();
      if (!active || epoch !== generation) return;
      if (owner !== result.learningId) {
        owner = result.learningId; pending = read(queueKey(owner), []); ready = false;
      }
      if (!result.migrated) {
        // Capture the original anonymous records once. Never import another member's cache.
        const previousOwner = read(OWNER, '');
        let anonymous = previousOwner && previousOwner !== owner ? empty() : read(ANONYMOUS, null);
        if (!anonymous) { anonymous = legacyData(); write(ANONYMOUS, anonymous); }
        result = await request({ type: 'merge', value: anonymous });
        if (!active || epoch !== generation) return;
      }
      ready = true;
      write(OWNER, owner);
      state = pending.reduce(apply, result.data); persist();
      while (pending.length) {
        const change = pending[0];
        result = await request(change);
        if (!active || epoch !== generation) return;
        pending = pending.filter(item => item !== change);
        state = pending.reduce(apply, result.data); persist();
      }
      retryDelay = 2000; phase = 'synced'; emit();
    } catch {
      if (active && epoch === generation) { phase = 'offline'; emit(); if (!timer) timer = setTimeout(() => { timer = undefined; void syncMemberLearning(); }, retryDelay); retryDelay = Math.min(60000, retryDelay * 2); }
    } finally {
      running = null;
      if (again && active) { again = false; schedule(); }
    }
  })();
  return running;
}
function schedule() { if (!timer) timer = setTimeout(() => { timer = undefined; void syncMemberLearning(); }, 700); }
function change(value: Change) {
  if (!active) return;
  pending.push(value); state = apply(state, value); persist(); schedule();
}
export function recordMemberProgress(sceneId: string, value: CloudProgress) {
  if (!active) return;
  // Coalesce frequent video ticks while retaining the latest timestamp.
  pending = pending.filter(item => item.type !== 'progress' || item.sceneId !== sceneId);
  change({ type: 'progress', sceneId, value });
}
export function memberProgressStorageKey(sceneId: string) { return active ? `yz_learning_detail_${owner || 'pending'}_${sceneId}` : `yz_progress_${sceneId}`; }
export function memberProgress(): Record<string, CloudProgress> | null { return active ? state.progress : null; }
export function setEntryLearned(entryId: string, learned: boolean) { change({ type: learned ? 'learn' : 'unlearn', entryId }); }
export function addMistake(entryId: string, source: Mistake['source'], sceneId: string | null = null) {
  change({ type: 'addMistake', value: { entryId, source, sceneId, addedAt: new Date().toISOString() } });
}
export function removeMistake(entryId: string) { change({ type: 'removeMistake', entryId }); }
function subscribe(listener: () => void) { window.addEventListener(EVENT, listener); return () => window.removeEventListener(EVENT, listener); }
export function useMemberLearning() {
  useSyncExternalStore(subscribe, () => revision, () => 0);
  return { ...state, phase, ready };
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void syncMemberLearning(); });
  window.addEventListener('focus', () => { void syncMemberLearning(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void syncMemberLearning(); });
  window.addEventListener('storage', event => {
    if (!active || !owner) return;
    if (event.key === queueKey(owner)) { pending = read(queueKey(owner), []); void syncMemberLearning(); }
    if (event.key === cacheKey(owner)) { state = read(cacheKey(owner), empty()); emit(); }
  });
}
