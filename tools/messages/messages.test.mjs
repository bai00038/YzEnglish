import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
const code = (await build({ entryPoints: ['src/data/messages.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
  define: { 'import.meta.env.VITE_ANNOUNCEMENTS_URL': '"/announcements.json"', 'import.meta.env.DEV': 'false' },
  plugins: [{ name: 'hooks', setup(build) {
    build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'test' }));
    build.onResolve({ filter: /^\.\/membership$/ }, () => ({ path: 'membership', namespace: 'test' }));
    build.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'react'
      ? 'export const useEffect = fn => fn(); export const useState = fn => [typeof fn === "function" ? fn() : fn, () => {}]; export const useSyncExternalStore = () => {};'
      : 'export const useMembershipAccess = () => ({unlock: null});' }));
  } }] })).outputFiles[0].text;
const notice = { id: 'notice-a', type: 'announcement', title: '公告', body: '正文', publishedAt: '2026-11-01T00:00:00Z' };
async function harness({ failStorage = false, response = { announcements: [notice] } } = {}) {
  let now = Date.parse('2026-11-21T00:00:00Z');
  const storage = new Map(); const window = new EventTarget(); const document = new EventTarget(); document.visibilityState = 'visible';
  window.setInterval = () => 1;
  const context = vm.createContext({ module: { exports: {} }, exports: {}, console, Event, window, document, AbortController,
    localStorage: { getItem: key => storage.get(key), setItem(key, value) { if (failStorage) throw new Error('blocked'); storage.set(key, value); } },
    Date: class extends Date { static now() { return now; } }, setTimeout, clearTimeout, clearInterval: () => {},
    fetch: async (url, options) => { assert.equal(url, '/announcements.json'); assert.equal(options.cache, 'no-cache'); return { ok: true, json: async () => response }; } });
  context.exports = context.module.exports;
  vm.runInContext(code, context);
  const api = context.module.exports;
  api.useMessages(); await new Promise(resolve => setImmediate(resolve));
  return { api, storage, refresh(next) { response = next; now += 61000; document.dispatchEvent(new Event('visibilitychange')); }, event() { const event = new Event('storage'); event.key = 'yz-site-message-read-v1'; window.dispatchEvent(event); } };
}
test('read states update all consumers, survive remount, and follow another tab; invalid remote does not erase valid data', async () => {
  const h = await harness();
  assert.equal(h.api.useMessages().hasUnread, true);
  h.api.markMessagesRead(['notice-a']);
  assert.equal(h.api.useMessages().hasUnread, false);
  assert.equal(JSON.parse(h.storage.get('yz-site-message-read-v1'))[0], 'notice-a');
  h.storage.set('yz-site-message-read-v1', '[]'); h.event();
  assert.equal(h.api.useMessages().hasUnread, true);
  h.refresh({ broken: true }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.api.useMessages().messages.length, 1);
  h.refresh({ announcements: [notice, { ...notice, id: 'notice-b' }] }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.api.useMessages().messages.length, 2);
});
test('blocked storage still clears current-tab dots; missing announcements stay empty', async () => {
  const h = await harness({ failStorage: true });
  h.api.markMessagesRead(['notice-a']); assert.equal(h.api.useMessages().hasUnread, false);
  const empty = await harness({ response: {} });
  assert.equal(empty.api.useMessages().messages.length, 0);
});

test('reading one detail clears only that unread ID; reading all details clears the shared signal', async () => {
  const h = await harness({ response: { announcements: [notice, { ...notice, id: 'notice-b' }] } });
  assert.equal(h.api.useMessages().unread.length, 2);
  h.api.markMessagesRead(['notice-a']);
  assert.equal(h.api.useMessages().hasUnread, true);
  assert.equal(h.api.useMessages().unread.length, 1);
  assert.equal(h.api.useMessages().unread[0], 'notice-b');
  h.api.markMessagesRead(['notice-a']); // Reopening a detail is idempotent.
  assert.equal(h.api.useMessages().unread.length, 1);
  h.api.markMessagesRead(['notice-b']);
  assert.equal(h.api.useMessages().hasUnread, false);
});
