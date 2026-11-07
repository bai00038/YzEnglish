import { speakerAvatarLabel } from "@/data/speakerRoles";
import type { DialogueLine } from "@/data/types";
import { PracticeActionBar } from "@/app/components/PracticeActionBar";

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
    <div className={`${compact ? "rounded-[20px] p-3" : "sentence-listening-card min-h-[520px] rounded-[24px] p-3 max-[480px]:min-h-0 md:p-5"} border border-border bg-white shadow-[0_14px_38px_rgba(15,53,39,0.08)]`}>
      {line ? (
        <div className={`grid w-full items-center bg-[#F5F1E8] text-left ${compact ? "min-h-[180px] grid-cols-[48px_minmax(0,1fr)] gap-4 rounded-[17px] px-5 py-5" : "sentence-listening-line min-h-[250px] grid-cols-[56px_minmax(0,1fr)] gap-5 rounded-[20px] px-5 py-8 max-[480px]:min-h-0 max-[480px]:grid-cols-[48px_minmax(0,1fr)] max-[480px]:gap-4 max-[480px]:px-4 max-[480px]:py-4 md:grid-cols-[68px_minmax(0,1fr)] md:gap-8 md:px-10 md:py-10"}`}>
          <span
            className={`sentence-speaker-avatar flex items-center justify-center rounded-full font-black text-white ${compact ? "h-12 w-12 text-[13px]" : "h-14 w-14 text-[14px] md:h-[68px] md:w-[68px] md:text-[16px]"}`}
            style={{ backgroundColor: isLearner ? "#0F3A2B" : "#9A7533" }}
          >
            {speakerAvatarLabel(speakerLabel)}
          </span>
          <span className="sentence-copy min-w-0">
            <span className={`sentence-role block font-black text-primary ${compact ? "text-[13px]" : "text-[15px] md:text-[17px]"}`}>{isLearner ? "你" : speakerZh}</span>
            <span className={`sentence-en block break-words font-serif leading-snug text-primary ${compact ? "mt-2 text-[22px] md:text-[25px]" : "mt-3 text-[25px] max-[480px]:text-[28px] md:text-[34px]"}`}>{line.en}</span>
            {bilingualMode && <span className={`sentence-zh block leading-relaxed text-muted-foreground ${compact ? "mt-2 text-[13px] md:text-[14px]" : "mt-3 text-[15px] md:text-[18px]"}`}>{line.zh}</span>}
          </span>
        </div>
      ) : (
        <div className={`flex items-center justify-center rounded-[20px] bg-secondary px-6 text-center text-sm font-semibold text-muted-foreground ${compact ? "min-h-[180px]" : "min-h-[250px] max-[480px]:min-h-0 max-[480px]:py-6"}`}>该场景暂未配置逐句播放时间点。</div>
      )}

      <PracticeActionBar
        position={position}
        total={total}
        isPlaying={isPlaying}
        onPrevious={onPrevious}
        previousDisabled={!canGoPrevious}
        onTogglePlay={onTogglePlay}
        playLabel={isPlaying ? "暂停当前句" : "播放当前句"}
        onNext={isLastLine ? onReplay : onNext}
        nextDisabled={isLastLine ? !line : !canGoNext}
        nextLabel={isLastLine ? "再听一遍" : "下一句 →"}
        playbackRate={playbackRate}
        onPlaybackRateChange={onPlaybackRateChange}
        repeatLine={repeatLine}
        onRepeatLineChange={onRepeatLineChange}
        bilingualMode={bilingualMode}
        onBilingualModeChange={onBilingualModeChange}
        compact={compact}
      />
    </div>
  );
}
