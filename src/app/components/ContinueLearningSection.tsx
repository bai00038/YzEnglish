import { useId, useState } from 'react';
import { Link } from 'react-router';
import { LearningSceneRows } from './LearningSceneRows';
import type { Scene } from '@/data/types';

const SCENES_PER_BATCH = 3;

export function ContinueLearningSection({ records, completedCount }: {
  records: { scene: Scene; progress: { percent: number; updatedAt: string } }[];
  completedCount: number;
}) {
  const [visibleCount, setVisibleCount] = useState(SCENES_PER_BATCH);
  const listId = useId();
  const hasMore = visibleCount < records.length;
  if (!records.length) return null;
  return <section className="learning-scene-section" aria-labelledby={`${listId}-heading`}>
    <div className="learning-section-heading"><h2 id={`${listId}-heading`}>继续学习</h2><Link to="/my-learning/completed">已学完 {completedCount} 集 ›</Link></div>
    <div className="learning-card">
      <div id={listId}><LearningSceneRows records={records.slice(0, visibleCount)} /></div>
      {records.length > SCENES_PER_BATCH && <button type="button" className="learning-completed-link learning-expand-button"
        aria-controls={listId} aria-expanded={visibleCount > SCENES_PER_BATCH}
        onClick={() => setVisibleCount(value => hasMore ? value + SCENES_PER_BATCH : SCENES_PER_BATCH)}>{hasMore ? '查看更多' : '收起'}</button>}
    </div>
  </section>;
}
