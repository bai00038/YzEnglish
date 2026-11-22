import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isAnnouncementFile } from '../../src/data/learning-overview.ts';
export function mergeSceneAnnouncement(file, entry) {
  if (!isAnnouncementFile(file)) throw new Error('Invalid existing announcement file; refusing to overwrite');
  if (!entry?.externalId || !entry.slug || !entry.titleZh || !Number.isFinite(Date.parse(entry.publishedAt))) throw new Error('Incomplete published scene');
  const id = `scene:${entry.externalId}`;
  const announcement = { id, type: 'new-scene', title: `新集上线：${entry.titleZh}`, body: entry.titleEn || '新的英语场景已经上线。', publishedAt: entry.publishedAt, href: `/scenes/${entry.slug}`, action: { label: '去看这一集', path: `/scenes/${entry.slug}` } };
  const result = { announcements: [announcement, ...file.announcements.filter(item => item.id !== id)] };
  if (!isAnnouncementFile(result)) throw new Error('Invalid new announcement');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , existing, entry, output] = process.argv;
  if (!existing || !entry || !output) throw new Error('Usage: node tools/messages/merge-announcement.mjs existing.json scene-entry.json output.json');
  fs.writeFileSync(output, JSON.stringify(mergeSceneAnnouncement(JSON.parse(fs.readFileSync(existing)), JSON.parse(fs.readFileSync(entry))), null, 2) + '\n');
}
