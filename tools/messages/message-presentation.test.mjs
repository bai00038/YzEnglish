import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { expiryNotice, getMessageAction, isAnnouncementFile, messageDetailHref } from '../../src/data/learning-overview.ts';
import { mergeSceneAnnouncement } from './merge-announcement.mjs';

const code = (await build({ entryPoints: ['src/app/components/MessageCard.tsx'], bundle: true, format: 'cjs', platform: 'node', write: false,
  alias: { '@': new URL('../../src', import.meta.url).pathname }, external: ['react', 'react-router'], loader: { '.css': 'empty' }, jsx: 'automatic' })).outputFiles[0].text;
const componentModule = { exports: {} };
new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), componentModule, componentModule.exports);
const { MessageListCard, MessageDetailCard } = componentModule.exports;
const notice = { id: 'notice:/a?x=1', type: 'announcement', title: '课程更新说明', body: '第一段完整正文。\n\n第二段完整正文，包含全部消息内容。', publishedAt: '2026-11-21T12:00:00Z' };
const render = (Component, props) => renderToStaticMarkup(React.createElement(StaticRouter, { location: '/membership/messages' }, React.createElement(Component, props)));

test('announcement action accepts only a label plus internal path; old href is compatible', () => {
  assert.equal(isAnnouncementFile({ announcements: [{ ...notice, action: { label: '查看课程', path: '/scenes/lesson' } }] }), true);
  assert.deepEqual(getMessageAction({ ...notice, action: { label: '查看课程', path: '/scenes/lesson' } }), { label: '查看课程', path: '/scenes/lesson' });
  assert.equal(getMessageAction({ ...notice, type: 'new-scene', href: '/scenes/lesson' }).label, '去看这一集');
  for (const path of ['https://external.test', '//external.test', '/\\external.test', 'javascript:alert(1)', '/bad\npath']) {
    assert.equal(isAnnouncementFile({ announcements: [{ ...notice, action: { label: '跳转', path } }] }), false);
    assert.equal(getMessageAction({ ...notice, action: { label: '跳转', path } }), undefined);
  }
  assert.equal(isAnnouncementFile({ announcements: [{ ...notice, action: { label: '', path: '/membership' } }] }), false);
  assert.equal(isAnnouncementFile({ announcements: [{ ...notice, action: { label: '查看', path: 42 } }] }), false);
});
test('list card links to an independent detail URL rather than directly to the action target', () => {
  const html = render(MessageListCard, { message: { ...notice, action: { label: '查看课程', path: '/scenes/lesson' } }, unread: true });
  assert.match(html, /message-unread-dot/);
  assert.match(html, /message-list-footer/);
  assert.match(html, /message-preview/);
  assert.match(html, /查看详情/);
  assert.equal((html.match(/<a /g) || []).length, 1);
  assert.equal(html.includes('href="/scenes/lesson"'), false);
  const href = messageDetailHref(notice.id);
  assert.equal(new URL(href, 'https://example.test').searchParams.get('id'), notice.id);
  assert.ok(html.includes(href.replaceAll('&', '&amp;')));
  const read = render(MessageListCard, { message: notice, unread: false });
  assert.match(read, /is-read/); assert.equal(read.includes('message-unread-dot'), false);
});
test('details render the complete body and exactly one optional action', () => {
  const plain = render(MessageDetailCard, { message: notice });
  assert.match(plain, /message-detail-title/); assert.match(plain, /第二段完整正文/);
  assert.equal(plain.includes('message-action'), false);
  const targeted = render(MessageDetailCard, { message: { ...notice, action: { label: '查看我的会员', path: '/membership' } } });
  assert.match(targeted, /href="\/membership"/); assert.match(targeted, /查看我的会员/);
  const legacy = render(MessageDetailCard, { message: { ...notice, href: '/explore' } });
  assert.match(legacy, /前往查看/);
});
test('personal reminder uses full local text and a membership action', () => {
  const [message] = expiryNotice({ type: 'month', expiresAt: '2026-11-25T00:00:00Z', unlockedAt: '2026-11-01' }, Date.parse('2026-11-21T00:00:00Z'));
  assert.match(message.body, /目前还剩 4 天/); assert.match(message.body, /我的学习/);
  assert.deepEqual(message.action, { label: '查看我的会员', path: '/membership' });
  assert.match(render(MessageDetailCard, { message }), /message-action/);
});
test('new scene announcements include the full body and a labeled internal action', () => {
  const file = mergeSceneAnnouncement({ announcements: [] }, { externalId: 'SH-01-001', slug: 'shopping', titleZh: '购物', titleEn: 'Shopping', publishedAt: notice.publishedAt });
  assert.deepEqual(file.announcements[0].action, { label: '去看这一集', path: '/scenes/shopping' });
  assert.equal(isAnnouncementFile(file), true);
});
