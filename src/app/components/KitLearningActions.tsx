import { useMembershipAccess } from '@/data/membership';
import { addMistake, useMemberLearning } from '@/data/member-learning';

export function KitLearningActions({ entryId, sceneId = null }: { entryId: string; sceneId?: string | null }) {
  const { isUnlocked } = useMembershipAccess();
  const { notebook: mistakes, ready } = useMemberLearning();
  if (!isUnlocked) return null;
  const saved = mistakes.some(item => item.entryId === entryId);
  return <div className="kit-learning-actions" onClick={event => event.stopPropagation()}>
    <button type="button" disabled={!ready || saved} data-saved={saved || undefined} aria-pressed={saved} title={saved ? '已加入，请到我的学习的生词本管理' : '加入我的单词本'} onClick={() => addMistake(entryId, 'manual', sceneId)}>{saved ? '✓ 已加入单词本' : '＋ 加入单词本'}</button>

  </div>;
}
