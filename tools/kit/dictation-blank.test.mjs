import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseDictationBlank, isBlankAnswerCorrect } from '../../src/data/dictation-blank.ts';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/dictation-blank.json',import.meta.url)));
const entries=fixture.entries;
test('each tier matches the authored bite down chunk and cavity word',()=>{
  for(const [term,source] of [['bite down','chunk'],['cavity','word']]) {
    const entry=entries.find(e=>e.text===term);
    const occurrence=entry.occurrences.find(e=>e.sceneId==='HC-06-001');
    const text=occurrence.anchor_line;
    const blank=chooseDictationBlank(text,'HC-06-001',occurrence.anchor_start,entries.filter(e=>e.kind===source));
    assert.equal(blank.answer,term); assert.equal(blank.source,source);
    assert.equal(text.slice(blank.start,blank.end),term);
  }
});
test('current OSS deep cavity chunk outranks its cavity word under the general rule',()=>{
  const occurrence=entries.find(e=>e.text==='cavity').occurrences.find(e=>e.sceneId==='HC-06-001');
  const blank=chooseDictationBlank(occurrence.anchor_line,'HC-06-001',occurrence.anchor_start,entries);
  assert.equal(blank.answer,'deep cavity');
  assert.equal(blank.source,'chunk');
});
test('chunk priority wins over an overlapping word; matching reuses inflections and anchors',()=>{
  const chunk=entries.find(e=>e.text==='bite down');
  const word={...chunk,kind:'word',text:'especially'};
  const occurrence=chunk.occurrences.find(e=>e.sceneId==='HC-06-001');
  assert.equal(chooseDictationBlank(occurrence.anchor_line,'HC-06-001',occurrence.anchor_start,[word,chunk]).answer,'bite down');
  assert.equal(chooseDictationBlank('He bites down.','T',1,[{...chunk,occurrences:[{...occurrence,sceneId:'T',anchor_start:1}]}]).answer,'bites down');
  assert.equal(chooseDictationBlank(occurrence.anchor_line,'OTHER',occurrence.anchor_start,entries).source,undefined);
});
test('every real courier dialogue line has exactly one nonempty fallback and no source',()=>{
  assert.ok(fixture.courier.length>10);
  for(const line of fixture.courier) {
    const text=line.en;
    const blank=chooseDictationBlank(text,'DL-01-010',undefined,entries);
    assert.ok(blank.answer.trim(),text); assert.equal(blank.source,undefined);
    assert.equal(text.slice(blank.start,blank.end),blank.answer);
  }
  assert.equal(chooseDictationBlank('Please leave the package downstairs.','T',1,[]).answer,'downstairs');
  assert.ok(chooseDictationBlank('Yes, please.','T',1,[]).answer);
});
test('answer grading ignores case, spacing and punctuation but requires the complete chunk',()=>{
  assert.equal(isBlankAnswerCorrect('bite down','  BITE   DOWN! '),true);
  assert.equal(isBlankAnswerCorrect('cavity','Cavity.'),true);
  assert.equal(isBlankAnswerCorrect('bite down','bite'),false);
  assert.equal(isBlankAnswerCorrect('cavity',''),false);
});
