const crypto = require('node:crypto');
const { json, readJsonBody } = require('./http.cjs');
const { membershipMail } = require('./payment-mail.cjs');
const { sendMail: directMailSend } = require('./payment-mail-send.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_ID = /^cs_test_[A-Za-z0-9_]{8,240}$/;
const RECEIPT = /^[A-Za-z0-9_-]{43}$/;
const INTEGRATION = 'yz-membership-staging-v1';
function safeEqual(a, b) { const left = Buffer.from(a || ''), right = Buffer.from(b || ''); return left.length === right.length && crypto.timingSafeEqual(left, right); }

function createPaymentApp({ stripe, repository, config, codePepper, mailConfig = null, mailSender = directMailSend, now = () => Date.now() }) {
  async function fulfill(payment) {
    if (!codePepper || codePepper.length < 32) throw new Error('issuance_configuration_missing');
    const plan = config.plans.find(plan => plan.id === payment.planId);
    const issued = await repository.issuePaid(payment, plan, codePepper);
    // Persist the recoverable private outbox record first. When mail
    // transport is configured, send the persisted record and mark delivery
    // in a separate status record. A transport failure never rolls back the
    // allocated code and never reports "sent"; a later fulfill retries.
    await repository.saveMail(membershipMail(issued, config.siteOrigin));
    if (mailConfig) {
      const prior = await repository.getMailStatus(payment.sessionId);
      if (!prior || prior.status !== 'sent') {
        try {
          const mail = await repository.getMail(payment.sessionId);
          if (mail) {
            await mailSender(mail, mailConfig);
            await repository.markMailSent(payment.sessionId, new Date(now()).toISOString());
          }
        } catch (err) { /* stays unsent in the outbox; retried on the next fulfill */
          console.error(`mail_send_failed session=${payment.sessionId} error=${err && err.message ? err.message : err}`);
        }
      }
    }
    return issued;
  }
  const limits = new Map();
  function rateAllowed(ip) {
    const key = hash(String(ip || 'unknown')), timestamp = now(), existing = limits.get(key);
    if (!existing || existing.until <= timestamp) { limits.set(key, { count: 1, until: timestamp + 60000 }); return true; }
    return ++existing.count <= 8;
  }
  const prices = new Map();
  async function verifyPrice(plan) {
    if ((prices.get(plan.id) || 0) > now()) return;
    const price = await stripe.prices.retrieve(plan.priceId);
    if (price.livemode !== false || !price.active || price.type !== 'one_time' || price.currency !== plan.currency || price.unit_amount !== plan.amount || price.recurring) throw new Error('price_configuration_mismatch');
    prices.set(plan.id, now() + 60000);
  }
  return async function handle(request) {
    const method = String(request.method || 'GET').toUpperCase();
    const url = new URL(request.path || '/', 'https://payment.invalid');
    const origin = request.headers.origin || request.headers.Origin || '';
    const webhook = url.pathname === '/v1/payments/webhook';
    const cors = origin === config.siteOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const respond = (status, body) => json(status, body, cors);
    if (!webhook && origin && origin !== config.siteOrigin) return respond(403, { error: 'origin_not_allowed' });
    if (method === 'OPTIONS' && !webhook) return { statusCode: 204, headers: { ...cors,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '600' }, body: '' };
    if (url.pathname === '/v1/payments/plans' && method === 'GET') return respond(200, { plans: config.plans.map(({ priceId, priceEnv, legacyPriceIds, ...plan }) => plan) });
    if (url.pathname === '/v1/payments/checkout' && method === 'POST') {
      if (origin !== config.siteOrigin) return respond(403, { error: 'origin_not_allowed' });
      if (!rateAllowed(request.ip)) return respond(429, { error: 'checkout_rate_limited' });
      let input; try { input = readJsonBody(request); } catch { return respond(400, { error: 'invalid_request' }); }
      const plan = config.plans.find(p => p.id === input.planId);
      if (!plan || !UUID.test(input.requestId || '') || !RECEIPT.test(input.receiptToken || '')) return respond(400, { error: 'invalid_request' });
      try {
        await verifyPrice(plan);
        const receiptHash = hash(input.receiptToken);
        const session = await stripe.checkout.sessions.create({
          locale: 'zh',
          mode: 'payment', line_items: [{ price: plan.priceId, quantity: 1 }], client_reference_id: input.requestId,
          metadata: { integration: INTEGRATION, plan: plan.id, receipt_hash: receiptHash },
          adaptive_pricing: { enabled: false },
          success_url: `${config.siteOrigin}/payment/return?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.siteOrigin}${config.purchasePath}?checkout=cancelled`,
          // No customer/email supplied: hosted Checkout requires the buyer's email.
          // Payment methods are managed in Stripe, not hard-coded here.
        }, { idempotencyKey: `yz-checkout-v1:${input.requestId}` });
        if (session.livemode !== false || !SESSION_ID.test(session.id) || new URL(session.url).origin !== 'https://checkout.stripe.com') throw new Error('invalid_checkout_session');
        await repository.saveCheckout({ sessionId: session.id, requestId: input.requestId, receiptHash,
          planId: plan.id, priceId: plan.priceId, amount: plan.amount, currency: plan.currency, createdAt: new Date(now()).toISOString() });
        return respond(200, { url: session.url, sessionId: session.id });
      } catch { return respond(503, { error: 'checkout_unavailable' }); }
    }
    if (webhook && method === 'POST') {
      const raw = request.body;
      if ((!Buffer.isBuffer(raw) && typeof raw !== 'string') || Buffer.byteLength(raw) > 262144) return respond(400, { error: 'invalid_webhook' });
      let event;
      try { event = stripe.webhooks.constructEvent(raw, request.headers['stripe-signature'] || request.headers['Stripe-Signature'], config.webhookSecret); }
      catch { return respond(400, { error: 'invalid_webhook_signature' }); }
      if (event.livemode !== false) return respond(400, { error: 'test_mode_required' });
      if (event.type !== 'checkout.session.completed') return respond(200, { received: true });
      const session = event.data.object;
      if (session.metadata?.integration !== INTEGRATION) return respond(200, { received: true });
      if (session.payment_status !== 'paid') return respond(200, { received: true });
      const plan = config.plans.find(p => p.id === session.metadata.plan);
      const email = session.customer_details?.email?.trim().toLowerCase();
      if (!plan || session.livemode !== false || session.mode !== 'payment' || !SESSION_ID.test(session.id) || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || session.currency !== plan.currency || session.amount_total !== plan.amount || session.amount_subtotal !== plan.amount) return respond(400, { error: 'invalid_payment' });
      try {
        const previous = await repository.getPaid(session.id);
        if (previous) { await fulfill(previous); return respond(200, { received: true, duplicate: true }); }
        const checkout = await repository.getCheckout(session.id);
        if (!checkout || checkout.planId !== plan.id || checkout.receiptHash !== session.metadata.receipt_hash) return respond(400, { error: 'unknown_checkout' });
        const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
        const allowedPrices = checkout.priceId ? [checkout.priceId] : [plan.priceId, ...(plan.legacyPriceIds || [])];
        if (items.has_more || items.data.length !== 1 || items.data[0].quantity !== 1 || !allowedPrices.includes(items.data[0].price?.id)) return respond(400, { error: 'invalid_payment' });
        const payment = { sessionId: session.id, eventId: event.id,
          email, planId: plan.id, amount: plan.amount, currency: plan.currency,
          paymentIntentId: session.payment_intent, paidAt: new Date(event.created * 1000).toISOString() };
        const created = await repository.recordPaidOnce(payment);
        await fulfill(await repository.getPaid(session.id));
        return respond(200, { received: true, duplicate: !created });
      } catch { return respond(500, { error: 'payment_record_unavailable' }); }
    }
    if (url.pathname === '/v1/payments/status' && method === 'GET') {
      const id = url.searchParams.get('session_id');
      const token = String(request.headers.authorization || request.headers.Authorization || '').replace(/^Bearer /, '');
      if (!SESSION_ID.test(id || '') || !RECEIPT.test(token)) return respond(404, { error: 'checkout_not_found' });
      try {
        const checkout = await repository.getCheckout(id);
        if (!checkout || !safeEqual(checkout.receiptHash, hash(token))) return respond(404, { error: 'checkout_not_found' });
        const paid = await repository.getPaid(id);
        // Only a verified, stored webhook can authorize fulfillment/status.
        const issued = paid ? await fulfill(paid) : null;
        const mail = issued ? await repository.getMail(id) : null;
        const mailStatus = issued ? await repository.getMailStatus(id) : null;
        return respond(200, { status: paid ? 'paid' : 'pending', planId: checkout.planId,
          ...(issued ? { membership: { code: issued.code, expiresAt: issued.expiresAt, planName: issued.planName, renewed: issued.renewed }, emailStatus: mailStatus?.status === 'sent' ? 'sent' : (mail?.status || 'pending') } : {}) });
      } catch { return respond(503, { error: 'payment_status_unavailable' }); }
    }
    return respond(404, { error: 'not_found' });
  };
}
module.exports = { createPaymentApp };
