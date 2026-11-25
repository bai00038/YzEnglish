import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { PageHeading } from '@/app/components/PageHeading';
import { readPaymentReceipt, type PaymentReceipt } from '@/data/payments/client';
import { PaymentSuccessCard } from '@/app/components/PaymentSuccessCard';
import { Btn } from '@/app/components/Btn';
import '@/styles/learning.css';
import '@/styles/payments.css';

// Only the authenticated receipt API can confirm payment and expose this session's code.
export function PaymentReturnPage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending'>('checking');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  useEffect(() => {
    const controller = new AbortController();let stopped = false;let paid = false;let next: ReturnType<typeof setTimeout>;
    const deadline = setTimeout(() => { stopped = true;controller.abort();setStatus(paid ? 'paid' : 'pending');clearTimeout(next); }, 10000);
    async function check() {
      try {
        const result = await readPaymentReceipt(sessionId, controller.signal);
        if (stopped) return;
        if (result.status === 'paid') { paid = true;setReceipt(result); }
        if (result.status === 'paid' && result.membership) { clearTimeout(deadline);setStatus('paid');return; }
        next = setTimeout(() => { void check(); }, 1500);
      } catch { if (!stopped) { clearTimeout(deadline);setStatus(paid ? 'paid' : 'pending'); } }
    }
    void check();
    return () => { stopped = true;controller.abort();clearTimeout(deadline);clearTimeout(next); };
  }, [sessionId]);
  return <div className="payment-page"><div className="payment-container payment-receipt">
    {receipt?.membership ? <PaymentSuccessCard receipt={{ ...receipt, membership: receipt.membership }} /> : <section className="learning-card payment-card" aria-live="polite">
      {status === 'checking' && <LoaderCircle className="payment-receipt-icon animate-spin" aria-hidden="true" />}
      <PageHeading>{status === 'checking' ? '正在确认你的付款…' : status === 'paid' ? '付款已成功，会员码正在准备中' : '暂未确认付款'}</PageHeading>
      <p>{status === 'checking' ? '请稍候，我们正在核对付款并准备会员码。' : status === 'paid' ? '请稍后刷新查看会员码。如需帮助，请提供购买邮箱。' : '请稍后刷新查看。如需帮助，请通过联系页联系我们并提供购买邮箱。'}</p>
      {status !== 'checking' && <Btn to="/my-learning">去我的学习</Btn>}
      <Link to="/contact" className="payment-receipt-link">联系我们 ›</Link>
    </section>}
  </div></div>;
}
