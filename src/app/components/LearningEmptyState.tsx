import type { ReactNode } from 'react';
import { Link } from 'react-router';
import '@/styles/learning.css';

type EmptyKind = 'continuing' | 'completed' | 'vocabulary' | 'learned' | 'messages';
const content: Record<EmptyKind, { title: string; description: string; href?: string; action?: string }> = {
  continuing: { title: '从一个生活场景开始', description: '学过但还没完成的场景会留在这里，方便下次接着学。', href: '/explore', action: '去场景库看看' },
  completed: { title: '第一集学完后，在这里相见', description: '学完的场景会收在这里，随时回来，再练一遍。', href: '/explore', action: '去学一集' },
  vocabulary: { title: '把想记住的词，收在这里', description: '收藏的词和听写错题会放进生词本，方便随时翻卡复习。', href: '/kit', action: '去锦囊库看看' },
  learned: { title: '学会的每一个，都留在这里', description: '已学会的条目会保留在这里，也可以随时恢复学习。', href: '/kit', action: '去锦囊库学习' },
  messages: { title: '暂时没有新消息', description: '学习提醒和全站公告会出现在这里。', href: '/my-learning', action: '返回我的学习' },
};
function EmptyIllustration({ kind }: { kind: EmptyKind }) {
  return <svg className="learning-empty-art" viewBox="0 0 220 156" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="110" cy="133" rx="77" ry="8" fill="#123325" opacity=".05" />
    <circle cx="109" cy="76" r="59" fill="#F4EFE6" />
    <circle cx="173" cy="42" r="5" fill="#D2DF91" /><path d="M42 91h8m-4-4v8M159 121h6m-3-3v6" stroke="#B8B39D" strokeWidth="2" strokeLinecap="round" />
    {kind === 'messages' ? <>
      <rect x="76" y="29" width="68" height="76" rx="7" fill="white" stroke="#1A4A35" strokeWidth="2" transform="rotate(7 110 67)" />
      <path d="M91 48h37M91 59h26" stroke="#D7D1BF" strokeWidth="3" strokeLinecap="round" />
      <path d="M54 69l56-33 56 33v48a8 8 0 0 1-8 8H62a8 8 0 0 1-8-8V69Z" fill="#EAE4D5" stroke="#1A4A35" strokeWidth="2" strokeLinejoin="round" />
      <path d="m55 70 55 35 55-35M55 122l39-28m71 28-39-28" stroke="#1A4A35" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="164" cy="49" r="13" fill="#D2DF91" /><path d="m159 49 3 3 6-7" stroke="#1A4A35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </> : kind === 'vocabulary' ? <>
      <rect x="59" y="40" width="90" height="84" rx="10" fill="#EAE4D5" stroke="#B8B39D" strokeWidth="2" transform="rotate(-10 104 82)" />
      <rect x="73" y="29" width="90" height="94" rx="10" fill="white" stroke="#1A4A35" strokeWidth="2" transform="rotate(6 118 76)" />
      <path d="M132 31v27l9-6 9 6V33" fill="#D2DF91" stroke="#1A4A35" strokeWidth="2" strokeLinejoin="round" />
      <path d="M91 67h25M91 79h48M91 93h34" stroke="#D7D1BF" strokeWidth="3" strokeLinecap="round" />
      <path d="M47 52c-9-6-9-13-2-15 4-1 7 3 7 3s5-3 8 0c5 6-3 11-13 12Z" fill="#D2DF91" />
    </> : kind === 'continuing' ? <>
      <rect x="51" y="43" width="116" height="76" rx="12" fill="white" stroke="#1A4A35" strokeWidth="2" />
      <path d="M51 61h116" stroke="#EAE4D5" strokeWidth="2" /><circle cx="63" cy="53" r="2" fill="#B8B39D" /><circle cx="71" cy="53" r="2" fill="#B8B39D" />
      <circle cx="109" cy="85" r="17" fill="#EAE4D5" /><path d="m105 76 13 9-13 9V76Z" fill="#1A4A35" />
      <path d="M66 108h87" stroke="#EAE4D5" strokeWidth="3" strokeLinecap="round" /><path d="M66 108h31" stroke="#A9C553" strokeWidth="3" strokeLinecap="round" />
      <path d="m159 33 8-5m-13 0 2-9" stroke="#A9C553" strokeWidth="2" strokeLinecap="round" />
    </> : <>
      <path d="M52 44c21-7 39-5 58 5 19-10 37-12 58-5v76c-22-6-40-3-58 5-18-8-36-11-58-5V44Z" fill="white" stroke="#1A4A35" strokeWidth="2" strokeLinejoin="round" />
      <path d="M110 50v74M65 60c10-1 20 0 31 4M65 74c10-1 20 0 31 4M65 88c10-1 20 0 31 4M124 64c10-4 20-5 31-4M124 78c10-4 20-5 31-4" stroke="#D7D1BF" strokeWidth="2" strokeLinecap="round" />
      {kind === 'completed' ? <><circle cx="159" cy="105" r="22" fill="#1A4A35" /><path d="m149 105 7 7 13-15" stroke="#D2DF91" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></> : <><path d="M151 118V89" stroke="#1A4A35" strokeWidth="2" strokeLinecap="round" /><path d="M151 103c-16 0-23-8-21-18 14 0 23 7 21 18Z" fill="#D2DF91" stroke="#1A4A35" strokeWidth="2" /><path d="M151 92c-1-14 7-23 20-23 2 13-6 22-20 23Z" fill="#D2DF91" stroke="#1A4A35" strokeWidth="2" /></>}
    </>}
  </svg>;
}
export function LearningEmptyState({ kind, title, description, action }: { kind: EmptyKind; title?: string; description?: string; action?: ReactNode }) {
  const copy = content[kind];
  return <section className="learning-card learning-empty-state">
    <EmptyIllustration kind={kind} /><h2>{title || copy.title}</h2><p>{description || copy.description}</p>
    {action || (copy.href && <Link className="learning-empty-action" to={copy.href}>{copy.action}<span aria-hidden="true"> ›</span></Link>)}
  </section>;
}
