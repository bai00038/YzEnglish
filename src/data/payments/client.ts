import configuredPlans from '../../../aliyun-membership-api/config/payment-plans.json';
export interface PaymentPlan { id: string; name: string; years: number; amount: number; currency: string; period: string; note: string }
export const defaultPaymentPlans: PaymentPlan[] = configuredPlans;
const API = String(import.meta.env.VITE_PAYMENTS_API_URL ?? (import.meta.env.DEV ? '/dev-payments' : '')).replace(/\/+$/, '');
const DRAFT_KEY = 'yz-payment-draft-v1';
const RECEIPT_KEY = 'yz-payment-receipt-v1:';
export function hasPendingCheckout() {
  try { return Boolean(sessionStorage.getItem(DRAFT_KEY)); } catch { return false; }
}
export function formatPaymentPrice(amount: number) { return `¥${(amount / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`; }
export async function loadPaymentPlans(signal?: AbortSignal): Promise<PaymentPlan[]> {
  if (!API) throw new Error('payments_unavailable');
  const response = await fetch(`${API}/v1/payments/plans`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('payments_unavailable');
  const data = await response.json();
  if (!Array.isArray(data.plans) || data.plans.length !== 2 || !data.plans.every((p: PaymentPlan) => typeof p.id === 'string' && p.currency === 'cny' && Number.isSafeInteger(p.amount) && p.amount > 0)) throw new Error('payments_unavailable');
  return data.plans;
}
export async function startCheckout(planId: string): Promise<string> {
  if (!API) throw new Error('payments_unavailable');
  let draft;
  try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* Start a new attempt. */ }
  if (!draft || draft.planId !== planId || Date.now() - draft.createdAt > 20 * 60000) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const receiptToken = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    draft = { planId, requestId: crypto.randomUUID(), receiptToken, createdAt: Date.now() };
  }
  // If browser storage is blocked, fail before charging rather than lose the receipt.
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  const response = await fetch(`${API}/v1/payments/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, requestId: draft.requestId, receiptToken: draft.receiptToken }) });
  if (!response.ok) throw new Error('checkout_unavailable');
  const data = await response.json();
  if (new URL(data.url).origin !== 'https://checkout.stripe.com' || !/^cs_test_/.test(data.sessionId)) throw new Error('checkout_unavailable');
  sessionStorage.setItem(RECEIPT_KEY + data.sessionId, draft.receiptToken);
  return data.url;
}
export interface PaymentReceipt { status: 'pending' | 'paid'; membership?: { code: string; expiresAt: string; planName: string; renewed: boolean }; emailStatus?: string }
export async function readPaymentReceipt(sessionId: string, signal?: AbortSignal): Promise<PaymentReceipt> {
  const token = sessionStorage.getItem(RECEIPT_KEY + sessionId);
  if (!token || !API || !/^cs_test_/.test(sessionId)) throw new Error('receipt_unavailable');
  const response = await fetch(`${API}/v1/payments/status?session_id=${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('receipt_unavailable');
  const data = await response.json();
  if (data.status !== 'paid' && data.status !== 'pending') throw new Error('receipt_unavailable');
  if (data.status === 'paid') sessionStorage.removeItem(DRAFT_KEY);
  if (data.membership && (!/^YZ-[A-Z0-9-]{8,80}$/.test(data.membership.code) || !Number.isFinite(Date.parse(data.membership.expiresAt)))) throw new Error('receipt_unavailable');
  return data;
}
export async function readPaymentStatus(sessionId: string, signal?: AbortSignal): Promise<'pending' | 'paid'> {
  return (await readPaymentReceipt(sessionId, signal)).status;
}
