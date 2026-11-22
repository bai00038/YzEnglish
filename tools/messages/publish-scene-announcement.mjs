// Invoked only by the scene publisher AFTER its lesson verification succeeds.
// This is not imported or executed by the staging website deployment.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergeSceneAnnouncement } from './merge-announcement.mjs';
const [, , entryPath] = process.argv;
if (!entryPath || process.argv.length !== 3) throw new Error('Usage: node tools/messages/publish-scene-announcement.mjs scene-entry.json');
const entry = JSON.parse(fs.readFileSync(entryPath));
const object = 'oss://yz-english-videos/content/kit/announcements.json';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yz-announcement-'));
try {
  const existing = path.join(dir, 'announcements.json');
  const downloaded = spawnSync('ossutil', ['cp', '-f', object, existing], { encoding: 'utf8' });
  if (downloaded.error) throw downloaded.error;
  let file = { announcements: [] };
  if (downloaded.status === 0) file = JSON.parse(fs.readFileSync(existing));
  else if (!/NoSuchKey/.test(downloaded.stderr + downloaded.stdout)) throw new Error('Unable to read current announcements; refusing to overwrite');
  fs.writeFileSync(existing, JSON.stringify(mergeSceneAnnouncement(file, entry), null, 2) + '\n');
  const uploaded = spawnSync('ossutil', ['cp', '-f', existing, object, '--meta', 'Content-Type:application/json#Cache-Control:no-cache'], { stdio: 'inherit' });
  if (uploaded.error) throw uploaded.error;
  if (uploaded.status !== 0) throw new Error('Announcement upload failed; retry using the same scene entry');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
