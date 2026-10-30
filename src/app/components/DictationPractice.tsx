import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { diffDictationWords, isDictationExactMatch, type DictationToken } from "@/data/dictation";
import { speakerAvatarLabel, type SpeakerStyle } from "@/data/speakerRoles";

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
const DICTATION_SHOW_ZH_STORAGE_KEY = "yzenglish:dictation:showZh";

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
  const [showZh, setShowZh] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DICTATION_SHOW_ZH_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
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

  // Chinese hints are a learner preference, not per-sentence state. Once
  // the learner turns them on or off, keep that choice across sentence
  // navigation, scene switches, tab switches, and page reloads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DICTATION_SHOW_ZH_STORAGE_KEY, String(showZh));
    } catch {
      // Storage unavailable — the preference still persists for this render session.
    }
  }, [showZh]);

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
    <div className="min-h-[520px] rounded-[24px] border border-border bg-white p-3 shadow-[0_14px_38px_rgba(15,53,39,0.08)] md:p-5">
      {/* Match the listening card's speaker-led upper panel without revealing the answer. */}
      <div className="grid min-h-[250px] w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-5 rounded-[20px] bg-[#F5F1E8] px-5 py-8 text-left md:grid-cols-[68px_minmax(0,1fr)] md:gap-8 md:px-10 md:py-10">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-[14px] font-black text-white md:h-[68px] md:w-[68px] md:text-[16px]"
          style={{ backgroundColor: currentLine.speakerStyle.color }}
        >
          {speakerAvatarLabel(currentLine.speakerLabel)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="block text-[15px] font-black text-primary md:text-[17px]">
              {currentLine.speakerLabel}
            </span>
            <button
              type="button"
              onClick={() => setShowZh(value => !value)}
              aria-pressed={showZh}
              className={`rounded-full border px-4 py-2 text-[12px] font-black transition-colors ${showZh ? "border-accent bg-accent text-primary" : "border-border bg-white text-primary"}`}
            >
              中文提示 · {showZh ? "开" : "关"}
            </button>
          </div>
          <label htmlFor="dictation-input" className="sr-only">输入你听到的英文句子</label>
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
            placeholder="输入你听到的英文句子…"
            className="mt-3 w-full max-w-full resize-none rounded-[16px] border border-primary/10 bg-[#FAF8F2] px-4 py-3 font-serif text-[20px] leading-relaxed text-primary focus:border-primary/20 focus:outline-none focus:ring-1 focus:ring-primary/10 disabled:bg-[#F7F3EA] disabled:text-muted-foreground md:text-[24px]"
          />
          {checked && diff ? (
            <div className="mt-4 grid gap-4 rounded-[16px] border border-primary/10 bg-white/70 p-4 md:grid-cols-2 md:gap-6">
              <div>
                <p className="mb-1.5 text-[12px] font-bold text-muted-foreground">你的答案</p>
                <p className="text-[15px] leading-[1.8] md:text-[16px]">
                  {diff.userTokens.length === 0 ? (
                    <span className="text-sm italic text-muted-foreground">未作答</span>
                  ) : (
                    diff.userTokens.map((token, i) => <WordToken key={i} token={token} />)
                  )}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-bold text-muted-foreground">正确答案</p>
                <p className="text-[15px] leading-[1.8] md:text-[16px]">
                  {diff.correctTokens.map((token, i) => <WordToken key={i} token={token} />)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 min-h-6 text-[14px] leading-relaxed text-muted-foreground md:text-[16px]">
              {showZh
                ? <span>中文提示：{currentLine.zh || "暂无中文提示"}</span>
                : <span className="text-muted-foreground/70">需要时可打开中文提示</span>}
            </div>
          )}
          {checked && showZh && (
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground md:text-[16px]">
              中文提示：{currentLine.zh || "暂无中文提示"}
            </p>
          )}
          {!checked && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleCheck}
                disabled={draft.trim().length === 0}
                className="rounded-full border border-accent bg-accent px-5 py-2.5 text-[12px] font-black text-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                检查答案
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-primary/10 bg-card px-3.5 py-4 md:px-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <button
              type="button"
              onClick={() => goTo(position - 1)}
              disabled={position === 0}
              className="w-[104px] rounded-full border border-border bg-white px-3 py-2.5 text-[12px] font-black text-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 md:w-[116px] md:py-3"
            >
              ← 上一句
            </button>
            <button
              type="button"
              onClick={() => onPlayLine(currentLine.index)}
              aria-label="播放当前听写句"
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_18px_rgba(15,53,39,0.2)] transition-transform hover:scale-105 md:h-16 md:w-16"
            >
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => goTo(position + 1)}
              className="w-[104px] rounded-full border border-border bg-white px-3 py-2.5 text-[12px] font-black text-primary transition-colors hover:bg-secondary md:w-[116px] md:py-3"
            >
              下一句 →
            </button>
          </div>
          <span className="mt-2 text-[12px] font-black tabular-nums text-primary">
            {position + 1} / {lines.length}
          </span>
        </div>
      </div>

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
