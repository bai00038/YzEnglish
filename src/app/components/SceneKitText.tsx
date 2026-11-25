import { KitLearningActions } from "./KitLearningActions";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, Volume2 } from 'lucide-react';
import { loadKitAudioIndex, loadKitCatalogue, loadKitClipsIndex, type KitEntry, type KitOccurrence } from '@/data/kit';
import { findKitWordMatches, kitLookupExamples, type KitWordMatch } from '@/data/kit-word-matches';
import { playKitExample, playKitTts, useKitAudio } from '@/data/kit-audio';
import { useMembershipAccess } from '@/data/membership';
import { MembershipUnlockModal } from './MembershipUnlockModal';
import '@/styles/scene-kit.css';

function ExampleAudio({ occurrence }: { occurrence: KitOccurrence }) {
  const audio = useKitAudio();
  const active = audio.id === `source:${occurrence.sceneId}:${occurrence.anchor_start}` && !audio.error;
  return <button type="button" className="scene-kit-example-play" disabled={occurrence.anchor_start === null}
    aria-label={active && audio.loading ? '正在加载例句原声，点击取消' : active ? '停止例句原声' : `播放例句：${occurrence.displayExample}`} aria-pressed={active} aria-busy={active && audio.loading}
    onClick={() => { void playKitExample(occurrence); }}>
    {active && audio.loading ? <LoaderCircle size={19} className="animate-spin" aria-hidden="true" /> : <Volume2 size={19} className={active ? 'scene-kit-speaking' : undefined} aria-hidden="true" />}
  </button>;
}

function EntryDetails({ entry, occurrence, audioUrl }: { entry: KitEntry; occurrence: KitOccurrence; audioUrl?: string }) {
  const audio = useKitAudio();
  const ttsActive = audio.id === `tts:${entry.key}` && !audio.error;
  const otherExamples = kitLookupExamples(entry, occurrence);
  const other = otherExamples[0];
  const exampleActive = Boolean(other && audio.id === `source:${other.sceneId}:${other.anchor_start}` && !audio.error);
  const ownError = audio.id === `tts:${entry.key}` || (other && audio.id === `source:${other.sceneId}:${other.anchor_start}`);
  return <>
    <p className="scene-kit-category">锦囊库 · 词汇</p>
    <div className="scene-kit-title-row">
      <div className="scene-kit-word-heading">
      <Dialog.Title className="scene-kit-title">
        <button type="button" className="scene-kit-title-play"
          aria-label={`${ttsActive ? '停止' : '播放'}单词发音：${entry.text}`}
          aria-pressed={ttsActive} aria-busy={ttsActive && audio.loading}
          onClick={() => { void playKitTts(entry.text, audioUrl); }}>
          {entry.text}
        </button>
      </Dialog.Title>
      <button type="button" className="scene-kit-tts" aria-label={ttsActive ? '停止单词发音' : '播放单词发音'} aria-pressed={ttsActive} aria-busy={ttsActive && audio.loading}
        onClick={() => { void playKitTts(entry.text, audioUrl); }}>
        {ttsActive && audio.loading ? <LoaderCircle size={19} className="animate-spin" aria-hidden="true" /> : <Volume2 size={19} className={ttsActive ? 'scene-kit-speaking' : undefined} aria-hidden="true" />}
      </button>
      </div>
      <KitLearningActions entryId={entry.id} sceneId={occurrence.sceneId} />
    </div>
    <Dialog.Description className="sr-only">条目释义、发音和原声例句</Dialog.Description>
    {entry.phonetic && <p className="scene-kit-pronunciation">{entry.phonetic}</p>}
    <p className="scene-kit-meaning">{entry.pos && <span className="scene-kit-pos">{entry.pos}</span>}{entry.meaningZh}</p>
    {entry.note && <p className="scene-kit-note">{entry.note}</p>}
    {other && <>
      <h3 className="scene-kit-examples-heading">原声例句</h3>
      <ul className="scene-kit-examples"><li>
        <div className="scene-kit-example-copy">
          <button type="button" className="scene-kit-example-sentence scene-kit-sentence-play"
            disabled={other.anchor_start === null}
            aria-label={`${exampleActive ? '停止' : '播放'}例句原声：${other.displayExample}`}
            aria-pressed={exampleActive} aria-busy={exampleActive && audio.loading}
            onClick={() => { void playKitExample(other); }}>
            {other.displayExample}
          </button>
          <p className="scene-kit-source">出自 {other.sceneId}《{other.titleZh}》</p>
        </div>
        <ExampleAudio occurrence={other} />
      </li></ul>
    </>}
    {ownError && audio.error && <p role="status" className="scene-kit-error">{audio.error === '短语发音制作中' ? '单词发音制作中' : audio.error}</p>}
    {otherExamples.length > 0 && <p className="scene-kit-hint">锦囊库里还有 {otherExamples.length} 句原声例句</p>}
  </>;
}

