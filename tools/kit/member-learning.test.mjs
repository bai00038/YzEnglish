import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { transform } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createApp } = require('../../aliyun-membership-api/src/app.cjs');
const { MemoryMembershipRepository } = require('../../aliyun-membership-api/src/repository.cjs');
const { keyedHash } = require('../../aliyun-membership-api/src/security.cjs');
const config = { allowedOrigins: ['https://staging.learnyzenglish.com'], sessionSecret: 's'.repeat(48), codePepper: 'p'.repeat(48) };
const code = 'YZ-LEARNING-TEST';
const repository = new MemoryMembershipRepository({ [keyedHash(config.codePepper, code)]: { type: 'founder', expiresAt: null } });
const app = createApp({ repository, config, objectSigner: {} });
let source = fs.readFileSync(new URL('../../src/data/member-learning.ts', import.meta.url), 'utf8').replace("import { useSyncExternalStore } from 'react';", 'const useSyncExternalStore = () => {};').replace('import.meta.env.VITE_MEMBERSHIP_API_URL', '"https://api.test"');
const compiled = (await transform(source, { loader: 'ts', format: 'cjs' })).code;
async function client(storage = new Map(), suppliedCookie) {
  let cookie = suppliedCookie;
  if (!cookie) {
    const response = await app({ method: 'POST', path: '/v1/membership/redeem', headers: { origin: config.allowedOrigins[0] }, body: JSON.stringify({ code }), ip: 'test' });
    cookie = response.headers['Set-Cookie'].map(value => value.split(';')[0]).join('; ');
  }
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), get length() { return storage.size; }, key: index => [...storage.keys()][index] };
  let calls = 0; let online = true;
  const fetch = async (url, options) => {
    calls++; if (!online) throw new Error('offline');
    const response = await app({ method: options.method, path: '/v1/learning', headers: { origin: config.allowedOrigins[0], cookie }, body: options.body });
    return { ok: response.statusCode === 200, status: response.statusCode, json: async () => JSON.parse(response.body) };
  };
  const exports = {};
  const context = vm.createContext({ exports, module: { exports }, Event, window: new EventTarget(), document: new EventTarget(), localStorage, fetch,
    setTimeout: () => 1, clearTimeout: () => {}, console });
  context.window.localStorage = localStorage;
  vm.runInContext(compiled, context);
  return { api: context.module.exports, storage, cookie, get calls() { return calls; }, setOnline: value => { online = value; } };
}
const plain = value => JSON.parse(JSON.stringify(value));
test('client migration, two browser refresh, offline queue, account-local detail keys and no anonymous API calls', async () => {
  const storage = new Map([['yz_progress_HC-06-001', JSON.stringify({ percent: 35, updatedAt: '2026-11-01T00:00:00.000Z' })]]);
  const a = await client(storage); const b = await client();
  assert.equal(a.calls, 0);
  a.api.addMistake('word-ignored', 'manual'); assert.equal(a.calls, 0);
  await a.api.activateMemberLearning();
  assert.equal(a.api.memberProgress()['HC-06-001'].percent, 35);
  assert.notEqual(a.api.memberProgressStorageKey('HC-06-001'), 'yz_progress_HC-06-001');
  a.api.addMistake('word-one', 'manual'); a.api.addMistake('word-two', 'manual'); a.api.addMistake('chunk-three', 'dictation', 'HC-06-001');
  a.api.setEntryLearned('word-four', true);
  await a.api.syncMemberLearning(); await b.api.activateMemberLearning();
  assert.equal(b.api.useMemberLearning().mistakes.length, 3);
  assert.deepEqual(plain(b.api.useMemberLearning().learned), ['word-four']);
  b.api.removeMistake('word-one'); await b.api.syncMemberLearning();
  await a.api.syncMemberLearning(); assert.equal(a.api.useMemberLearning().mistakes.length, 2);
  // A full reload must not union the original local cache back into the cloud.
  const reloaded = await client(storage, a.cookie); await reloaded.api.activateMemberLearning();
  assert.equal(reloaded.api.useMemberLearning().mistakes.length, 2);
  reloaded.setOnline(false); reloaded.api.addMistake('word-offline', 'manual'); await reloaded.api.syncMemberLearning();
  assert.equal(reloaded.api.useMemberLearning().phase, 'offline');
  reloaded.setOnline(true); await reloaded.api.syncMemberLearning(); await b.api.syncMemberLearning();
  assert.ok(b.api.useMemberLearning().mistakes.some(item => item.entryId === 'word-offline'));
  reloaded.api.deactivateMemberLearning(); assert.equal(reloaded.api.memberProgress(), null);
});
test('corrupt local fallback does not prevent valid legacy progress migration', async () => {
  // Independent code/device slots for this test.
  await repository.putCode(keyedHash(config.codePepper, 'YZ-LEARNING-TEST'), { type: 'founder', expiresAt: null, maxDevices: 20 });
  const storage = new Map([
    ['yz_progress_HC-06-002', JSON.stringify({ percent: 65, updatedAt: '2026-11-04T00:00:00.000Z' })],
    ['yz_kit_learned', '{"broken":true}'], ['yz_kit_mistakes', '[{"broken":true}]'],
    ['yz_progress___proto__', JSON.stringify({ percent: 10, updatedAt: '2026-11-04T00:00:00.000Z' })],
  ]);
  const c = await client(storage); await c.api.activateMemberLearning();
  assert.equal(c.api.useMemberLearning().phase, 'synced');
  assert.equal(c.api.memberProgress()['HC-06-002'].percent, 65);
});
test('changing membership never imports the previous member cache or old anonymous snapshot', async () => {
  const old = await client(new Map([['yz_progress_HC-06-003', JSON.stringify({ percent: 77, updatedAt: '2026-11-05T00:00:00.000Z' })]]));
  await old.api.activateMemberLearning(); old.api.addMistake('word-old-account', 'manual'); await old.api.syncMemberLearning();
  const other = 'YZ-OTHER-LEARNING-TEST';
  await repository.putCode(keyedHash(config.codePepper, other), { type: 'founder', expiresAt: null });
  const response = await app({ method: 'POST', path: '/v1/membership/redeem', headers: { origin: config.allowedOrigins[0] }, body: JSON.stringify({ code: other }), ip: 'other' });
  const cookie = response.headers['Set-Cookie'].map(value => value.split(';')[0]).join('; ');
  const changed = await client(old.storage, cookie); await changed.api.activateMemberLearning(true);
  assert.deepEqual(plain(changed.api.memberProgress()), {});
  assert.deepEqual(plain(changed.api.useMemberLearning().mistakes), []);
  assert.deepEqual(plain(changed.api.useMemberLearning().learned), []);
});
