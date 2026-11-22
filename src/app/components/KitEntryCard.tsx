import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, LoaderCircle, Pause, Volume2 } from 'lucide-react';
import { KitLearningActions } from './KitLearningActions';
import { PhraseAudioButton } from './PhraseAudioButton';
import type { KitEntry, KitOccurrence } from '@/data/kit';
import { playKitExample, stopKitAudio, useKitAudio } from '@/data/kit-audio';
import '@/styles/kit.css';

export function KitPageLayout({ children, home = false, cardMode = false, className = '' }: { children: ReactNode; home?: boolean; cardMode?: boolean; className?: string }) {
  return <section className={`kit-page ${home ? 'kit-home' : cardMode ? 'kit-card-page' : ''} ${className}`}>{children}</section>;
}

function ExampleBlock({ occurrence }: { occurrence: KitOccurrence }) {
  const audio = useKitAudio();
  const hasAnchor = occurrence.anchor_start !== null;
  const id = `source:${occurrence.sceneId}:${occurrence.anchor_start}`;
  const active = audio.id === id && !audio.error;
  return <div className="kit-example">
    {hasAnchor && <button type="button" className="kit-original-audio"
      aria-label={active ? "停止原声" : "播放原声"} title={active ? "停止原声" : "播放／重播原声"}
      aria-pressed={active} aria-busy={active && audio.loading} onClick={() => { void playKitExample(occurrence); }}>
      {active && audio.loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : active ? <Pause size={17} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
    </button>}
    <div className="kit-example-copy">
    {occurrence.contextLine && <p className="kit-context-line">{occurrence.contextLine}</p>}
    {hasAnchor ? <button type="button" className="kit-example-sentence kit-sentence-play"
      aria-label={`${active ? "停止原声" : "播放原声"}：${occurrence.displayExample}`}
      aria-pressed={active} onClick={() => { void playKitExample(occurrence); }}>
      “{occurrence.displayExample}”
    </button> : <p className="kit-example-sentence">“{occurrence.displayExample}”</p>}
    </div>
    <div className="kit-example-meta"><div className="kit-source-info">
      <span>出自 <b>{occurrence.sceneId}</b></span>{" "}
      <b className="kit-source-title">《{occurrence.titleZh}》</b>
    </div>
      {occurrence.slug && <Link to={`/scenes/${occurrence.slug}`}>去学这集 <ChevronRight size={13} /></Link>}
    </div>
    <p className="kit-tap-hint kit-original-status" role="status">
      {audio.id === id && audio.error
        ? audio.error
        : active ? (audio.loading ? "正在加载原声…" : "原声播放中 · 点击句子或喇叭停止") : ""}
    </p>
  </div>;
}

export function EntryCard({ entry, side = false, onNavigate, personalActions = true, footerAction }: { entry: KitEntry; side?: boolean; onNavigate?: () => void; personalActions?: boolean; footerAction?: ReactNode }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const occurrences = entry.occurrences;
  const sourceDotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = sourceDotsRef.current;
    const selected = row?.querySelector<HTMLButtonElement>('[aria-current="true"]');
    if (!row || !selected || side) return;
    row.scrollTo({ left: selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2 });
  }, [sourceIndex, side]);
  const moveSource = (next: number) => {
    const nextIndex = Math.max(0, Math.min(occurrences.length - 1, next));
    if (side || nextIndex === sourceIndex) return;
    stopKitAudio();
    setSourceIndex(nextIndex);
    if (occurrences[nextIndex].anchor_start !== null) void playKitExample(occurrences[nextIndex]);
  };
  return <article className={side ? "kit-entry-card is-side" : "kit-entry-card"} onClick={side ? onNavigate : undefined} aria-hidden={side || undefined}>
    <div className="kit-entry-top"><div><div className="kit-entry-name"><h2>{entry.text}</h2>{entry.chunkType && <span className="kit-chunk-type">{entry.chunkType}</span>}</div>
      {entry.phonetic && <p className="kit-phonetic">{entry.phonetic}</p>}
      <p className="kit-meaning">{entry.meaningZh}</p></div>
      <PhraseAudioButton text={entry.text} audioUrl={entry.audioUrl} />
    </div>
    {entry.kind === "expression" && entry.explanation && <p className="kit-explanation"><span>讲解</span>{entry.explanation}</p>}
    <div className="kit-example-slider" onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchStart.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) > 45) moveSource(sourceIndex + (delta < 0 ? 1 : -1));
      }}>
      <ExampleBlock occurrence={occurrences[sourceIndex]} />
    </div>
    {occurrences.length > 1 && <div className="kit-source-controls kit-source-pager">
      <button type="button" className="kit-source-arrow" aria-label="上一条原句" disabled={sourceIndex === 0} onClick={() => moveSource(sourceIndex - 1)}><ChevronLeft size={18} /></button>
      <div className="kit-source-dots" ref={sourceDotsRef} role="group" aria-label="切换原句">
        {occurrences.map((source, index) => <button type="button" key={`${source.sceneId}-${index}`}
          aria-label={`第 ${index + 1} 条原句，共 ${occurrences.length} 条`} aria-current={sourceIndex === index ? "true" : undefined}
          onClick={() => moveSource(index)}><span /></button>)}
      </div>
      <button type="button" className="kit-source-arrow" aria-label="下一条原句" disabled={sourceIndex === occurrences.length - 1} onClick={() => moveSource(sourceIndex + 1)}><ChevronRight size={18} /></button>
    </div>}
    {!side && (footerAction ?? (personalActions ? <KitLearningActions entryId={entry.id} sceneId={occurrences[sourceIndex]?.sceneId} /> : null))}
  </article>;
}

// The library and personal notebook share the card, carousel and navigation.
export function EntryCardReview({ current, previous, next, index, total, onMove, slideDir = 0, sourceLabel, extraAction, personalActions = true, cardAction }: {
  current: KitEntry; previous?: KitEntry; next?: KitEntry; index: number; total: number; onMove: (direction: number) => void;
  slideDir?: number; sourceLabel?: string; extraAction?: ReactNode; personalActions?: boolean; cardAction?: ReactNode;
}) {
  return <>
    <div className="kit-progress"><span>第 {index + 1} 个 · 共 {total} 个{sourceLabel ? ` · ${sourceLabel}` : ''}</span></div>
    <div key={current.id} className={`kit-stage kit-carousel ${slideDir > 0 ? 'kit-anim-next' : slideDir < 0 ? 'kit-anim-prev' : ''}`}>
      {previous ? <EntryCard entry={previous} side onNavigate={() => onMove(-1)} /> : <div className="kit-peek-spacer" aria-hidden="true" />}
      <EntryCard entry={current} personalActions={personalActions} footerAction={cardAction} />
      {next ? <EntryCard entry={next} side onNavigate={() => onMove(1)} /> : <div className="kit-peek-spacer" aria-hidden="true" />}
    </div>
    <div className="kit-card-navigation">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)}>‹ 上一个</button>
      {extraAction}
      <button type="button" className="kit-primary" disabled={index === total - 1} onClick={() => onMove(1)}>下一个 ›</button>
    </div>
  </>;
}
