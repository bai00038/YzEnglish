import { ViewModeSwitch } from "@/app/components/ViewModeSwitch";
import { KitEntryList, type KitListItem } from "@/app/components/KitEntryList";
import { NotebookEntryActions } from '@/app/components/NotebookEntryActions';
import { PageSectionHeader } from "@/app/components/PageSectionHeader";
import { LearningEmptyState } from '@/app/components/LearningEmptyState';
import { useEffect, useState, type ReactNode } from 'react';
import { EntryCardReview, KitPageLayout } from '@/app/components/KitEntryCard';
import { LearningSceneRows, useLearningScenes } from '@/app/components/LearningSceneRows';
import { MembershipUnlockModal } from '@/app/components/MembershipUnlockModal';
import { loadKitCatalogue, type KitEntry } from '@/data/kit';
import { setEntryLearned, syncMemberLearning, useMemberLearning } from '@/data/member-learning';
import { useMembershipAccess } from '@/data/membership';
import { stopKitAudio } from '@/data/kit-audio';
import '@/styles/kit.css';
import '@/styles/learning.css';

function LearningPage({ title, children, description, review = false, action }: { title: string; children: ReactNode; description?: string; review?: boolean; action?: ReactNode }) {
  return <KitPageLayout cardMode={review} className="section-page">
    <PageSectionHeader title={title} description={description} back={{ to: '/my-learning', label: '返回我的学习' }} action={action} />
    {children}
  </KitPageLayout>;
}
export function LearningScenesPage({ completed = false }: { completed?: boolean }) {
  const { continuing, completed: done, loading, error } = useLearningScenes();
  const records = completed ? done : continuing;
  return <LearningPage title={completed ? '已学完' : '继续学习'} description={`共 ${records.length} 集`}>
    {records.length > 0 ? <div className="learning-card"><LearningSceneRows records={records} completed={completed} /></div> : loading || error ? <p className="learning-empty" role="status">{loading ? '正在加载…' : '暂时无法加载，请稍后刷新。'}</p> : <LearningEmptyState kind={completed ? 'completed' : 'continuing'} />}
  </LearningPage>;
}
function useCatalogue() {
  const [entries, setEntries] = useState<KitEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadKitCatalogue().then(data => { if (live) setEntries([...data.expressions, ...data.chunks, ...data.words]); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; stopKitAudio(); };
  }, []);
  return { entries, failed };
}
function listItem(id: string, entries: KitEntry[]): KitListItem {
  const entry = entries.find(item => item.id === id);
  return { id, text: entry?.text || id, meaningZh: entry?.meaningZh || '这条内容暂未在当前目录中，请稍后刷新。' };
}
function MemberGate({ children }: { children: ReactNode }) {
  const { isUnlocked } = useMembershipAccess();
  const [open, setOpen] = useState(false);
  if (isUnlocked) return children;
  return <LearningPage title="我的学习"><LearningEmptyState kind="vocabulary" title="让学习记录跟着你" description="输入会员兑换码，查看自己的生词本与学习记录。" action={<button className="learning-empty-action" onClick={() => setOpen(true)}>输入兑换码</button>} /><MembershipUnlockModal open={open} onOpenChange={setOpen} /></LearningPage>;
}
function SyncStatus() {
  const { phase } = useMemberLearning();
  return phase === 'offline' ? <p className="learning-description" role="status">暂未同步，已保存的改动会在网络恢复后重试。<button className="underline ml-2" onClick={() => { void syncMemberLearning(); }}>重试同步</button></p> : null;
}
export function VocabularyPage() {
  return <MemberGate><VocabularyContent /></MemberGate>;
}
function VocabularyContent() {
  const { notebook: mistakes } = useMemberLearning();
  const { entries, failed } = useCatalogue();
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [position, setPosition] = useState(0);
  const sorted = [...mistakes].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const index = Math.min(position, Math.max(0, sorted.length - 1));
  const selected = sorted[index];
  const entry = entries?.find(item => item.id === selected?.entryId);
  useEffect(() => { setPosition(value => Math.min(value, Math.max(0, mistakes.length - 1))); }, [mistakes.length]);
  useEffect(() => { stopKitAudio(); }, [selected?.entryId, view]);
  const sourceLabel = (source: string) => source === 'dictation' ? '听写错题' : '收藏';
  const review = view === 'cards' && Boolean(entry);
  const action = <ViewModeSwitch listMode={view === 'list'} onChange={list => setView(list ? 'list' : 'cards')} />;
  return <LearningPage title="生词本" description={`共 ${mistakes.length} 词 · 学会后可移到「已学会」。`} review={review} action={action}>
    <SyncStatus />
    {mistakes.length === 0 ? <LearningEmptyState kind="vocabulary" />
      : !entries ? <p role="status" className="learning-empty">{failed ? '条目加载失败，请刷新重试。' : '正在加载条目…'}</p>
      : view === 'cards' ? entry ? <EntryCardReview current={entry} previous={entries.find(word => word.id === sorted[index - 1]?.entryId)} next={entries.find(word => word.id === sorted[index + 1]?.entryId)}
        index={index} total={sorted.length} sourceLabel={sourceLabel(selected.source)} onMove={direction => setPosition(value => Math.max(0, Math.min(sorted.length - 1, value + direction)))} personalActions={false}
        cardAction={<NotebookEntryActions entryId={selected.entryId} label={entry.text} />} />
        : <div className="learning-empty">这条内容暂未在当前目录中，请稍后刷新。<NotebookEntryActions entryId={selected.entryId} label={selected.entryId} /></div>
      : <KitEntryList entries={sorted.map(item => listItem(item.entryId, entries))}
        renderAction={item => <NotebookEntryActions entryId={item.id} label={item.text} />} />}

  </LearningPage>;
}
export function LearnedPage() { return <MemberGate><LearnedContent /></MemberGate>; }
function LearnedContent() {
  const { learned, ready } = useMemberLearning();
  const { entries, failed } = useCatalogue();
  return <LearningPage title="已学会" description={`共 ${learned.length} 个 · 点击「恢复」即可回到生词本。`}><SyncStatus />
    {learned.length === 0 ? <LearningEmptyState kind="learned" /> : !entries ? <p className="learning-empty" role="status">{failed ? '条目加载失败，请刷新重试。' : '正在加载条目…'}</p> : <KitEntryList entries={learned.map(id => listItem(id, entries))}
      renderAction={item => <button type="button" className="kit-entry-list-action" disabled={!ready} aria-label={`恢复 ${item.text}`} onClick={() => setEntryLearned(item.id, false)}>+ 恢复</button>} />}

  </LearningPage>;
}
