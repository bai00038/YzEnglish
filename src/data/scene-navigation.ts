export type SceneOrigin = 'membership';

// Keep the source in the URL so reloads/new tabs and adjacent lessons retain it.
// Return destinations are fixed internal routes, never arbitrary input URLs.
export function getSceneNavigation(search: string | URLSearchParams) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const from: SceneOrigin | undefined = params.get('from') === 'membership' ? 'membership' : undefined;
  const section = from ? '我的学习' : '场景库';
  return { from, returnTo: from ? '/membership' : '/explore', section, returnLabel: `返回${section}` };
}

export function buildSceneHref(slug: string, { from, resume = false }: { from?: SceneOrigin; resume?: boolean } = {}) {
  const params = new URLSearchParams();
  if (resume) params.set('resume', '1');
  if (from === 'membership') params.set('from', from);
  const query = params.toString();
  return `/scenes/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
}
