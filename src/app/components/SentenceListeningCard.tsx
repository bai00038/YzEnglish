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
  playbackRate,
  onPlaybackRateChange,
  repeatLine,
  onRepeatLineChange,
  bilingualMode,
  onBilingualModeChange,
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
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  repeatLine: boolean;
  onRepeatLineChange: (value: boolean) => void;
  bilingualMode: boolean;
  onBilingualModeChange: (value: boolean) => void;
}) {
  const canGoPrevious = position > 0;
  const canGoNext = position >= 0 && position < total - 1;

  return (
    <div className="min-h-[520px] rounded-[24px] border border-border bg-white p-3 shadow-[0_14px_38px_rgba(15,53,39,0.08)] md:p-5">
      {line ? (
        <div className="grid min-h-[250px] w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-5 rounded-[20px] bg-[#F5F1E8] px-5 py-8 text-left md:grid-cols-[68px_minmax(0,1fr)] md:gap-8 md:px-10 md:py-10">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full text-[14px] font-black text-white md:h-[68px] md:w-[68px] md:text-[16px]"
            style={{ backgroundColor: isLearner ? "#0F3A2B" : "#9A7533" }}
          >
            {speakerAvatarLabel(speakerLabel)}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-black text-primary md:text-[17px]">{isLearner ? "你" : speakerZh}</span>
            <span className="mt-3 block break-words font-serif text-[25px] leading-snug text-primary md:text-[34px]">{line.en}</span>
            {bilingualMode && <span className="mt-3 block text-[15px] leading-relaxed text-muted-foreground md:text-[18px]">{line.zh}</span>}
          </span>
        </div>
      ) : (
        <div className="flex min-h-[250px] items-center justify-center rounded-[20px] bg-secondary px-6 text-center text-sm font-semibold text-muted-foreground">该场景暂未配置逐句播放时间点。</div>
      )}

      <div className="mt-4 rounded-[18px] border border-primary/10 bg-card p-3.5 md:p-4">
        <div className="flex flex-col items-center">
          <div className="flex w-full items-center justify-center gap-3 sm:gap-4 md:gap-6">
            <button type="button" onClick={onPrevious} disabled={!canGoPrevious} className="rounded-full border border-border bg-white px-3 py-2.5 text-[12px] font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 sm:px-4 md:px-5 md:py-3">← 上一句</button>
            <button type="button" onClick={onTogglePlay} disabled={!line} aria-label={isPlaying ? "暂停当前句" : "播放当前句"} className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_18px_rgba(15,53,39,0.2)] transition-transform hover:scale-105 disabled:opacity-40 md:h-16 md:w-16">
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
            <button type="button" onClick={onNext} disabled={!canGoNext} className="rounded-full border border-border bg-white px-3 py-2.5 text-[12px] font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 sm:px-4 md:px-5 md:py-3">下一句 →</button>
          </div>
          <span className="mt-2 text-[12px] font-black tabular-nums text-primary">{position + 1} / {total}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border/70 pt-4 md:gap-7">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] font-bold text-muted-foreground">速度</span>
            <div className="flex items-center gap-2">
              {PLAYBACK_RATES.map(rate => (
                <button key={rate} type="button" onClick={() => onPlaybackRateChange(rate)} aria-pressed={playbackRate === rate} className={`rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${playbackRate === rate ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>{rate}×</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => onRepeatLineChange(!repeatLine)} aria-pressed={repeatLine} className={`rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${repeatLine ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>循环 · {repeatLine ? "开" : "关"}</button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12px] font-bold text-muted-foreground">文本</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onBilingualModeChange(false)} aria-pressed={!bilingualMode} className={`rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${!bilingualMode ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>英文</button>
              <button type="button" onClick={() => onBilingualModeChange(true)} aria-pressed={bilingualMode} className={`rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${bilingualMode ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}>双语</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
