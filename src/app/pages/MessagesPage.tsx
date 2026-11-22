import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { KitPageLayout } from '@/app/components/KitEntryCard';
import { PageSectionHeader } from '@/app/components/PageSectionHeader';
import { LearningEmptyState } from '@/app/components/LearningEmptyState';
import { MessageListCard, MessageDetailCard } from '@/app/components/MessageCard';
import { markMessagesRead, useMessages } from '@/data/messages';
import '@/styles/learning.css';
import '@/styles/messages.css';

export function MessagesPage() {
  const { messages, unread, loading } = useMessages();
  return <KitPageLayout className="section-page">
    <PageSectionHeader title="消息中心" description="查看学习提醒与全站公告" back={{ to: '/membership', label: '返回我的学习' }} />
    {unread.length > 0 && <button type="button" className="learning-text-button message-mark-all" onClick={() => markMessagesRead(unread)}>全部标为已读</button>}
    {messages.length > 0 ? <div className="message-list">{messages.map(message => <MessageListCard key={message.id} message={message} unread={unread.includes(message.id)} />)}</div>
      : loading ? <p className="learning-empty" role="status">正在加载消息…</p> : <LearningEmptyState kind="messages" />}
  </KitPageLayout>;
}

export function MessageDetailPage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const { messages, unread, loading } = useMessages();
  const message = messages.find(item => item.id === id);
  const isUnread = Boolean(message && unread.includes(message.id));
  useEffect(() => {
    if (message && isUnread) markMessagesRead([message.id]);
  }, [message?.id, isUnread]);
  return <KitPageLayout className="section-page">
    <Link className="page-section-back message-back" to="/membership/messages"><ArrowLeft size={16} aria-hidden="true" />返回消息中心</Link>
    {message ? <MessageDetailCard message={message} /> : loading ? <p className="learning-empty" role="status">正在加载消息…</p>
      : <div className="learning-card message-missing"><h1>消息不存在或已下线</h1><p>返回消息中心查看其他消息。</p></div>}
  </KitPageLayout>;
}
