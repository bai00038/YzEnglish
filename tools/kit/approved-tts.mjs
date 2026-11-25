import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeText } from './normalize.mjs';

export function selectApprovedTts({ targets, cache, qa, fingerprint, technical, expectedCount }) {
  if (qa.configFingerprint !== fingerprint) throw new Error('QA configuration mismatch');
  const selected = [];
  const seen = new Set();
  for (const target of targets) {
    const key = target.normalizedKey ?? normalizeText(target.text ?? target.spokenText);
    if (seen.has(key)) continue;
    seen.add(key);
    const checked = qa.entries?.[key];
    if (!checked?.passed) continue;
    const filename = crypto.createHash('sha256').update(key).digest('hex') + '.mp3';
    if (target.file !== filename) throw new Error(`Invalid target hash: ${key}`);
    const file = path.join(cache, filename);
    if (!fs.existsSync(file)) throw new Error(`Missing approved audio: ${key}`);
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (checked.sha256 !== sha256 || normalizeText(checked.expectedText) !== normalizeText(target.spokenText)
      || normalizeText(checked.transcript) !== normalizeText(target.spokenText)) throw new Error(`Stale transcript QA: ${key}`);
    const tech = technical[filename];
    if (!tech?.passed || tech.sha256 !== sha256) throw new Error(`Missing technical QA: ${key}`);
    selected.push({ key, text: target.spokenText, file, sha256 });
  }
  if (!selected.length || selected.length !== expectedCount) throw new Error(`Approved count ${selected.length} does not match requested ${expectedCount}`);
  return selected;
}