export function SceneKitText({ text, sceneId, anchorStart }: { text: string; sceneId: string; anchorStart?: number }) {
  const { isUnlocked } = useMembershipAccess();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [entries, setEntries] = useState<KitEntry[]>([]);
  const [audioIndex, setAudioIndex] = useState<Record<string, { audioUrl: string }>>({});
  const [selection, setSelection] = useState<{ match: KitWordMatch; anchor: HTMLButtonElement } | null>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [position, setPosition] = useState({ left: 0, top: 0, arrow: 24, above: false, maxHeight: 0, ready: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  useEffect(() => {
    let active = true;
    loadKitCatalogue().then(catalogue => { if (active) setEntries(catalogue.words); }).catch(() => {});
    loadKitAudioIndex().then(index => { if (active) setAudioIndex(index); }).catch(() => {});
    // Start the shared clip-index request before the user opens a word and taps play.
    void loadKitClipsIndex().catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => { setSelection(null); }, [sceneId]);
  useEffect(() => {
    if (!isUnlocked) setSelection(null);
    else setUnlockOpen(false);
  }, [isUnlocked]);
  const matches = useMemo(() => findKitWordMatches(text, sceneId, anchorStart, entries), [text, sceneId, anchorStart, entries]);
  useLayoutEffect(() => {
    if (!selection || mobile) return;
    const update = () => {
      const card = cardRef.current;
      if (!card) return;
      const rect = selection.anchor.getBoundingClientRect();
      const height = card.getBoundingClientRect().height;
      const width = card.getBoundingClientRect().width;
      const above = window.innerHeight - rect.bottom - 12 < height && rect.top > window.innerHeight - rect.bottom;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(above ? rect.top - height - 12 : rect.bottom + 12, window.innerHeight - height - 12));
      const maxHeight = Math.max(100, above ? rect.top - 24 : window.innerHeight - rect.bottom - 24);
      setPosition({ left, top, arrow: Math.max(20, Math.min(rect.left + rect.width / 2 - left, width - 20)), above, maxHeight, ready: true });
    };
    // The portal mounts after the trigger render.
    const observer = new ResizeObserver(update);
    const frame = requestAnimationFrame(() => { update(); if (cardRef.current) observer.observe(cardRef.current); });
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', update); };
  }, [selection, mobile]);
  useEffect(() => {
    if (selection && (mobile || position.ready)) cardRef.current?.focus({ preventScroll: true });
  }, [selection, mobile, position.ready]);
  let cursor = 0;
  const parts = matches.map(match => {
    const before = text.slice(cursor, match.start);
    cursor = match.end;
    return <Fragment key={`${match.start}:${match.entry.id}`}>{before}<button type="button" className="scene-kit-word"
      aria-label={`查看词汇：${match.entry.text}`} aria-haspopup="dialog" aria-expanded={selection?.match === match}
      onPointerDown={event => event.stopPropagation()} onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') event.stopPropagation(); }} onClick={event => {
        event.stopPropagation();
        if (!isUnlocked) { setUnlockOpen(true); return; }
        setPosition(previous => ({ ...previous, ready: false }));
        setSelection({ match, anchor: event.currentTarget });
      }}>{text.slice(match.start, match.end)}</button></Fragment>;
  });
  return <>{parts}{text.slice(cursor)}
    <MembershipUnlockModal open={unlockOpen} onOpenChange={setUnlockOpen} />
    <Dialog.Root open={Boolean(selection)} onOpenChange={open => { if (!open) setSelection(null); }}>
      {selection && <Dialog.Portal>
        <Dialog.Overlay className="scene-kit-overlay" onClick={event => { event.stopPropagation(); setSelection(null); }} />
        <Dialog.Content ref={cardRef} className={`scene-kit-popup ${mobile ? 'is-sheet' : 'is-floating'}`}
          style={mobile ? undefined : { left: position.left, top: position.top, maxHeight: position.ready ? position.maxHeight : undefined, visibility: position.ready ? 'visible' : 'hidden' }}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => { if (event.key.startsWith('Arrow')) event.stopPropagation(); }}
          onCloseAutoFocus={event => { event.preventDefault(); if (selection.anchor.isConnected) selection.anchor.focus({ preventScroll: true }); }}>
          {!mobile && <span aria-hidden="true" className={`scene-kit-arrow ${position.above ? 'is-above' : ''}`} style={{ left: position.arrow }} />}
          {mobile && <div className="scene-kit-drag" aria-label="下滑关闭词条"
            onPointerDown={event => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerCancel={() => { dragStart.current = null; }}
            onPointerUp={event => { if (dragStart.current !== null && event.clientY - dragStart.current > 45) setSelection(null); dragStart.current = null; }}><span /></div>}
          <div className="scene-kit-popup-scroll"><EntryDetails entry={selection.match.entry} occurrence={selection.match.occurrence}
            audioUrl={audioIndex[selection.match.entry.key]?.audioUrl ?? selection.match.entry.audioUrl ?? undefined} /></div>
        </Dialog.Content>
      </Dialog.Portal>}
    </Dialog.Root>
  </>;
}
