import { Link } from 'react-router';
import { getMessageAction, messageDetailHref, type SiteMessage } from '@/data/learning-overview';
import '@/styles/messages.css';

function MessageMetadata({ message }: { message: SiteMessage }) {
  return <div className="message-metadata"><span className="message-type">{message.type === 'personal' ? '个人提醒' : message.type === 'new-scene' ? '新集上线' : '全站公告'}</span><time dateTime={message.publishedAt}>{new Date(message.publishedAt).toLocaleDateString('zh-CN')}</time></div>;
}

export function MessageListCard({ message, unread }: { message: SiteMessage; unread: boolean }) {
  return <Link to={messageDetailHref(message.id)} className={`learning-card message-list-card${unread ? '' : ' is-read'}`}>
    <div className="message-list-heading">{unread && <span className="message-unread-dot" aria-label="未读" />}<h2>{message.title}</h2></div>
    <p className="message-preview">{message.body}</p>
    <div className="message-list-footer"><MessageMetadata message={message} /><span className="message-view-detail">查看详情 ›</span></div>
  </Link>;
}

export function MessageDetailCard({ message }: { message: SiteMessage }) {
  const action = getMessageAction(message);
  return <article className="learning-card message-detail-card"><div className="message-detail-reading">
    <MessageMetadata message={message} />
    <h1 className="message-detail-title">{message.title}</h1>
    <div className="message-body">{message.body}</div>
    {action && <Link className="message-action" to={action.path}>{action.label}</Link>}
  </div></article>;
}
