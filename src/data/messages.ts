import { useEffect, useState, useSyncExternalStore } from 'react';
import { useMembershipAccess } from './membership';
import { expiryNotice, isAnnouncementFile, unreadMessageIds, type SiteMessage } from './learning-overview';
const READ_KEY = 'yz-site-message-read-v1';
const listeners = new Set<() => void>();
let announcements: SiteMessage[] = [];
let pending: Promise<void> | undefined;
let version = 0;
let lastLoaded = 0;
function notify() { version++; listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function readIds(): string[] {
  try { const value = JSON.parse(localStorage.getItem(READ_KEY) || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string') : []; } catch { return []; }
}
export function markMessagesRead(ids: string[]) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...new Set([...readIds(), ...ids])])); } catch { /* Storage may be disabled. */ }
  // Keep the current tab functional even when localStorage is unavailable.
  ids.forEach(id => sessionRead.add(id)); notify();
}
const sessionRead = new Set<string>();
async function loadAnnouncements() {
  if (pending || Date.now() - lastLoaded < 60000) return pending;
  pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const url = import.meta.env.VITE_ANNOUNCEMENTS_URL || (import.meta.env.DEV ? '/dev-content/kit/announcements.json' : 'https://go.learnyzenglish.com/content/kit/announcements.json');
      const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) return;
      const value: unknown = await response.json();
      if (isAnnouncementFile(value)) { announcements = value.announcements; notify(); }
    } catch { /* Preserve the last valid list; never fabricate announcements. */ }
    finally { clearTimeout(timeout); lastLoaded = Date.now(); pending = undefined; }
  })();
  return pending;
}
export function useMessages() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const { unlock } = useMembershipAccess();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    void loadAnnouncements();
    const refresh = () => { setNow(Date.now()); if (document.visibilityState !== 'hidden') void loadAnnouncements(); };
    const storage = (event: StorageEvent) => { if (event.key === READ_KEY || event.key === null) { sessionRead.clear(); notify(); } };
    window.addEventListener('storage', storage); document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { clearInterval(timer); window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const messages = [...expiryNotice(unlock, now), ...announcements.filter(item => Date.parse(item.publishedAt) <= now)].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const unread = unreadMessageIds(messages, [...readIds(), ...sessionRead]);
  return { messages, unread, hasUnread: unread.length > 0 };
}
