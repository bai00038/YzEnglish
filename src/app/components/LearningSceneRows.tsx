import { buildSceneHref } from '@/data/scene-navigation';
import { Link } from 'react-router';
import { useScenes } from '@/data/scenes-access';
import { useAllLearningProgress } from '@/data/learning-progress';
import { splitLearningScenes } from '@/data/learning-overview';
import { responsiveImageProps } from '@/data/responsive-image';
import type { Scene } from '@/data/types';
export function useLearningScenes() {
  const { data, loading, error } = useScenes();
  const progress = useAllLearningProgress();
  return { ...splitLearningScenes(data || [], progress), loading, error };
}
export function LearningSceneRows({ records, completed = false }: { records: { scene: Scene; progress: { percent: number; updatedAt: string } }[]; completed?: boolean }) {
  return <div className="learning-scene-rows">{records.map(({ scene, progress }) => <Link className="learning-scene-row" key={scene.externalId || scene.id} to={buildSceneHref(scene.slug, { from: 'membership', resume: !completed })}>
    <div className="learning-scene-cover">{scene.photo && <img {...responsiveImageProps(scene.photo, '(min-width: 768px) 160px, 104px')} alt="" loading="lazy" />}</div>
    <div className="learning-scene-info"><strong>{scene.titleZh || scene.titleEn}</strong>
      {!completed && <div className="learning-scene-progress"><span className="learning-progress-track"><span style={{ width: `${progress.percent}%` }} /></span><span>{progress.percent}%</span></div>}
      <div className="learning-scene-meta"><time dateTime={progress.updatedAt}>{completed ? '学完于 ' : '上次学习 '}{new Date(progress.updatedAt).toLocaleDateString('zh-CN')}</time><span>{completed ? '复习 ›' : '继续 ›'}</span></div>
    </div>
  </Link>)}</div>;
}
