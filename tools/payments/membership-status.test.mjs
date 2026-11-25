import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';

const code = (await build({ entryPoints: ['src/app/components/MembershipStatusCard.tsx'], bundle: true, format: 'cjs', platform: 'node', write: false,
  alias: { '@': new URL('../../src', import.meta.url).pathname }, external: ['react', 'react-router'], loader: { '.css': 'empty' }, jsx: 'automatic' })).outputFiles[0].text;
const m = { exports: {} }; new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), m, m.exports);
const now = Date.parse('2026-11-23T12:00:00Z');
const render = (days, overrides = {}) => renderToStaticMarkup(React.createElement(StaticRouter, null, React.createElement(m.exports.MembershipStatusCard, {
  isUnlocked: days > 0, isExpired: days <= 0, membership: { type: 'year', expiresAt: new Date(now + days * 86400000).toISOString() },
  now, onUnlock() {}, onExit() {}, ...overrides,
}, React.createElement('span', null, '现有兑换码操作'))));
const action = html => html.match(/<a[^>]*href="\/membership"[^>]*>.*?<\/a>/)?.[0];

test('unopened membership offers primary purchase and secondary code unlock', () => {
  const html = render(0, { membership: null, isExpired: false });
  assert.match(action(html), /bg-primary/); assert.match(action(html), /开通会员/);
  assert.match(action(html), /target="_blank"/); assert.match(action(html), /rel="noopener noreferrer"/);
  assert.match(html, /<button[^>]*bg-card[^>]*>输入兑换码解锁/);
});
test('renewal stays available beyond 30 days, preserving date and code controls', () => {
  const html = render(31); assert.match(action(html), /bg-card/); assert.match(action(html), /续费/); assert.match(action(html), /target="_blank"/);
  assert.match(html, /YZ ENGLISH 会员/); assert.match(html, /有效期至 <b>2026年12月24日/); assert.match(html, /现有兑换码操作/);
  assert.doesNotMatch(html, /member-card-warning/);assert.match(html,/member-card-active/);assert.match(html,/退出本设备/);
});
test('30-day boundary and final partial day highlight renewal with reminder', () => {
  for (const [days, label] of [[30, 30], [0.25, 1]]) {
    const html = render(days); assert.match(action(html), /is-urgent/); assert.ok(html.includes(`还剩 ${label} 天`));
  }
  assert.match(action(render(30.001)), /bg-card/);
});
test('expired membership has primary renewal and retains code entry', () => {
  const html = render(0); assert.match(html, /会员已过期/); assert.match(action(html), /bg-primary/);
  assert.match(action(html), /续费/); assert.match(html, /现有兑换码操作/);assert.match(html,/退出本设备/); assert.doesNotMatch(html, /还剩|member-card-active/);
});
test('lifetime legacy membership has no expiry reminder', () => {
  const html = render(31, { membership: { type: 'founder', expiresAt: null } });
  assert.match(html, /终身有效/); assert.match(action(html), /bg-card/); assert.doesNotMatch(html, /member-card-warning/);assert.match(html,/member-card-active/);assert.match(html,/退出本设备/);
});

test('card uses actual device count and plan without showing a normal-state badge', () => {
  const html = render(365, { membership: { type: 'year', expiresAt: '2028-11-23T00:00:00Z', planName: '双年卡', activeSessions: 2 } });
  assert.match(html,/已在 2 台设备使用/);assert.match(html,/（双年卡）/);assert.doesNotMatch(html,/member-card-warning|续费用原邮箱/);
});
