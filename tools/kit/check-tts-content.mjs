import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeText } from './normalize.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = path.join(root, 'tools/kit/.tts-cache/kore-podcast-lufs16-v2');
const config = JSON.parse(fs.readFileSync(path.join(cache, 'config.json'), 'utf8'));
const configFingerprint = JSON.stringify(config);
const asrModel = 'gemini-3.5-transcribe';
const args = process.argv.slice(2);
const continueOnMismatch = args.includes('--continue-on-mismatch');
const limitAt = args.indexOf('--limit');
const limit = limitAt < 0 ? Infinity : Number(args[limitAt + 1]);
if (!(limit > 0)) throw new Error('--limit must be positive');
const envPath = path.join(root, '.env.tts.local');
const envLine = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find(line => line.startsWith('GEMINI_API_KEY=')) : undefined;
const apiKey = process.env.GEMINI_API_KEY || envLine?.slice('GEMINI_API_KEY='.length).trim();
if (!apiKey) throw new Error('GEMINI_API_KEY is required');
const targets = new Map();
for (const name of ['tts-targets.json', 'tts-scenepage-targets.json', 'tts-words-targets.json']) {
  for (const target of JSON.parse(fs.readFileSync(path.join(root, 'tools/kit', name), 'utf8'))) {
    const key = target.normalizedKey ?? normalizeText(target.text ?? target.spokenText);
    if (!targets.has(key)) targets.set(key, target);
  }
}
const reportPath = path.join(cache, 'content-qa.json');
let report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : { configFingerprint, model: asrModel, entries: {} };
if (report.configFingerprint !== configFingerprint) throw new Error('QA configuration does not match the audio cache');
let checked = 0;
let nextRequestAt = 0;
for (const [key, target] of targets) {
  const file = path.join(cache, target.file);
  if (!fs.existsSync(file)) continue;
  const data = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const prior = report.entries[key];
  if (prior?.sha256 === sha256 && (prior.passed || (continueOnMismatch && prior.transcriptModel === asrModel))) continue;
  const waitMs = Math.max(0, nextRequestAt - Date.now());
  if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
  nextRequestAt = Date.now() + 11000;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
    body: JSON.stringify({ model: asrModel,
      input: [{ type: 'audio', mime_type: 'audio/mpeg', data: data.toString('base64') }],
      generation_config: { transcription_config: { mode: { type: 'verbatim', timestamp_granularities: ['word'] } } },
    }),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const diagnostic = String(details.error?.message ?? '').split(apiKey).join('[redacted]').slice(0, 700);
    throw new Error(`Audio content transcription failed (HTTP ${response.status}): ${diagnostic}; nothing published`);
  }
  const result = await response.json();
  const transcript = (result.steps ?? []).filter(step => step.type === 'model_output')
    .flatMap(step => step.content ?? []).filter(part => part.type === 'text').map(part => part.text ?? '').join(' ').trim();
  if (!transcript) throw new Error('Transcription returned no transcript');
  const passed = normalizeText(transcript) === normalizeText(target.spokenText);
  const previousCheck = report.entries[key];
  report.entries[key] = { sha256, expectedText: target.spokenText, transcript, passed, transcriptModel: asrModel, checkedAt: new Date().toISOString(),
    ...(previousCheck && !previousCheck.passed ? { previousCheck } : {}) };
  report.model = 'mixed; see entries.transcriptModel (legacy entries: gemini-3.8-flash)';
  fs.writeFileSync(reportPath + '.tmp', JSON.stringify(report, null, 2) + '\n');
  fs.renameSync(reportPath + '.tmp', reportPath);
  console.log(JSON.stringify({ key, transcript, passed }));
  if (!passed && !continueOnMismatch) throw new Error('Spoken content does not exactly match target; audio must not be published');
  if (++checked >= limit) break;
}
const reviewCount = Object.values(report.entries).filter(entry => !entry.passed).length;
console.log(`${checked} new audio content checks completed; ${reviewCount} need review; OSS unchanged.`);
if (reviewCount) process.exitCode = 1;
