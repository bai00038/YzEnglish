import { MEMBERSHIP_DEVICE_LIMIT } from '@/data/membership-limits';
import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Btn } from './Btn';
import type { MembershipUnlock } from '@/data/membership';
import { PURCHASE_PATH } from '@/data/site-routes';
import '@/styles/membership-card.css';

export function MembershipStatusCard({ isUnlocked, isExpired, membership, onUnlock, onExit, children, now = Date.now() }: {
  isUnlocked: boolean; isExpired: boolean; membership: MembershipUnlock | null;
  onUnlock: () => void; onExit?: () => void; children?: ReactNode; now?: number;
}) {
  const remaining = membership?.expiresAt ? new Date(membership.expiresAt).getTime() - now : Infinity;
  const expiring = isUnlocked && remaining > 0 && remaining <= 30 * 86400000;
  const expiry = membership?.expiresAt ? new Date(membership.expiresAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const planName = membership?.planName || (membership?.type === 'month' ? '月卡' : membership?.type === 'founder' ? '创始会员' : '年卡');
  const count = membership?.activeSessions;
  const devices = Number.isInteger(count) && count! >= 1 && count! <= 10 ? `已在 ${count} 台设备使用` : `最多同时使用 ${MEMBERSHIP_DEVICE_LIMIT} 台设备`;
  if (isUnlocked) return <section className="member-card member-card-active" aria-label="会员状态">
    <div className="member-card-top"><span className="member-card-brand">YZ ENGLISH 会员</span>
      {expiring && <span className="member-card-warning" role="status">还剩 {Math.ceil(remaining / 86400000)} 天</span>}
    </div>
    <p className="member-card-valid">{expiry ? <>有效期至 <b>{expiry}</b>（{planName}）</> : <b>终身有效</b>}</p>
    {children}
    <div className="member-card-actions"><p>{expiring ? '到期后将无法继续学习已解锁内容' : devices} · <button type="button" className="member-card-exit" onClick={onExit}>退出本设备</button></p>
      <Btn to={PURCHASE_PATH} target="_blank" variant="secondary" className={`member-card-renew ${expiring ? 'is-urgent' : ''}`}>续费</Btn>
    </div>
  </section>;
  return <section className="learning-card member-card member-card-inactive" aria-label="会员状态">
    <div className="member-card-head"><strong><LockKeyhole size={18} aria-hidden="true" />{isExpired ? '会员已过期' : '未开通会员'}</strong>
      <Btn to={PURCHASE_PATH} target="_blank" className="member-card-purchase">{isExpired ? '续费' : '开通会员'}</Btn>
    </div>
    {isExpired ? <>
      {expiry && <p className="member-card-valid">有效期至 <b>{expiry}</b>（{planName}）</p>}
      {children}
      <div className="member-card-actions"><p><button type="button" className="member-card-exit" onClick={onExit}>退出本设备</button></p></div>
    </> : <div className="member-card-sub"><p>已有会员码？输码一样可以解锁全站。</p><Btn variant="secondary" className="member-card-unlock" onClick={onUnlock}>输入兑换码解锁</Btn></div>}
  </section>;
}
