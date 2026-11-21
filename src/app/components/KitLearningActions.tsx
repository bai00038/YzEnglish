import { useMembershipAccess } from '@/data/membership';
import { addMistake, removeMistake, setEntryLearned, useMemberLearning } from '@/data/member-learning';

export function KitLearningActions({ entryId, sceneId = null, showLearned = false }: { entryId: string; sceneId?: string | null; showLearned?: boolean }) {
  const { isUnlocked } = useMembershipAccess();
  const { mistakes, learned, ready } = useMemberLearning();
  if (!isUnlocked) return null;
  const saved = mistakes.some(item => item.entryId === entryId);
  const known = learned.includes(entryId);
  return <div className="kit-learning-actions" onClick={event => event.stopPropagation()}>
    <button type="button" disabled={!ready} aria-pressed={saved} onClick={() => saved ? removeMistake(entryId) : addMistake(entryId, 'manual', sceneId)}>{saved ? '✓ 已收藏' : '＋ 收藏'}</button>
    {showLearned && <button type="button" disabled={!ready} aria-pressed={known} onClick={() => setEntryLearned(entryId, !known)}>{known ? '恢复学习' : '✓ 已学会'}</button>}
  </div>;
}
