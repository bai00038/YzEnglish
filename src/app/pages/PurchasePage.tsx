import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, LoaderCircle } from 'lucide-react';
import { PageHeading } from '@/app/components/PageHeading';
import { Btn } from '@/app/components/Btn';
import { defaultPaymentPlans, formatPaymentPrice, loadPaymentPlans, startCheckout, hasPendingCheckout, type PaymentPlan } from '@/data/payments/client';
import { subscribeCheckoutReturn } from '@/data/payments/checkout-return';
import '@/styles/learning.css';
import '@/styles/payments.css';

const benefits = [
  '全部 100+ 集真实场景视频（看病、家长会、购物、安家……持续更新，会员期内新增免费同步解锁）',
  '精听 ＋ 挖空听写 ＋ 锁屏听（逐句练，跟上每一句）',
  '每集配套讲义 PDF（可下载、可打印）',
  '锦囊库全开（表达 · 词伙 · 词汇，全部提炼自场景原句）',
];
export function PaymentPlanPicker({ plans, selected, onChange, disabled }: {
  plans: PaymentPlan[]; selected: string; onChange: (id: string) => void; disabled: boolean;
}) {
  return <fieldset className="payment-plan-options" disabled={disabled}>
    <legend className="sr-only">选择会员时长</legend>
    {plans.map(plan => <label key={plan.id} className={`payment-plan ${selected === plan.id ? 'is-selected' : ''}`}>
      <input type="radio" name="membership-plan" value={plan.id} checked={selected === plan.id} onChange={() => onChange(plan.id)} />
      <span className="payment-plan-row"><strong>{plan.name}{plan.id === 'two_year' && <span className="payment-value-badge" aria-hidden="true">更划算</span>}</strong><span className="payment-price">{formatPaymentPrice(plan.amount)}<small>／{plan.period}</small></span></span>
      <span className="payment-plan-note">{plan.note}</span>
    </label>)}
  </fieldset>;
}
export function PurchasePage() {
  const [params] = useSearchParams();
  const [plans, setPlans] = useState(defaultPaymentPlans);
  const [selected, setSelected] = useState('two_year');
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState('');
  const [returnedFromCheckout, setReturnedFromCheckout] = useState(false);
  const inFlight = useRef(false);
  const plan = plans.find(p => p.id === selected)!;
  useEffect(() => subscribeCheckoutReturn(window, () => inFlight.current, () => {
    inFlight.current = false;
    setBusy(false);
    setError('');
    // A successful authenticated receipt clears the draft. Avoid telling a
    // customer who already paid that no payment happened when they go Back.
    setReturnedFromCheckout(hasPendingCheckout());
  }), []);
  useEffect(() => {
    const controller = new AbortController();
    const deadline = setTimeout(() => { setConnecting(false);setError('暂时无法连接安全结账，请稍后重试，或通过联系页联系我们。');controller.abort(); }, 10000);
    loadPaymentPlans(controller.signal).then(setPlans).catch(() => {
      if (!controller.signal.aborted) setError('暂时无法连接安全结账，请稍后重试，或通过联系页联系我们。');
    }).finally(() => { clearTimeout(deadline);if (!controller.signal.aborted) setConnecting(false); });
    return () => { clearTimeout(deadline);controller.abort(); };
  }, []);
  async function checkout() {
    if (inFlight.current) return;
    inFlight.current = true;setBusy(true);setError('');
    try { window.location.assign(await startCheckout(selected)); }
    catch { inFlight.current = false;setBusy(false);setError('暂时无法前往安全结账，请重新尝试；仍有问题请通过联系页联系我们。'); }
  }
  return <div className="payment-page"><div className="payment-container">
    {(returnedFromCheckout || ['cancelled', 'failed'].includes(params.get('checkout') || '')) && <p role="status" className="payment-notice">付款未完成，没有扣款，可以重新尝试</p>}
    <PageHeading subtitle="Membership">开通会员</PageHeading>
    <p className="payment-subtitle">解锁全部真实场景，先排练，再上场。<span className="payment-subtitle-english">Real scenes for real life.</span></p>
    <div className="payment-grid">
      <div className="payment-benefits-column"><section className="learning-card payment-card"><h2>会员包含</h2>
        <ul className="payment-benefits">{benefits.map(text => <li key={text}><span><Check size={13} strokeWidth={2.5} aria-hidden="true" /></span><p>{text.split('持续更新').map((part, index) => <span key={index}>{index > 0 && <span className="whitespace-nowrap">持续更新</span>}{part}</span>)}</p></li>)}</ul>
      </section>
      <p className="payment-trust">我们希望你每次续费，都是因为它真的有用。不支持无理由退款，详见<Link to="/refund-policy">《退款政策》</Link>与<Link to="/terms">《服务条款》</Link>。</p>
      </div>
      <section className="learning-card payment-card"><h2>选择时长</h2>
        <PaymentPlanPicker plans={plans} selected={selected} onChange={setSelected} disabled={busy} />
        <Btn className="payment-checkout" disabled={busy || connecting} onClick={() => { void checkout(); }}>
          {busy ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />正在前往安全结账…</> : connecting ? '正在准备安全结账…' : `立即开通 · ${formatPaymentPrice(plan.amount)}`}
        </Btn>
        <div role="status" aria-live="polite">{error && <p className="payment-error">{error} <Link to="/contact">联系我们 ›</Link></p>}</div>
        <p className="payment-delivery">付款后，会员码即时发到你的邮箱，在「我的学习」输码即可用。</p>
      </section>
    </div>
  </div></div>;
}
