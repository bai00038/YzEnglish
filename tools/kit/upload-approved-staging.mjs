import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { selectApprovedTts } from './approved-tts.mjs';

// Deliberately fixed destinations: immutable staging audio and a staging-only index.
export async function uploadApprovedStaging({ root, cache, config, targets, expectedCount, dryRun }) {
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const qa = read(path.join(cache, 'content-qa.json'));
  const technical = Object.assign({}, ...fs.readdirSync(cache).filter(f => /^technical-qa-.*\.json$/.test(f)).sort().map(f => read(path.join(cache, f))));
  const selected = selectApprovedTts({ targets, cache, qa, fingerprint: JSON.stringify(config), technical, expectedCount });
  console.log(`Preflight passed: ${selected.length} approved kit audio files; no generation required.`);
  if (dryRun) return;
  const prefix = 'content/tts/staging/kore-podcast-lufs16-v2/';
  const dest = 'oss://yz-english-videos/' + prefix;
  const stage = fs.mkdtempSync(path.join(cache, 'upload-staging-'));
  const run = (command, args) => {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed; staging index was not published`);
  };
  const response = await fetch('https://go.learnyzenglish.com/content/kit/audio-index.json', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Cannot read current audio index; refusing to replace it');
  const baseline = await response.json();
  if (!baseline || Array.isArray(baseline) || !Object.keys(baseline).length || !Object.values(baseline).every(x => x && typeof x.audioUrl === 'string')) throw new Error('Invalid current audio index');
  fs.writeFileSync(path.join(stage, 'baseline-index.json'), JSON.stringify(baseline, null, 2)+'\n');
  const files = path.join(stage, 'audio');fs.mkdirSync(files);
  for (const item of selected) fs.copyFileSync(item.file, path.join(files, item.sha256 + '.mp3'));
  run('ossutil', ['sync', files + '/', dest, '--update', '--meta', 'Content-Type:audio/mpeg#Cache-Control:public,max-age=31536000,immutable']);
  // Verify every uploaded object against its local SHA-256, not only a successful CLI exit.
  let cursor = 0;
  const verified = [];
  const crypto = await import('node:crypto');
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (cursor < selected.length) {
      const item = selected[cursor++];
      const audioUrl = `https://go.learnyzenglish.com/${prefix}${item.sha256}.mp3`;
      const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`Staging audio unavailable: ${item.key}`);
      const hash = crypto.createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex');
      if (hash !== item.sha256) throw new Error(`Staging audio hash mismatch: ${item.key}`);
      verified.push({ ...item, file: path.basename(item.file), audioUrl });
      if (verified.length % 25 === 0) console.log(`${verified.length}/${selected.length} uploaded audio hashes verified`);
    }
  }));
  const index = { ...baseline };
  for (const item of verified) index[item.key] = { audioUrl: item.audioUrl, ...config };
  const outDir = path.join(root, 'public/kit');fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, 'audio-index-v2-staging.json');
  fs.writeFileSync(output + '.tmp', JSON.stringify(index, null, 2)+'\n');fs.renameSync(output+'.tmp', output);
  fs.writeFileSync(path.join(cache, 'staging-upload-report.json'), JSON.stringify({ uploadedAt: new Date().toISOString(), scope: 'staging-only', count: verified.length, indexEntries: Object.keys(index).length, indexFile: 'public/kit/audio-index-v2-staging.json', productionIndexUnchanged: true, records: verified }, null, 2)+'\n');
  console.log(`Uploaded and verified ${verified.length} approved files. Staging index ready (${Object.keys(index).length} total entries). Deploy staging to activate.`);
}
