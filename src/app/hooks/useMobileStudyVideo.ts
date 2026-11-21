import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { dictationRevealDelta } from './dictation-viewport';

function isDictationInput(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && Boolean(element.closest('.dictation-practice-card'));
}

export function useMobileStudyVideo(sectionRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [studySnapped, setStudySnapped] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const keyboardOpenRef = useRef(false);
  const [viewportTop, setViewportTop] = useState(0);
  const enterStudyRef = useRef<(() => void) | null>(null);
  const enterStudy = useCallback(() => {
    if (!enterStudyRef.current) return false;
    enterStudyRef.current();
    return true;
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobile || !enabled) {
      keyboardOpenRef.current = false;
      setKeyboardOpen(false); setViewportTop(0);
      return;
    }
    const viewport = window.visualViewport;
    let fullHeight = viewport?.height ?? window.innerHeight;
    let practiceSession = false;
    let measuredKeyboard = false;
    let pendingInput: HTMLInputElement | HTMLTextAreaElement | null = null;
    let settleTimer = 0;
    const clearReveal = () => { window.clearTimeout(settleTimer); pendingInput = null; };
    const syncViewport = () => {
      const focused = isDictationInput(document.activeElement);
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport?.offsetTop ?? 0;
      const loss = Math.max(fullHeight - height, window.innerHeight - height - offset);
      if (focused) practiceSession = true;
      if (practiceSession && loss > 100) measuredKeyboard = true;
      const open = practiceSession && (loss > 100 || (focused && !measuredKeyboard));
      // The synchronous ref also suspends snap during focus transitions,
      // before React commits and while Safari is closing its keyboard.
      keyboardOpenRef.current = open;
      setKeyboardOpen(open);
      setViewportTop(open ? offset : 0);
      if (!open && !focused) {
        practiceSession = false; measuredKeyboard = false;
        fullHeight = Math.max(fullHeight, height);
      }
    };
    const scheduleReveal = (delay: number) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const input = pendingInput;
        pendingInput = null; // Our own scroll must never schedule a second correction.
        if (!input || document.activeElement !== input || !keyboardOpenRef.current) return;
        const delta = dictationRevealDelta(input.getBoundingClientRect(), viewport?.offsetTop ?? 0, viewport?.height ?? window.innerHeight);
        if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
      }, delay);
    };
    const focus = () => {
      syncViewport();
      const input = document.activeElement;
      if (!isDictationInput(input)) { clearReveal(); return; }
      pendingInput = input;
      // A real keyboard resize restarts this deadline below. The longer
      // fallback avoids jumping before the keyboard animation even starts.
      scheduleReveal(500);
    };
    const resize = () => {
      const wasOpen = keyboardOpenRef.current;
      syncViewport();
      const input = document.activeElement;
      if (!keyboardOpenRef.current) { clearReveal(); return; }
      if (!wasOpen && isDictationInput(input)) pendingInput = input;
      if (pendingInput) {
        scheduleReveal(180);
      }
    };
    const scroll = () => {
      syncViewport(); // Always track the bar, including Safari's focus pan.
      if (pendingInput) scheduleReveal(measuredKeyboard ? 180 : 500);
    };
    const blur = () => { clearReveal(); syncViewport(); };
    // Manual scrolling cancels the pending focus correction; it never locks
    // the learner into the practice card while the keyboard is showing.
    const manualScroll = () => clearReveal();
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blur);
    window.addEventListener('touchmove', manualScroll, { passive: true });
    window.addEventListener('wheel', manualScroll, { passive: true });
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', scroll);
    window.addEventListener('resize', resize);
    focus();
    return () => {
      clearReveal();
      keyboardOpenRef.current = false;
      document.removeEventListener('focusin', focus); document.removeEventListener('focusout', blur);
      window.removeEventListener('touchmove', manualScroll);
      window.removeEventListener('wheel', manualScroll);
      viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
    };
  }, [mobile, enabled]);
  const videoDocked = mobile && enabled && (studySnapped || keyboardOpen);
  useEffect(() => {
    const section = sectionRef.current;
    if (!mobile || !enabled || !section) { setStudySnapped(false); return; }
    let snapped = false;
    let blocked = false;
    let aligning = false;
    let releaseGesture = false;
    let touchY = 0;
    let frame = 0;
    const target = () => window.innerWidth * 9 / 16 + 8;
    let previous = section.getBoundingClientRect().top - target();
    const dismiss = () => {
      snapped = false;
      blocked = true;
      setStudySnapped(false);
    };
    const snap = () => {
      if (keyboardOpenRef.current) return;
      window.cancelAnimationFrame(frame);
      snapped = true;
      blocked = false;
      aligning = true;
      releaseGesture = false;
      setStudySnapped(true);
      frame = window.requestAnimationFrame(() => {
        if (keyboardOpenRef.current || isDictationInput(document.activeElement)) { aligning = false; return; }
        window.scrollBy({ top: section.getBoundingClientRect().top - target(), behavior: 'instant' });
        previous = 0;
        aligning = false;
      });
    };
    enterStudyRef.current = snap;
    const scroll = () => {
      const distance = section.getBoundingClientRect().top - target();
      if (keyboardOpenRef.current || aligning || isDictationInput(document.activeElement)) { previous = distance; return; }
      if (snapped) {
        if (Math.abs(distance) > 1) window.scrollBy({ top: distance, behavior: 'instant' });
        previous = 0;
        return;
      }
      if (blocked) {
        // Leave the docking point before allowing another approach from either side.
        if (Math.abs(distance) > 100) blocked = false;
      } else if (!snapped && ((previous > 0 && distance <= 0) || (previous < 0 && distance >= 0))) {
        snap();
      }
      previous = distance;
    };
    const start = (event: TouchEvent) => {
      if (keyboardOpenRef.current) return;
      touchY = event.touches[0]?.clientY ?? 0;
      releaseGesture = snapped;
    };
    const move = (event: TouchEvent) => {
      if (keyboardOpenRef.current) return;
      const nextY = event.touches[0]?.clientY ?? touchY;
      if (releaseGesture && Math.abs(nextY - touchY) > 12) dismiss();
      else if (snapped && !releaseGesture && event.cancelable) event.preventDefault();
    };
    const wheel = (event: WheelEvent) => {
      if (keyboardOpenRef.current) return;
      // Trackpads emit frequent sub-4px deltas. Each vertical wheel input
      // must release the dock, without waiting for a gap or blocking scroll.
      if (snapped && event.deltaY !== 0) dismiss();
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('wheel', wheel, { passive: true });
    return () => {
      enterStudyRef.current = null;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('wheel', wheel);
    };
  }, [mobile, enabled, sectionRef]);
  useLayoutEffect(() => {
    if (!videoDocked || keyboardOpenRef.current || keyboardOpen) return;
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const frameHeight = section.closest('.scene-page')?.querySelector('.scene-video-frame')?.getBoundingClientRect().height ?? 0;
    const safeTop = frameHeight + 8;
    window.scrollBy({ top: rect.top - safeTop, behavior: 'instant' });
  }, [videoDocked, keyboardOpen, sectionRef]);
  return { videoDocked, keyboardOpen: mobile && keyboardOpen, viewportTop, enterStudy };
}
