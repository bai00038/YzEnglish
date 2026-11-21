import { useEffect, useState } from 'react';
import { loadKitCatalogue, type KitEntry } from '@/data/kit';
import { removeMistake, setEntryLearned, syncMemberLearning, useMemberLearning } from '@/data/member-learning';
import { EntryCard } from '@/app/pages/KitPage';
import { stopKitAudio } from '@/data/kit-audio';
import '@/styles/kit.css';

export function MistakeNotebook() {
  const { mistakes, learned, phase } = useMemberLearning();
  const [catalogue, setCatalogue] = useState<KitEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState(0);
  const [showLearned, setShowLearned] = useState(false);
  useEffect(() => {
    let live = true;
    loadKitCatalogue().then(data => { if (live) setCatalogue([...data.expressions, ...data.chunks, ...data.words]); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; stopKitAudio(); };
  }, []);
  const sorted = [...mistakes].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const selected = sorted[Math.min(position, Math.max(0, sorted.length - 1))];
  const entry = catalogue?.find(item => item.id === selected?.entryId);
  useEffect(() => { setPosition(value => Math.min(value, Math.max(0, sorted.length - 1))); }, [sorted.length]);
  useEffect(() => { stopKitAudio(); }, [selected?.entryId]);
  return <section className="member-notebook mt-10" aria-labelledby="mistake-notebook">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="mistake-notebook" className="font-sans text-[25px] font-bold text-primary">错题本 <span className="text-sm font-normal">{mistakes.length} 条</span></h2>
      <button type="button" className="kit-mode" aria-expanded={showLearned} onClick={() => setShowLearned(value => !value)}>已学会 {learned.length} 条</button>
    </div>
    {showLearned && <div className="member-learned-list">
      {learned.length === 0 ? <p>还没有已学会的条目。</p> : learned.map(id => <div key={id}><span>{catalogue?.find(item => item.id === id)?.text ?? id}</span><button type="button" onClick={() => setEntryLearned(id, false)}>恢复学习</button></div>)}
    </div>}
    {phase === 'offline' && <p className="mt-3 text-sm text-muted-foreground" role="status">暂未同步，已保存的改动会在网络恢复后重试。<button type="button" className="underline ml-2" onClick={() => { void syncMemberLearning(); }}>重试同步</button></p>}
    {mistakes.length === 0 ? <p className="member-notebook-empty">还没有错题，收藏或听写答错的条目会放在这里。</p> : <>
      <p className="kit-progress">第 {Math.min(position + 1, sorted.length)} 个 · 共 {sorted.length} 个{selected?.source === 'dictation' ? ' · 听写收录' : ' · 手动收藏'}</p>
      {entry ? <div className="member-notebook-card"><EntryCard key={entry.id} entry={entry} personalActions={false} /></div>
        : <p role="status">{failed ? '条目加载失败，请刷新重试。' : catalogue ? '这条内容暂未在当前目录中，稍后刷新再试。' : '正在加载条目…'}</p>}
      <div className="kit-card-navigation">
        <button type="button" disabled={position <= 0} onClick={() => setPosition(value => Math.max(0, value - 1))}>‹ 上一个</button>
        <button type="button" onClick={() => { if (selected) { removeMistake(selected.entryId); setPosition(value => Math.max(0, Math.min(value, sorted.length - 2))); } }}>移除</button>
        <button type="button" disabled={position >= sorted.length - 1} onClick={() => setPosition(value => Math.min(sorted.length - 1, value + 1))}>下一个 ›</button>
      </div>
    </>}
  </section>;
}
