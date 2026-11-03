import { Pause, Play } from "lucide-react";
import { speakerAvatarLabel } from "@/data/speakerRoles";
import type { DialogueLine } from "@/data/types";

const PLAYBACK_RATES = [0.8, 1, 1.2] as const;

export function SentenceListeningCard({
  line,
  speakerLabel,
  speakerZh,
  isLearner,
  position,
  total,
  isPlaying,
  onTogglePlay,
  onPrevious,
  onNext,
  onReplay,
  playbackRate,
  onPlaybackRateChange,
  repeatLine,
  onRepeatLineChange,
  bilingualMode,
  onBilingualModeChange,
  compact = false,
}: {
  line: DialogueLine | null;
  speakerLabel: string;
  speakerZh: string;
  isLearner: boolean;
  position: number;
  total: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReplay: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  repeatLine: boolean;
  onRepeatLineChange: (value: boolean) => void;
  bilingualMode: boolean;
  onBilingualModeChange: (value: boolean) => void;
  compact?: boolean;
}) {
  const canGoPrevious = position > 0;
  const canGoNext = position >= 0 && position < total - 1;
  const isLastLine = total > 0 && position === total - 1;

  return (
    <div className={`${compact ? "rounded-[20px] p-3" : "min-h-[520px] rounded-[24px] p-3 md:p-5"} border border-border bg-white shadow-[0_14px_38px_rgba(15,53,39,0.08)]`}>
      {line ? (
        <div className={`grid w-full items-center bg-[#F5F1E8] text-left ${compact ? "min-h-[180px] grid-cols-[48px_minmax(0,1fr)] gap-4 rounded-[17px] px-5 py-5" : "min-h-[250px] grid-cols-[56px_minmax(0,1fr)] gap-5 rounded-[20px] px-5 py-8 md:grid-cols-[68px_minmax(0,1fr)] md:gap-8 md:px-10 md:py-10"}`}>
          <span
            className={`flex items-center justify-center rounded-full font-black text-white ${compact ? "h-12 w-12 text-[13px]" : "h-14 w-14 text-[14px] md:h-[68px] md:w-[68px] md:text-[16px]"}`}
            style={{ backgroundColor: isLearner ? "#0F3A2B" : "#9A7533" }}
          >
            {speakerAvatarLabel(speakerLabel)}
          </span>
          <span className="min-w-0">
            <span className={`block font-black text-primary ${compact ? "text-[13px]" : "text-[15px] md:text-[17px]"}`}>{isLearner ? "你" : speakerZh}</span>
            <span className={`block break-words font-serif leading-snug text-primary ${compact ? "mt-2 text-[22px] md:text-[25px]" : "mt-3 text-[25px] md:text-[34px]"}`}>{line.en}</span>
            {bilingualMode && <span className={`block leading-relaxed text-muted-foreground ${compact ? "mt-2 text-[13px] md:text-[14px]" : "mt-3 text-[15px] md:text-[18px]"}`}>{line.zh}</span>}
          </span>
        </div>
      ) : (
        <div className={`flex items-center justify-center rounded-[20px] bg-secondary px-6 text-center text-sm font-semibold text-muted-foreground ${compact ? "min-h-[180px]" : "min-h-[250px]"}`}>该场景暂未配置逐句播放时间点。</div>
      )}

      <div className={`${compact ? "mt-3 rounded-[16px] p-3" : "mt-4 rounded-[18px] p-3.5 md:p-4"} border border-primary/10 bg-card`}>
        <div className="flex flex-col items-center">
          <div className={`flex w-full items-center justify-center ${compact ? "gap-3" : "gap-3 sm:gap-4 md:gap-6"}`}>
            <button type="button" onClick={onPrevious} disabled={!canGoPrevious} className={`${compact ? "px-3 py-2 text-[11px]" : "px-3 py-2.5 text-[12px] sm:px-4 md:px-5 md:py-3"} rounded-full border border-border bg-white font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35`}>← 上一句</button>
            <button type="button" onClick={onTogglePlay} disabled={!line} aria-label={isPlaying ? "暂停当前句" : "播放当前句"} className={`${compact ? "h-12 w-12" : "h-14 w-14 md:h-16 md:w-16"} inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_18px_rgba(15,53,39,0.2)] transition-transform hover:scale-105 disabled:opacity-40`}>
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
            <button
              type="button"
              onClick={isLastLine ? onReplay : onNext}
              disabled={isLastLine ? !line : !canGoNext}
              className={`${compact ? "px-3 py-2 text-[11px]" : "px-3 py-2.5 text-[12px] sm:px-4 md:px-5 md:py-3"} rounded-full border border-border bg-white font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35`}
            >
              {isLastLine ? "再听一遍" : "下一句 →"}
            </button>
          </div>
          <span className={`${compact ? "mt-1.5 text-[11px]" : "mt-2 text-[12px]"} font-black tabular-nums text-primary`}>{position + 1} / {total}</span>
        </div>

        <div className={`${compact ? "mt-3 gap-3 pt-3" : "mt-4 gap-4 pt-4 md:gap-7"} flex flex-wrap items-center justify-center border-t border-border/70`}>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`${compact ? "text-[11px]" : "text-[12px]"} font-bold text-muted-foreground`}>速度</span>
            <div className="flex items-center gap-2">
              {PLAYBACK_RATES.map(rate => (
                <button key={rate} type="button" onClick={() => onPlaybackRateChange(rate)} aria-pressed={playbackRate === rate} className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${playbackRate === rate ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>{rate}×</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => onRepeatLineChange(!repeatLine)} aria-pressed={repeatLine} className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${repeatLine ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>循环 · {repeatLine ? "开" : "关"}</button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`${compact ? "text-[11px]" : "text-[12px]"} font-bold text-muted-foreground`}>文本</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onBilingualModeChange(false)} aria-pressed={!bilingualMode} className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${!bilingualMode ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>英文</button>
              <button type="button" onClick={() => onBilingualModeChange(true)} aria-pressed={bilingualMode} className={`rounded-full border font-black transition-colors ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-[12px]"} ${bilingualMode ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>双语</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
