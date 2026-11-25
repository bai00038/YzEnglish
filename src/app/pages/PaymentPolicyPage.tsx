import { Link } from 'react-router';
import { PageHeading } from '@/app/components/PageHeading';
import { refundPolicy, serviceTerms } from '@/data/payments/policies';
import '@/styles/learning.css';
import '@/styles/payments.css';

function ContactText({ text }: { text: string }) {
  return <>{text.split('「联系我们」').map((part, index) => <span key={index}>{index > 0 && <Link to="/contact">「联系我们」</Link>}{part}</span>)}</>;
}
export function PaymentPolicyPage({ kind }: { kind: 'refund' | 'terms' }) {
  const policy = kind === 'refund' ? refundPolicy : serviceTerms;
  const List = kind === 'refund' ? 'ul' : 'ol';
  return <div className="payment-page"><div className="payment-container payment-policy">
    <Link to="/membership" className="payment-policy-back">← 返回购买页</Link>
    <PageHeading subtitle={policy.subtitle}>{policy.title}</PageHeading>
    <article className="learning-card payment-card payment-policy-content">
      {policy.introduction && <p>{policy.introduction}</p>}
      <List>{policy.items.map(item => <li key={item.title}><strong>{item.title}</strong>：<ContactText text={item.body} /></li>)}</List>
    </article>
  </div></div>;
}
