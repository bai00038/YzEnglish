import test from 'node:test';
import assert from 'node:assert/strict';
import { getSceneNavigation, buildSceneHref } from '../../src/data/scene-navigation.ts';

test('continue and completed review links return to My Learning; only continue resumes', () => {
  const continuing = buildSceneHref('dental-pain', { from: 'membership', resume: true });
  const review = buildSceneHref('dental-pain', { from: 'membership' });
  assert.equal(continuing, '/scenes/dental-pain?resume=1&from=membership');
  assert.equal(review, '/scenes/dental-pain?from=membership');
  for (const href of [continuing, review]) {
    const params = new URL(href, 'https://example.test').searchParams;
    assert.equal(getSceneNavigation(params).returnTo, '/membership');
    assert.equal(getSceneNavigation(params).returnLabel, '返回我的学习');
  }
});
test('adjacent scene keeps source through reload without forcing the resume step', () => {
  const first = new URL(buildSceneHref('first', { from: 'membership', resume: true }), 'https://example.test');
  const context = getSceneNavigation(first.search);
  const next = new URL(buildSceneHref('second', { from: context.from }), 'https://example.test');
  assert.equal(next.searchParams.get('from'), 'membership');
  assert.equal(next.searchParams.has('resume'), false);
  assert.equal(getSceneNavigation(next.search).returnTo, '/membership');
});
test('normal library/direct links preserve Explore return, and arbitrary return input is ignored', () => {
  assert.equal(buildSceneHref('dental-pain'), '/scenes/dental-pain');
  for (const search of ['', '?resume=1', '?from=unknown', '?from=https://untrusted.test', '?returnTo=https://untrusted.test']) {
    assert.equal(getSceneNavigation(search).returnTo, '/explore');
    assert.equal(getSceneNavigation(search).returnLabel, '返回场景库');
  }
});


test('desktop and mobile navigation select the scene source rather than an unrelated section', async () => {
  const { isNavActive } = await import('../../src/app/components/nav-utils.ts');
  assert.equal(isNavActive('/scenes/lesson', '/membership', '?from=membership'), true);
  assert.equal(isNavActive('/scenes/lesson', '/explore', '?from=membership'), false);
  assert.equal(isNavActive('/scenes/lesson', '/explore'), true);
  assert.equal(isNavActive('/scenes/lesson', '/membership'), false);
  assert.equal(isNavActive('/membership/learned', '/membership'), true);
  assert.equal(isNavActive('/', '/'), true);
});
