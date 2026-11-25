import test from 'node:test';
import assert from 'node:assert/strict';
import { kitTestCatalogue } from '../../src/data/kit-test-access.ts';

test('test library shows exactly the first ten of each category without modifying the catalogue', () => {
  const catalogue = { collections: [{ id: 'A' }, { id: 'B' }] };
  for (const kind of ['expressions', 'chunks', 'words']) {
    catalogue[kind] = Array.from({ length: 15 }, (_, i) => ({ id: `${kind}-${i}`, occurrences: [{ collectionId: i < 10 ? 'A' : 'B' }] }));
  }
  const before = structuredClone(catalogue);
  const visible = kitTestCatalogue(catalogue);
  for (const kind of ['expressions', 'chunks', 'words']) {
    assert.deepEqual(visible[kind].map(e => e.id), catalogue[kind].slice(0, 10).map(e => e.id));
    assert.equal(visible[kind].filter(e => e.occurrences.some(o => o.collectionId === 'B')).length, 0);
    assert.equal(visible[kind].find(e => e.id === `${kind}-14`), undefined);
  }
  assert.deepEqual(catalogue, before);
  assert.equal(visible.collections, catalogue.collections);
});

test('short and empty categories retain their order with no invented entries', () => {
  const catalogue = { expressions: [], chunks: [{ id: 'one' }], words: [], collections: [] };
  assert.deepEqual(kitTestCatalogue(catalogue), catalogue);
});
