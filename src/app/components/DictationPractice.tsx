import { addMistake } from "@/data/member-learning";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { loadKitCatalogue, type KitEntry } from '@/data/kit';
import { chooseDictationBlank, isBlankAnswerCorrect } from '@/data/dictation-blank';
import { speakerAvatarLabel } from '@/data/speakerRoles';
import { PracticeActionBar } from './PracticeActionBar';
import type { DictationLineInput as LegacyLine } from './FullSentenceDictationPractice';

export interface DictationLineInput extends LegacyLine { anchorStart?: number }
interface DictationRecord { input: string; checked: boolean; correct: boolean }
type Records = Record<number, DictationRecord>;
interface Props {
  sceneId: number;
  externalSceneId: string;
  lines: DictationLineInput[];
  onPlayLine: (index: number, once?: boolean) => void;
  onCurrentLineChange?: (index: number | null) => void;
  onStopPlayback: () => void;
  onComplete: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  repeatLine: boolean;
  onRepeatLineChange: (value: boolean) => void;
  bilingualMode: boolean;
  onBilingualModeChange: (value: boolean) => void;
  isPlaying: boolean;
}
const key = (id: number) => `yzenglish:dictation:${id}`;
const hintKey = 'yzenglish:dictation:showZh';
function restore(id: number): Records {
  try {
    const saved = JSON.parse(localStorage.getItem(key(id)) ?? 'null');
    if (!saved || typeof saved.records !== 'object' || !saved.records) return {};
    return Object.fromEntries(Object.entries(saved.records).filter(([, value]) => {
      const record = value as DictationRecord;
      return record && typeof record.input === 'string' && typeof record.checked === 'boolean' && typeof record.correct === 'boolean';
    })) as Records;
  } catch { return {}; }
}

