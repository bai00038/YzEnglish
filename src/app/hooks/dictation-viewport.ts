interface Bounds { top: number; bottom: number; height: number }

// getBoundingClientRect and visualViewport.offsetTop share layout-viewport
// coordinates. A keyboard pan changes the safe area even without a resize.
export function dictationRevealDelta(input: Bounds, viewportTop: number, viewportHeight: number) {
  const top = viewportTop + 56;
  const bottom = viewportTop + viewportHeight - 20;
  if (input.top >= top && input.bottom <= bottom) return 0;
  return (input.top + input.bottom - top - bottom) / 2;
}
