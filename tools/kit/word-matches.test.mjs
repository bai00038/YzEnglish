import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findKitWordMatches, kitLookupExamples } from '../../src/data/kit-word-matches.ts';
const catalogue = JSON.parse(fs.readFileSync(new URL('../../src/data/kit/catalogue.json', import.meta.url)));
const entries = [...catalogue.words, ...catalogue.chunks, ...catalogue.expressions];
function match(text, start) { return findKitWordMatches(text, 'HC-06-001', start, entries); }

test('HC-06-001 matches toothache, inflected molars and linger at authored lines', () => {
  for (const [text, time, expected] of [
    ["I've had a bad toothache for the past two days.", 3.26, 'toothache'],
    ['One of my lower left molars.', 7.6, 'molars'],
    ['Does the pain go away quickly, or does it linger?', 22.55, 'linger'],
  ]) {
    assert.ok(match(text, time).some(item => text.slice(item.start, item.end) === expected));
  }
});

test('does not highlight chunks, expressions, another scene or another anchor', () => {
  assert.equal(match('It hurts when I bite down, especially when I eat something hard.', 15.3).length, 0);
  const dull = match("It's a dull ache most of the time, throbbing.", 11.66);
  assert.deepEqual(dull.map(item => item.entry.text), ['throbbing']);
  assert.equal(match('One of my lower left molars.', 99).length, 0);
  assert.equal(findKitWordMatches('One of my lower left molars.', 'OTHER', 7.6, entries).length, 0);
});

test('respects token boundaries and retains original punctuation and casing', () => {
  const source = catalogue.words.find(entry => entry.text === 'molar');
  const scoped = { ...source, occurrences: [{ ...source.occurrences[0], sceneId: 'T', anchor_start: 1 }] };
  const text = 'MOLARS, not premolars.';
  const matches = findKitWordMatches(text, 'T', 1, [scoped]);
  assert.deepEqual(matches.map(item => text.slice(item.start, item.end)), ['MOLARS']);
});

test('can use the authored anchor line when a playback timestamp is absent', () => {
  assert.ok(match('One of my lower left molars.', undefined).some(item => item.entry.text === 'molar'));
});

test('examples exclude the current source, deduplicate and prioritize another scene', () => {
  const current = { sceneId: 'A', anchor_start: 1, displayExample: 'Current' };
  const sameScene = { sceneId: 'A', anchor_start: 2, displayExample: 'Same scene' };
  const differentScene = { sceneId: 'B', anchor_start: 3, displayExample: 'Other scene' };
  const entry = { occurrences: [current, sameScene, differentScene, { ...differentScene }] };
  assert.deepEqual(kitLookupExamples(entry, current), [differentScene, sameScene]);
  assert.deepEqual(kitLookupExamples({ occurrences: [current] }, current), []);
});

test('authored slash alternatives and parenthetical notes do not block matching', () => {
  for (const [term, text, expected] of [
    ['fever / cold', 'No fever, no cold?', ['fever', 'cold']],
    ['crowded (teeth)', 'His teeth are crowded.', ['crowded']],
    ['slot / spot', 'Any urgent slots?', ['slots']],
  ]) {
    const entry = { id: 'test', text: term, kind: 'word', occurrences: [{ sceneId: 'T', anchor_start: 1 }] };
    assert.deepEqual(findKitWordMatches(text, 'T', 1, [entry]).map(item => text.slice(item.start, item.end)), expected);
  }
});
