import test from 'node:test';
import assert from 'node:assert/strict';
import { splitLearningScenes, isAnnouncementFile, expiryNotice, unreadMessageIds } from '../../src/data/learning-overview.ts';
import { mergeSceneAnnouncement } from './merge-announcement.mjs';

test('3 continuing + 8 completed are disjoint and sorted most recent first', () => {
  const scenes = Array.from({ length: 12 }, (_, id) => ({ id, externalId: `scene-${id}` }));
  const progress = Object.fromEntries(scenes.slice(0, 11).map((scene, index) => [scene.externalId, { percent: index < 3 ? 25 + index : 100, updatedAt: `2026-11-${String(index + 1).padStart(2, '0')}T12:00:00Z` }]));
  const result = splitLearningScenes(scenes, progress);
  assert.equal(result.continuing.length, 3); assert.equal(result.completed.length, 8);
  assert.deepEqual(result.continuing.map(item => item.scene.id), [2, 1, 0]);
  assert.equal(result.continuing.some(item => item.progress.percent >= 100), false);
  assert.equal(splitLearningScenes(scenes, {}).continuing.length, 0);
  progress['scene-11'] = { percent: 0, updatedAt: '2026-11-21' };
  assert.equal(splitLearningScenes(scenes, progress).continuing.length, 3);
});
test('notices have stable read IDs across session refresh and day changes', () => {
  const member = { type: 'month', expiresAt: '2026-11-25T00:00:00Z', unlockedAt: '2026-11-01' };
  const notices = expiryNotice(member, Date.parse('2026-11-21T00:00:00Z'));
  assert.equal(notices[0].title, '会员还有 4 天到期');
  const refreshed = expiryNotice({ ...member, unlockedAt: '2026-11-22' }, Date.parse('2026-11-22T00:00:00Z'));
  assert.equal(notices[0].id, refreshed[0].id);
  assert.deepEqual(unreadMessageIds(refreshed, [notices[0].id]), []);
  assert.deepEqual(expiryNotice({ ...member, expiresAt: null }), []);
  assert.deepEqual(expiryNotice(member, Date.parse('2026-11-01')), []);
  assert.deepEqual(expiryNotice(null), []);
});
const announcement = { id: 'a', type: 'announcement', title: 'Title', body: 'Body', publishedAt: '2026-11-21T12:00:00Z', href: '/explore' };
test('announcement schema rejects unsafe links, duplicates and malformed data; empty is valid', () => {
  assert.equal(isAnnouncementFile({ announcements: [] }), true);
  assert.equal(isAnnouncementFile({ announcements: [announcement] }), true);
  for (const href of ['javascript:alert(1)', '//external.example', '/\\external.example', 'https://external.example']) assert.equal(isAnnouncementFile({ announcements: [{ ...announcement, href }] }), false);
  assert.equal(isAnnouncementFile({ announcements: [announcement, announcement] }), false);
  assert.equal(isAnnouncementFile({ announcements: [{ ...announcement, publishedAt: 'bad' }] }), false);
  assert.equal(isAnnouncementFile({ announcements: [{ ...announcement, type: 'personal' }] }), false);
  assert.equal(isAnnouncementFile({}), false);
});
test('new scene publish preserves manual notices and is idempotent; corrupt files refuse overwrite', () => {
  const entry = { externalId: 'SH-01-001', slug: 'shopping', titleZh: '购物', titleEn: 'Shopping', publishedAt: '2026-11-21T12:00:00Z' };
  const first = mergeSceneAnnouncement({ announcements: [announcement] }, entry);
  assert.equal(first.announcements.length, 2);
  assert.equal(first.announcements[0].href, '/scenes/shopping');
  assert.deepEqual(mergeSceneAnnouncement(first, entry), first);
  assert.throws(() => mergeSceneAnnouncement({}, entry));
});