export function DictationPractice(props: Props) {
  const { sceneId, externalSceneId, lines, onPlayLine, onCurrentLineChange, onStopPlayback, onComplete, isPlaying } = props;
  const [position, setPosition] = useState(0);
  const [records, setRecords] = useState<Records>(() => restore(sceneId));
  const [draft, setDraft] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [entries, setEntries] = useState<KitEntry[]>([]);
  const [showZh, setShowZh] = useState(() => {
    try { return localStorage.getItem(hintKey) === 'true'; } catch { return false; }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadedScene, setLoadedScene] = useState(sceneId);
  useEffect(() => {
    let live = true;
    void loadKitCatalogue().then(data => { if (live) setEntries([...data.chunks, ...data.words]); }).catch(() => { /* Fallback blanks work immediately, even offline. */ });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (loadedScene === sceneId) return;
    setLoadedScene(sceneId);
    setRecords(restore(sceneId)); setPosition(0); setDraft('');
  }, [sceneId]);
  useEffect(() => {
    if (loadedScene !== sceneId) return;
    try { localStorage.setItem(key(sceneId), JSON.stringify({ position, records })); } catch { /* Unavailable storage does not block practice. */ }
  }, [sceneId, loadedScene, position, records]);
  useEffect(() => { try { localStorage.setItem(hintKey, String(showZh)); } catch { /* Optional preference. */ } }, [showZh]);

  const line = lines[position];
  const blanks = useMemo(() => lines.map(item => chooseDictationBlank(item.en, externalSceneId, item.anchorStart, entries)), [lines, externalSceneId, entries]);
  // Once an answer is started, retain that blank if the runtime catalogue arrives late.
  const startedBlanks = useRef(new Map<string, typeof blanks[number]>());
  const blankKey = `${sceneId}:${line?.index}`;
  const blank = startedBlanks.current.get(blankKey) ?? blanks[position];
  const record = line ? records[line.index] : undefined;
  const checked = record?.checked ?? false;
  const checkedCount = lines.filter(item => records[item.index]?.checked).length;
  const correctCount = lines.filter(item => records[item.index]?.checked && records[item.index]?.correct).length;
  useEffect(() => { onCurrentLineChange?.(line?.index ?? null); }, [line?.index, onCurrentLineChange]);
  useEffect(() => { setDraft(record?.input ?? ''); }, [sceneId, position, line?.index]);

  function submit(reveal = false) {
    if (!line || !blank || checked || (!reveal && !draft.trim())) return;
    startedBlanks.current.set(blankKey, blank);
    const correct = !reveal && isBlankAnswerCorrect(blank.answer, draft);
    setRecords(previous => ({ ...previous, [line.index]: { input: draft, checked: true, correct } }));
    if (!correct && !reveal) {
      if (blank.entryId) addMistake(blank.entryId, 'dictation', externalSceneId);
      onPlayLine(line.index, true);
    }
  }
  function goTo(next: number) {
    const keepKeyboard = document.activeElement === inputRef.current;
    const bounded = Math.max(0, Math.min(lines.length, next));
    setPosition(bounded);
    const nextLine = lines[bounded];
    if (nextLine) {
      onPlayLine(nextLine.index);
      if (keepKeyboard) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    } else {
      onStopPlayback();
      if (checkedCount === lines.length) onComplete();
    }
  }
  function retry() {
    if (!line) return;
    onStopPlayback();
    setRecords(previous => { const next = { ...previous }; delete next[line.index]; return next; });
    setDraft('');
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }
  function restart() {
    onStopPlayback(); setRecords({}); setPosition(0); setDraft(''); startedBlanks.current.clear();
  }
  if (!lines.length) return <div className="rounded-2xl bg-white p-6 text-muted-foreground">该场景暂无可用于听写的精确时间码句子。</div>;
  if (!line) return <div className="rounded-2xl bg-white px-6 py-10 text-center">
    <p className="text-xl font-bold text-primary">完成练习</p>
    <p className="mt-3 text-muted-foreground">已完成 {checkedCount} / {lines.length} 句 · 正确率 {checkedCount ? Math.round(correctCount / checkedCount * 100) : 0}%</p>
    <button type="button" onClick={restart} className="mt-5 rounded-full bg-primary px-5 py-3 text-white">重新练习</button>
  </div>;

  return <div className="dictation-practice-card blank-dictation rounded-[24px] bg-white p-3 md:p-5">
    <p className="practice-position">第 {position + 1} 句 / 共 {lines.length} 句</p>
    <div className="dictation-input-card grid w-full items-center rounded-[20px] bg-[#F5F1E8] text-left">
      <span className="dictation-avatar flex items-center justify-center rounded-full font-black text-white" style={{ backgroundColor: line.speakerStyle.color }}>{speakerAvatarLabel(line.speakerLabel)}</span>
      <div className="dictation-copy min-w-0">
        <div className="dictation-role-row flex flex-wrap items-center justify-between gap-2">
          <span className="text-[15px] font-black text-primary">{line.speakerLabel}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={restart} disabled={!checkedCount && !draft && position === 0} className="blank-hint-toggle disabled:opacity-35" title="清空本场景听写记录，从第一句重新练习">重新练习</button>
            <button type="button" onClick={() => setShowZh(value => !value)} aria-pressed={showZh} className="blank-hint-toggle">中文提示 · {showZh ? '开' : '关'}</button>
          </div>
        </div>
        <div className="dictation-blank-sentence">
          {line.en.slice(0, blank.start)}<span className="dictation-blank-control">
            <input ref={inputRef} key={`${sceneId}:${line.index}`} type="text" value={checked ? (record?.input ?? '') : draft}
              onPointerDown={event => {
                if (!checked && document.activeElement !== event.currentTarget && window.matchMedia('(max-width: 768px)').matches) {
                  event.preventDefault();
                  event.currentTarget.focus({ preventScroll: true });
                }
              }}
              onChange={event => { startedBlanks.current.set(blankKey, blank); setDraft(event.target.value); }}
              onFocus={() => { startedBlanks.current.set(blankKey, blank); setInputFocused(true); }} onBlur={() => setInputFocused(false)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }}
              readOnly={checked} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done"
              aria-label="填写空缺，按回车检查答案" aria-invalid={checked && !record?.correct}
              className={`dictation-blank ${checked ? record?.correct ? 'is-correct' : 'is-incorrect' : ''}`}
              style={{ width: `${Math.max(4, Math.min(24, Math.max(blank.answer.length, draft.length) + 1))}ch` }} />
            {checked && <span aria-label={record?.correct ? '回答正确' : '正确答案见下方'} className={record?.correct ? 'blank-correct-mark' : 'blank-incorrect-mark'}>{record?.correct ? <Check size={16} /> : '✕'}</span>}
          </span>{line.en.slice(blank.end)}
        </div>
        {blank.source && <p className="dictation-blank-source">锦囊库 · {blank.source === 'chunk' ? '词伙' : '词汇'}</p>}
        {showZh && <p className="dictation-hint-row mt-2 text-muted-foreground">{line.zh || '暂无中文提示'}</p>}
        <div className="blank-feedback-row" aria-live="polite">
          {checked ? <><span className="blank-correct-mark">{record?.correct ? '回答正确' : `正确答案：${blank.answer}`}</span><button type="button" onClick={retry}><RotateCcw size={13} />重做本句</button></> : <><span>听整句，只填空缺</span><button type="button" onPointerDown={event => event.preventDefault()} onClick={() => submit(true)}>看答案</button></>}
        </div>
      </div>
    </div>
    <PracticeActionBar position={position} total={lines.length} onPrevious={() => goTo(position - 1)} previousDisabled={position === 0}
      isPlaying={isPlaying} onTogglePlay={() => isPlaying ? onStopPlayback() : onPlayLine(line.index)} playLabel={isPlaying ? '暂停当前听写句' : '播放当前听写句'}
      onNext={() => goTo(position + 1)} playbackRate={props.playbackRate} onPlaybackRateChange={props.onPlaybackRateChange}
      repeatLine={props.repeatLine} onRepeatLineChange={props.onRepeatLineChange} bilingualMode={props.bilingualMode} onBilingualModeChange={props.onBilingualModeChange}
      onCheck={() => submit()} checkDisabled={checked || !draft.trim()} inputFocused={inputFocused} />
  </div>;
}
