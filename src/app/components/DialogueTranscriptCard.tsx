import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { SpeechBubbleLabel } from "@/app/components/brand";
import { buildSceneSpeakers, normalizeSpeaker, SPEAKER_STYLES } from "@/data/speakerRoles";
import type { DialogueLine } from "@/data/types";

export function DialogueTranscriptCard({ lines, initialActiveIndex = 0 }: { lines: DialogueLine[]; initialActiveIndex?: number }) {
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const speakers = useMemo(() => buildSceneSpeakers(lines), [lines]);

  return (
    <div className="rounded-2xl px-4 py-5 md:px-6 md:py-6" style={{ backgroundColor: "#EFF4F1" }}>
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-black/8 pb-4">
        <div className="flex items-center rounded-full border border-border bg-white p-0.5 shadow-sm">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-background shadow-sm">双语</span>
        </div>
        <span className="text-xs text-muted-foreground">{lines.length} lines</span>
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {Array.from(speakers.values()).map(speaker => (
            <div key={speaker.key} className="flex items-center gap-1.5">
              <span
                className="whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-black"
                style={{ backgroundColor: speaker.style.bg, color: speaker.style.color, border: speaker.style.border }}
              >
                {speaker.en.toUpperCase()}
              </span>
              <span className="hidden whitespace-nowrap text-[10px] text-muted-foreground sm:inline">{speaker.zh}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        {lines.map((line, index) => {
          const speaker = speakers.get(normalizeSpeaker(line.speaker));
          const style = speaker?.style ?? SPEAKER_STYLES[0];
          const isActive = activeIndex === index;
          return (
            <button
              key={`${line.speaker}-${line.en}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-pressed={isActive}
              aria-label={`点读：${line.en}`}
              className={`dialogue-row w-full rounded-lg border-b border-black/6 px-3 py-4 text-left transition-colors last:border-0 hover:bg-white/70 ${isActive ? "bg-primary/5" : ""}`}
              style={{ borderLeft: `3px solid ${style.accent}` }}
            >
              <div className="speaker-column">
                <SpeechBubbleLabel label={(speaker?.en ?? line.speaker).toUpperCase()} style={style} />
              </div>
              <div className="dialogue-content">
                <div className="flex items-start gap-2">
                  <span
                    className={`dialogue-english min-w-0 flex-1 text-[17px] font-medium leading-[1.65] transition-colors ${isActive ? "text-primary" : "text-foreground"}`}
                    style={{ WebkitTextStroke: isActive ? "0.5px currentColor" : "0px currentColor" }}
                  >
                    {line.en}
                  </span>
                  <span aria-hidden="true" className={`dialogue-audio mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors ${isActive ? "bg-primary text-white" : "text-muted-foreground"}`}>
                    <Volume2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <span className="dialogue-chinese mt-2 block text-[15px] leading-[1.75] text-secondary-foreground">{line.zh}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
