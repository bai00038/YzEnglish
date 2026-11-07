import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Pause, Play } from "lucide-react";

const PLAYBACK_RATES = [0.8, 1, 1.2] as const;

interface PracticeActionBarProps {
  position: number;
  total: number;
  isPlaying?: boolean;
  onPrevious: () => void;
  previousDisabled?: boolean;
  onTogglePlay: () => void;
  playLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  repeatLine: boolean;
  onRepeatLineChange: (value: boolean) => void;
  bilingualMode: boolean;
  onBilingualModeChange: (value: boolean) => void;
  onCheck?: () => void;
  checkDisabled?: boolean;
  compact?: boolean;
  floatOnlyWithKeyboard?: boolean;
  inheritListeningSettings?: boolean;
  inputFocused?: boolean;
  inlineOnly?: boolean;
}

export function PracticeActionBar({
  position,
  total,
  isPlaying = false,
  onPrevious,
  previousDisabled = false,
  onTogglePlay,
  playLabel,
  onNext,
  nextDisabled = false,
  nextLabel = "下一句 →",
  playbackRate,
  onPlaybackRateChange,
  repeatLine,
  onRepeatLineChange,
  bilingualMode,
  onBilingualModeChange,
  onCheck,
  checkDisabled = false,
  compact = false,
  floatOnlyWithKeyboard = false,
  inheritListeningSettings = false,
  inputFocused = false,
  inlineOnly = false,
}: PracticeActionBarProps) {
  const [sectionVisible, setSectionVisible] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const fullViewportHeightRef = useRef(0);
  const measuredKeyboardRef = useRef(false);

  useEffect(() => {
    const practiceCard = barRef.current?.closest(".sentence-listening-card, .dictation-practice-card");
    if (!practiceCard || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setSectionVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(practiceCard);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      setKeyboardVisible(inputFocused);
      return;
    }
    if (fullViewportHeightRef.current === 0) fullViewportHeightRef.current = viewport.height;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
      if (!inputFocused) {
        fullViewportHeightRef.current = Math.max(fullViewportHeightRef.current, viewport.height);
        measuredKeyboardRef.current = false;
        setKeyboardVisible(false);
        return;
      }
      const heightLoss = fullViewportHeightRef.current - viewport.height;
      if (heightLoss > 100 || offset > 80) {
        measuredKeyboardRef.current = true;
        setKeyboardVisible(true);
      } else if (measuredKeyboardRef.current) {
        setKeyboardVisible(false);
      } else {
        // WeChat's embedded browser often keeps visualViewport unchanged
        // while its keyboard is open. Focus is the only reliable signal
        // there, so keep the bar visible until a real resize or blur occurs.
        setKeyboardVisible(true);
      }
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [inputFocused]);

  useEffect(() => {
    if (!floatOnlyWithKeyboard) return;
    document.body.classList.toggle("dictation-keyboard-open", keyboardVisible);
    return () => document.body.classList.remove("dictation-keyboard-open");
  }, [floatOnlyWithKeyboard, keyboardVisible]);

  const keepInputFocused = (event: PointerEvent<HTMLDivElement>) => event.preventDefault();
  const floatingStyle = {
    "--practice-bottom": keyboardVisible
      ? "6px"
      : keyboardOffset > 40
      ? `${keyboardOffset + 6}px`
      : "calc(var(--mobile-nav-height) + env(safe-area-inset-bottom) + 6px)",
  } as CSSProperties;

  return (
    <div className="practice-action-placeholder">
      <div
        ref={barRef}
        className={`practice-action-bar border border-primary/10 bg-card ${inheritListeningSettings ? "is-inherited-settings" : ""} ${compact ? "is-compact mt-3 rounded-[16px] p-3" : "mt-4 rounded-[18px] p-3.5 md:p-4"} ${!inlineOnly && !compact && (floatOnlyWithKeyboard ? keyboardVisible : sectionVisible) ? "is-section-visible" : ""}`}
        style={floatingStyle}
        onPointerDown={keepInputFocused}
      >
        <div className="practice-main-controls flex flex-col items-center">
          <span className="practice-mobile-count mb-2 hidden text-[12px] font-black tabular-nums text-primary">
            第 {position + 1} 句 / 共 {total} 句
          </span>
          <div className={`practice-navigation flex w-full items-center justify-center ${compact ? "gap-3" : "gap-3 sm:gap-4 md:gap-6"}`}>
            <button type="button" onClick={onPrevious} disabled={previousDisabled} className={`practice-nav-button rounded-full border border-border bg-white font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 ${compact ? "px-3 py-2 text-[11px]" : "px-3 py-2.5 text-[12px] sm:px-4 md:px-5 md:py-3"}`}>← 上一句</button>
            <button type="button" onClick={onTogglePlay} aria-label={playLabel} className={`practice-play-button inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_18px_rgba(15,53,39,0.2)] transition-transform hover:scale-105 ${compact ? "h-12 w-12" : "h-14 w-14 md:h-16 md:w-16"}`}>
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
            <button type="button" onClick={onNext} disabled={nextDisabled} className={`practice-nav-button rounded-full border border-border bg-white font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 ${compact ? "px-3 py-2 text-[11px]" : "px-3 py-2.5 text-[12px] sm:px-4 md:px-5 md:py-3"}`}>{nextLabel}</button>
          </div>
          <span className={`practice-desktop-count font-black tabular-nums text-primary ${compact ? "mt-1.5 text-[11px]" : "mt-2 text-[12px]"}`}>{position + 1} / {total}</span>
        </div>

        <div className={`practice-settings ${onCheck ? "has-check" : ""} flex flex-wrap items-center justify-center border-t border-border/70 ${compact ? "mt-3 gap-3 pt-3" : "mt-4 gap-4 pt-4 md:gap-7"}`}>
          {!inheritListeningSettings && <div className="practice-speed flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] font-bold text-muted-foreground">速度</span>
            <div className="flex items-center gap-2">
              {PLAYBACK_RATES.map(rate => (
                <button key={rate} type="button" onClick={() => onPlaybackRateChange(rate)} aria-pressed={playbackRate === rate} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
                  <span className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${playbackRate === rate ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>{rate}×</span>
                </button>
              ))}
            </div>
          </div>}
          {!inheritListeningSettings && <button type="button" onClick={() => onRepeatLineChange(!repeatLine)} aria-pressed={repeatLine} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
            <span className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${repeatLine ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>循环 · {repeatLine ? "开" : "关"}</span>
          </button>}
          {!inheritListeningSettings && <div className="practice-text-mode flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] font-bold text-muted-foreground">文本</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onBilingualModeChange(false)} aria-pressed={!bilingualMode} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
                <span className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${!bilingualMode ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>英文</span>
              </button>
              <button type="button" onClick={() => onBilingualModeChange(true)} aria-pressed={bilingualMode} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary">
                <span className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${bilingualMode ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>双语</span>
              </button>
            </div>
          </div>}
          {onCheck && (
            <button type="button" onClick={onCheck} disabled={checkDisabled} className="practice-check rounded-full bg-primary px-5 py-2.5 text-[12px] font-black text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/10 disabled:text-muted-foreground/60">
              检查答案
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
