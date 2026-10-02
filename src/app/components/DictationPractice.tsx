import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { diffDictationWords, isDictationExactMatch, type DictationToken } from "@/data/dictation";
import { SpeechBubbleLabel } from "@/app/components/brand";
import type { SpeakerStyle } from "@/data/speakerRoles";

// One valid, playable dialogue line, pre-filtered by the parent
// (SceneDetailPage) to lines that both have an exact start/end range AND
// non-empty English text — see dictationLines there. `index` is the
// line's position in content.dialogue, the stable key this component
// uses for both localStorage records and telling the parent which line's
// exact range to play (via onPlayLine) — never re-derived here.
export interface DictationLineInput {
  index: number;
  en: string;
  zh: string;
  speakerLabel: string;
  speakerStyle: SpeakerStyle;
}

interface DictationRecord {
  input: string;
  checked: boolean;
  correct: boolean;
}

type DictationRecords = Record<number, DictationRecord>;

interface StoredDictationState {
  position: number;
  records: DictationRecords;
}

// Namespaced per scene so switching scenes (or having two scenes open in
// different tabs) can never read/overwrite another scene's practice
// state — see dictation spec §9.
function storageKey(sceneId: number): string {
  return `yzenglish:dictation:${sceneId}`;
}

function loadStoredState(sceneId: number): StoredDictationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(sceneId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof (parsed as StoredDictationState).position === "number" &&
      typeof (parsed as StoredDictationState).records === "object" &&
      (parsed as StoredDictationState).records !== null
    ) {
      return parsed as StoredDictationState;
    }
  } catch {
    // Malformed JSON or storage unavailable (e.g. private browsing) —
    // practice just starts fresh for this session.
  }
  return null;
}

interface DictationPracticeProps {
  sceneId: number;
  lines: DictationLineInput[];
  /** Plays exactly this line's start->end range via the parent's existing single-line player — see playDialogueLine in SceneDetailPage. Never a second/competing playback path. */
  onPlayLine: (lineIndex: number) => void;
  /** Pauses the shared <video> element — called before any navigation so a line change never leaves stray audio running. */
  onStopPlayback: () => void;
}

