import { MEMBERSHIP_DEVICE_LIMIT } from '@/data/membership-limits';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { PageHeading } from './PageHeading';
import { Btn } from './Btn';
import type { PaymentReceipt } from '@/data/payments/client';
import { membershipCodeLink } from '@/data/payments/membership-link';

export function PaymentSuccessCard({ receipt }: { receipt: PaymentReceipt & { membership: NonNullable<PaymentReceipt['membership']> } }) {
  const { membership } = receipt;
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const codeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(membership.code);
      setManual(false); setCopied(true);
    } catch {
      const selection = window.getSelection();
      if (selection && codeRef.current) {
        const range = document.createRange(); range.selectNodeContents(codeRef.current);
        selection.removeAllRanges(); selection.addRange(range);
      }
      setManual(true);
    }
  }
  return <>
    <div className="payment-success-check"><Check size={30} aria-hidden="true" /></div>
    <PageHeading>{membership.renewed ? '续费成功，继续一起练习' : '开通成功，欢迎加入'}</PageHeading>
    <p>你的会员已经生效，下面是你的会员码。</p>
    <p className="payment-copy-feedback" role="status" aria-live="polite">{copied ? '会员码已复制' : manual ? '已选中会员码，请使用系统菜单手动复制。' : '\u00a0'}</p>
    <section className="learning-card payment-code-card" onClick={() => { void copy(); }}>
      <div className="payment-code-copy-area" role="button" tabIndex={0} aria-label="复制会员码"
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void copy(); } }}>
        <span className="payment-code-label">你的会员码</span>
        <span className="payment-member-code" ref={codeRef}>{membership.code}</span>
        <span className="payment-code-expiry">{membership.planName} · 有效期至 {new Date(membership.expiresAt).toLocaleDateString('zh-CN', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div className="payment-success-actions" onClick={event => event.stopPropagation()}>
        <Btn to={membershipCodeLink(membership.code)}>去输入会员码，开始学习</Btn>
        <Btn variant="secondary" onClick={() => { void copy(); }}>{copied ? '已复制 ✓' : '复制会员码'}</Btn>
      </div>
    </section>
    <p className="payment-success-note">{receipt.emailStatus === 'sent' ? '会员码已同步发送到你的邮箱，请注意查收（没看到先翻一下垃圾箱）。' : '本次测试暂未启用邮件发送，请先保存会员码。'}<br />以后换设备时，在新设备的「我的学习」输入这个码即可继续，最多同时用 {MEMBERSHIP_DEVICE_LIMIT} 台设备。</p>
    <Link to="/contact" className="payment-receipt-link">需要帮助？联系我们 ›</Link>
  </>;
}
