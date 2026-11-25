import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { selectApprovedTts } from './approved-tts.mjs';

function fixture(t) {
  const cache=fs.mkdtempSync(path.join(os.tmpdir(),'yz-approved-tts-'));
  t.after(()=>fs.rmSync(cache,{recursive:true,force:true}));
  const file=crypto.createHash('sha256').update('hello').digest('hex')+'.mp3';
  fs.writeFileSync(path.join(cache,file),'approved-test-audio');
  const sha256=crypto.createHash('sha256').update('approved-test-audio').digest('hex');
  return {cache,targets:[{normalizedKey:'hello',spokenText:'Hello',file},{normalizedKey:'review',spokenText:'Review'}],fingerprint:'config',qa:{configFingerprint:'config',entries:{hello:{passed:true,expectedText:'Hello',transcript:'Hello.',sha256},review:{passed:false}}},technical:{[file]:{passed:true,sha256}},expectedCount:1};
}
test('only passed current targets are selected; review entries are excluded', t=>{
 const f=fixture(t);assert.deepEqual(selectApprovedTts(f).map(x=>x.key),['hello']);
});
test('modified approved audio is rejected before any upload', t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.cache,f.targets[0].file),'changed');assert.throws(()=>selectApprovedTts(f),/Stale transcript/);
});
test('wrong spoken text cannot be published even when passed is true', t=>{
 const f=fixture(t);f.qa.entries.hello.transcript='Read in a Podcast style Hello';assert.throws(()=>selectApprovedTts(f),/Stale transcript/);
});
test('stale technical or configuration QA prevents publication', t=>{
 const f=fixture(t);f.technical[f.targets[0].file].sha256='stale';assert.throws(()=>selectApprovedTts(f),/technical QA/);
 f.qa.configFingerprint='old';assert.throws(()=>selectApprovedTts(f),/configuration mismatch/);
});
test('requested count must match, preventing silent partial publication', t=>{
 const f=fixture(t);f.expectedCount=150;assert.throws(()=>selectApprovedTts(f),/count 1 does not match requested 150/);
});
