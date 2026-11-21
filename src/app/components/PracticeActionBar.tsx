import { Pause, Play } from "lucide-react";
import { CompactPracticeActionBar } from './CompactPracticeActionBar';

const PLAYBACK_RATES = [0.8, 1, 1.2] as const;

export interface PracticeActionBarProps {
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
  hideSettings?: boolean;
  inputFocused?: boolean;
}

export function PracticeActionBar(props: PracticeActionBarProps) {
  const {
  isPlaying = false, onPrevious, previousDisabled = false, onTogglePlay, playLabel,
  onNext, nextDisabled = false, nextLabel = "下一句 →", playbackRate, onPlaybackRateChange,
  repeatLine, onRepeatLineChange, bilingualMode, onBilingualModeChange, onCheck,
  checkDisabled = false, compact = false, inputFocused = false,
  } = props;
  if (compact) return <CompactPracticeActionBar {...props} />;
  return <div className="practice-action-placeholder">
    <div className={`practice-action-bar is-inline ${compact ? "is-compact" : ""}`}
      onPointerDown={event => { if (inputFocused) event.preventDefault(); }}>
      <div className="practice-navigation">
        <button type="button" onClick={onPrevious} disabled={previousDisabled} className="practice-nav-button">← 上一句</button>
        <button type="button" onClick={onTogglePlay} aria-label={playLabel} className="practice-play-button">
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button type="button" onClick={onNext} disabled={nextDisabled} className="practice-nav-button">{nextLabel}</button>
      </div>
      <div className="practice-settings" aria-label="练习设置">
        <div className="practice-speed"><span>速度</span><div>
          {PLAYBACK_RATES.map(rate => <button type="button" key={rate} onClick={() => onPlaybackRateChange(rate)} aria-pressed={playbackRate === rate}>{rate}×</button>)}
        </div></div>
        <button type="button" onClick={() => onRepeatLineChange(!repeatLine)} aria-pressed={repeatLine}>循环 · {repeatLine ? "开" : "关"}</button>
        <div className="practice-text-mode"><span>文本</span><div>
          <button type="button" onClick={() => onBilingualModeChange(false)} aria-pressed={!bilingualMode}>英文</button>
          <button type="button" onClick={() => onBilingualModeChange(true)} aria-pressed={bilingualMode}>双语</button>
        </div></div>
      </div>
      {onCheck && <button type="button" onClick={onCheck} disabled={checkDisabled} className="practice-check">检查答案</button>}
    </div>
  </div>;
}
