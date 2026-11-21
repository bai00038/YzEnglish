import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { buildCatalogue } from "./build-index.mjs";
import { normalizeText } from "./normalize.mjs";

const read = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url)));
const source = read("./catalogue-source.json");
const chunks = read("./chunks-source.json").chunks;
const words = read("./words-source.json").words;
const catalogue = buildCatalogue(source, chunks, {}, words);
const clips = read("../../src/data/kit/clips-index.json");

test("v3 preserves 127 expressions, 46 chunks, 130 words, frequency order and all sources", () => {
  assert.equal(catalogue.expressions.length, 127);
  assert.equal(catalogue.chunks.length, 46);
  assert.equal(catalogue.words.length, 130);
  assert.deepEqual(catalogue.words.map(entry => entry.id), words.map(entry => entry.id));
  assert.equal(catalogue.collections.length, 10);
  assert.deepEqual(catalogue.expressions.map(entry => entry.id), source.expressions.map(entry => entry.id));
  for (const entry of [...catalogue.expressions, ...catalogue.chunks, ...catalogue.words]) {
    assert.equal(new Set([...catalogue.expressions, ...catalogue.chunks, ...catalogue.words].map(item => item.id)).size, 303);
    assert.ok(!entry.explanation);
    assert.ok(entry.occurrences.length > 0);
  }
});

test("chunk collection counts include the two empty collections", () => {
  const expected = { C1: 10, C2: 17, C4: 14, C5: 4, C12: 1, C7: 4, C8: 10, C9: 3, C6: 0, C10: 0 };
  for (const collection of catalogue.collections) {
    assert.equal(chunks.filter(entry => entry.occurrences.some(source => source.collectionId === collection.id)).length, expected[collection.id]);
  }
});

test("context examples keep their original anchor keys and have indexed clips", () => {
  const contextual = catalogue.expressions.flatMap(entry => entry.occurrences).filter(source => source.contextLine);
  assert.equal(contextual.length, 198);
  assert.ok(catalogue.expressions.some(entry => entry.text === "Of course." && entry.occurrences.some(source => source.contextLine)));
  for (const entry of [...catalogue.expressions, ...chunks]) {
    for (const source of entry.occurrences) {
      if (source.anchor_start === null) continue;
      assert.ok(clips[`${source.sceneId}@${source.anchor_start.toFixed(2)}`], `Missing clip for ${entry.text}: ${source.sceneId}`);
    }
  }
});

test("kit and scene-page TTS targets share stable hashes and reuse existing audio", () => {
  const targets = read("./tts-targets.json");
  const sceneTargets = read("./tts-scenepage-targets.json");
  assert.equal(targets.length, 173);
  assert.equal(sceneTargets.length, 716);
  const wordTargets = read("./tts-words-targets.json");
  assert.equal(wordTargets.length, 130);
  assert.deepEqual(wordTargets.map(target => target.normalizedKey).sort(), words.map(entry => entry.key).sort());
  const keys = new Set();
  for (const target of [...targets, ...sceneTargets, ...wordTargets]) {
    const key = target.normalizedKey ?? normalizeText(target.text ?? target.spokenText);
    assert.equal(crypto.createHash("sha256").update(key).digest("hex") + ".mp3", target.file);
    keys.add(key);
  }
  assert.equal(keys.size, 1014);
  const key = source.expressions[0].key;
  const enriched = buildCatalogue(source, chunks, { [key]: { audioUrl: "https://example.com/reused.mp3" } });
  assert.equal(enriched.expressions[0].audioUrl, "https://example.com/reused.mp3");
});

test("word progress reflects the two covered collections and words reuse audio", () => {
  const covered = new Set(words.flatMap(entry => entry.occurrences.map(source => source.collectionId)));
  assert.deepEqual([...covered].sort(), ["C1", "C2"]);
  assert.ok([...covered].every(id => catalogue.collections.some(collection => collection.id === id)));
  for (const entry of words) {
    for (const source of entry.occurrences) {
      assert.ok(source.anchor_start === null || (Number.isFinite(source.anchor_start) && source.anchor_start >= 0));
      assert.ok(clips[`${source.sceneId}@${source.anchor_start?.toFixed(2)}`] || (source.videoUrl && source.dataUrl), `Missing clip and video fallback for ${entry.text}`);
    }
  }
  assert.ok(words.every(entry => entry.pos && entry.note));
  const key = words[0].key;
  const enriched = buildCatalogue(source, chunks, { [key]: { audioUrl: "https://example.com/word.mp3" } }, words);
  assert.equal(enriched.words[0].audioUrl, "https://example.com/word.mp3");
});
