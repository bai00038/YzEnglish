import { getSceneNavigation } from '../../data/scene-navigation.ts';

export function isNavActive(pathname: string, path: string, search = '') {
  if (pathname.startsWith('/scenes/')) return path === getSceneNavigation(search).returnTo;
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}
