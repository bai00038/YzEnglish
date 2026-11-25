// pageshow also fires when a frozen page returns from the browser back/forward cache.
export function subscribeCheckoutReturn(target: Pick<Window, 'addEventListener' | 'removeEventListener'>, isInFlight: () => boolean, reset: () => void) {
  const onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted || isInFlight()) reset();
  };
  target.addEventListener('pageshow', onPageShow);
  return () => target.removeEventListener('pageshow', onPageShow);
}