export function DictationPractice({ sceneId, lines, onPlayLine, onStopPlayback }: DictationPracticeProps) {
  const [position, setPosition] = useState(0);
  const [records, setRecords] = useState<DictationRecords>({});
  const [draft, setDraft] = useState("");
  const [showZh, setShowZh] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Guards the persist effect below from firing on the very same render
  // that just restored (or reset) state from storage — without it, a
  // scene with no saved practice yet would immediately write back an
  // empty {position:0, records:{}}, which is harmless but pointless, and
  // a scene *with* saved state would risk a race between "just loaded"
  // and "about to save" on the same tick.
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    hasRestoredRef.current = false;
    const stored = loadStoredState(sceneId);
    if (stored) {
      setPosition(Math.min(Math.max(0, stored.position), lines.length));
      setRecords(stored.records);
    } else {
      setPosition(0);
      setRecords({});
    }
    hasRestoredRef.current = true;
  // Deliberately scoped to sceneId only — `lines` changes reference each
  // render (see dictationLines in SceneDetailPage) but its CONTENT for a
  // given scene is stable, so re-running this on every lines change would
  // wipe in-progress practice state for no reason.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(sceneId), JSON.stringify({ position, records }));
    } catch {
      // Storage unavailable — practice still works for this session, it
      // just won't survive a reload.
    }
  }, [sceneId, position, records]);

  const currentLine = position < lines.length ? lines[position] : null;
  const currentRecord = currentLine ? records[currentLine.index] : undefined;
  const isComplete = lines.length > 0 && position >= lines.length;
  const checked = currentRecord?.checked ?? false;

  // Draft is separate from `records` so every keystroke doesn't write to
  // (and localStorage-persist) the records map — only Check does that.
  // Re-syncs from the saved record whenever the current line changes,
  // which is what makes "上一句" show that line's earlier input/result
  // again (dictation spec §7) with no extra bookkeeping.
  useEffect(() => {
    setDraft(currentRecord?.input ?? "");
    setShowZh(false);
    if (!currentRecord?.checked) textareaRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, currentLine?.index]);

  const diff = useMemo(() => {
    if (!currentLine || !checked || !currentRecord) return null;
    return diffDictationWords(currentLine.en, currentRecord.input);
  }, [currentLine, checked, currentRecord]);

  const checkedCount = useMemo(() => Object.values(records).filter(r => r.checked).length, [records]);
  const correctCount = useMemo(() => Object.values(records).filter(r => r.checked && r.correct).length, [records]);
  const accuracy = checkedCount > 0 ? Math.round((correctCount / checkedCount) * 100) : 0;

  function handleCheck() {
    if (!currentLine || checked || draft.trim().length === 0) return;
    const correct = isDictationExactMatch(currentLine.en, draft);
    setRecords(prev => ({ ...prev, [currentLine.index]: { input: draft, checked: true, correct } }));
  }

  function goTo(nextPosition: number) {
    onStopPlayback();
    setPosition(Math.max(0, nextPosition));
  }

  function handleRestart() {
    onStopPlayback();
    setRecords({});
    setPosition(0);
    try {
      window.localStorage.removeItem(storageKey(sceneId));
    } catch {
      // ignore
    }
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="text-sm font-semibold text-foreground">No timed sentences available for dictation yet.</p>
        <p className="text-xs text-muted-foreground mt-1">该场景暂无可用于听写的精确时间码句子。</p>
      </div>
    );
  }

  if (isComplete) {
    const needsReview = checkedCount - correctCount;
    return (
      <div className="rounded-2xl px-6 py-14 text-center" style={{ backgroundColor: "#EFF4F1" }}>
        <p className="text-xl font-black text-primary">Practice complete · 完成练习</p>
        <p className="text-sm text-muted-foreground mt-3">{checkedCount} / {lines.length} sentences checked · 已完成句数</p>
        {checkedCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">Accuracy · 正确率 {accuracy}%</p>
        )}
        <div className="flex items-center justify-center gap-8 mt-6">
          <div>
            <p className="text-2xl font-black text-primary">{correctCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">完全正确</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: "#b91c1c" }}>{needsReview}</p>
            <p className="text-xs text-muted-foreground mt-0.5">需要复习</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="mt-7 text-sm font-bold rounded-full px-5 py-2.5 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F3527", color: "#F4EFE6" }}
        >
          重新练习 · Restart
        </button>
      </div>
    );
  }

  if (!currentLine) return null;

  return (
    <div className="rounded-2xl px-4 py-6 md:px-6 md:py-7" style={{ backgroundColor: "#EFF4F1" }}>
      {/* Progress + speaker — never the line's English/Chinese text itself */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-5 border-b border-black/8">
        <span className="text-xs font-bold text-muted-foreground tabular-nums">{position + 1} / {lines.length}</span>
        <SpeechBubbleLabel label={currentLine.speakerLabel} style={currentLine.speakerStyle} />
      </div>

      <button
        type="button"
        onClick={() => onPlayLine(currentLine.index)}
        className="flex items-center gap-2 text-sm font-bold rounded-full px-4 py-2.5 mb-5 transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0F3527", color: "#F4EFE6" }}
      >
        <Play size={13} className="fill-current" />
        播放本句 · Play sentence
      </button>

      <label htmlFor="dictation-input" className="block text-xs font-bold text-muted-foreground mb-1.5">
        Type what you hear · 输入你听到的内容
      </label>
      <textarea
        id="dictation-input"
        ref={textareaRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleCheck();
          }
        }}
        disabled={checked}
        rows={2}
        placeholder="Listen, then type the sentence here…"
        className="w-full max-w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:text-muted-foreground"
      />

      <div className="flex flex-wrap items-center gap-2.5 mt-3">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={draft.trim().length === 0}
            className="text-sm font-bold rounded-full px-4 py-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#C8F169", color: "#12241C" }}
          >
            检查 · Check
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPlayLine(currentLine.index)}
            className="text-sm font-bold rounded-full px-4 py-2 border transition-colors hover:bg-white"
            style={{ borderColor: "rgba(15,53,39,0.3)", color: "#0F3527" }}
          >
            再听一次 · Listen again
          </button>
        )}

        <button
          type="button"
          onClick={() => goTo(position - 1)}
          disabled={position === 0}
          className="text-sm font-bold rounded-full px-4 py-2 border border-border text-foreground transition-colors hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          上一句 · Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(position + 1)}
          className="text-sm font-bold rounded-full px-4 py-2 border border-border text-foreground transition-colors hover:bg-white"
        >
          下一句 · Next
        </button>
      </div>

      {checked && diff && (
        <div className="mt-6 pt-5 border-t border-black/8 space-y-4">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1.5">Your answer · 你的答案</p>
            <p className="text-base leading-[1.9]">
              {diff.userTokens.length === 0 ? (
                <span className="text-muted-foreground italic text-sm">(empty · 未作答)</span>
              ) : (
                diff.userTokens.map((token, i) => <WordToken key={i} token={token} />)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1.5">Correct answer · 正确答案</p>
            <p className="text-base leading-[1.9]">
              {diff.correctTokens.map((token, i) => <WordToken key={i} token={token} />)}
            </p>
          </div>
          {currentLine.zh && (
            <div>
              <button
                type="button"
                onClick={() => setShowZh(v => !v)}
                className="text-xs font-bold text-primary hover:opacity-70 transition-opacity"
              >
                {showZh ? "隐藏中文 · Hide Chinese" : "查看中文 · Show Chinese"}
              </button>
              {showZh && <p className="text-sm text-muted-foreground mt-1.5">{currentLine.zh}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Color alone never carries the correct/incorrect distinction — a ✓/symbol
// suffix and (for anything not correct) an underline both hold regardless
// of color vision, per dictation spec §10. "incorrect" covers both a
// wrong word AND a genuinely extra one the user typed (diffDictationWords
// doesn't distinguish the two — both are "in the user's answer, not
// matched to the correct sentence").
function WordToken({ token }: { token: DictationToken }) {
  const isCorrect = token.status === "correct";
  const symbol = isCorrect ? "✓" : token.status === "missing" ? "+" : "✕";
  const statusLabel = token.status === "correct" ? "correct" : token.status === "missing" ? "missing" : "incorrect";
  return (
    <span
      className={`inline-block mr-2 ${isCorrect ? "" : "underline decoration-2"}`}
      style={{ color: isCorrect ? "#166534" : "#b91c1c" }}
      aria-label={`${token.text} — ${statusLabel}`}
    >
      {token.text}
      <span aria-hidden="true" className="text-[10px] align-super ml-0.5">{symbol}</span>
    </span>
  );
}
