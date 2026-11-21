import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createKitRemoteLoader, isKitAudioIndex, isKitCatalogue } from '../../src/data/kit-remote.ts';

const fallback = { local: { audioUrl: '/local.mp3' } };
const remote = { remote: { audioUrl: 'https://example.com/new.mp3' } };
function loader(fetchImpl, extra = {}) {
  return createKitRemoteLoader({ url: 'https://example.com/index.json', bundled: async () => fallback, validate: isKitAudioIndex, fetchImpl, ...extra });
}

test('runtime prefers OSS and shares requests within a page; a new page gets the updated index', async () => {
  let requests = 0;
  let current = remote;
  const fetchImpl = async (url, options) => {
    requests++;
    assert.equal(url, 'https://example.com/index.json');
    assert.equal(options.cache, undefined);
    return Response.json(current);
  };
  const load = loader(fetchImpl);
  assert.deepEqual(await Promise.all([load(), load()]), [remote, remote]);
  assert.equal(requests, 1);
  current = { updated: { audioUrl: 'https://example.com/updated.mp3' } };
  assert.deepEqual(await loader(fetchImpl)(), current);
  assert.equal(requests, 2);
});

for (const [name, fetchImpl] of [
  ['offline', async () => { throw new TypeError('offline'); }],
  ['403', async () => new Response('', { status: 403 })],
  ['404', async () => new Response('', { status: 404 })],
  ['invalid JSON', async () => new Response('{broken')],
  ['invalid index structure', async () => Response.json({ bad: {} })],
  ['empty index', async () => Response.json({})],
]) {
  test(`${name} falls back to bundled data`, async () => assert.equal(await loader(fetchImpl)(), fallback));
}

test('a hanging request times out and falls back', async () => {
  const load = loader((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }), { timeoutMs: 10 });
  assert.equal(await load(), fallback);
});

test('catalogue validation accepts the complete local data and rejects corrupt shapes', async () => {
  const read = file => JSON.parse(fs.readFileSync(new URL(`../../src/data/kit/${file}`, import.meta.url)));
  const catalogue = read('catalogue.json');
  assert.equal(isKitCatalogue(catalogue), true);
  assert.equal(isKitAudioIndex(read('audio-index.json')), true);
  assert.equal(isKitAudioIndex(read('clips-index.json')), true);
  for (const invalid of [null, {}, { ...catalogue, words: [{}] }, { ...catalogue, collections: [{}] }]) {
    assert.equal(isKitCatalogue(invalid), false);
    const load = createKitRemoteLoader({ url: '/catalogue.json', fetchImpl: async () => Response.json(invalid), bundled: async () => catalogue, validate: isKitCatalogue });
    assert.equal(await load(), catalogue);
  }
});
