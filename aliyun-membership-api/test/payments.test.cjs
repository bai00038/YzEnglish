const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Stripe = require('stripe');
const { createPaymentApp } = require('../src/payments.cjs');
const { loadPaymentConfig } = require('../src/payments-config.cjs');
const { MemoryPaymentRepository, OssPaymentRepository } = require('../src/payments-repository.cjs');
const secret = 'whsec_local_test_fixture';
const baseConfig = loadPaymentConfig({ STRIPE_SECRET_KEY: 'sk_test_local_fixture', STRIPE_WEBHOOK_SECRET: secret,
  STRIPE_PRICE_YEAR_ID: 'price_testYear', STRIPE_PRICE_TWO_YEAR_ID: 'price_testTwoYear' });
function setup() {
  const config = structuredClone(baseConfig);
  const repository = new MemoryPaymentRepository(), requests = [];
  const sessionId = 'cs_test_checkoutFixture123';
  const stripe = { prices: { retrieve: async id => { const plan = config.plans.find(p => p.priceId === id); return { livemode: false, active: true, type: 'one_time', currency: plan.currency, unit_amount: plan.amount }; } },
    checkout: { sessions: { create: async (input, options) => { requests.push({ input, options }); return { id: sessionId, livemode: false, url: `https://checkout.stripe.com/c/pay/${sessionId}` }; },
      listLineItems: async () => ({ data: [{ quantity: 1, price: { id: requests[0].input.line_items[0].price } }] }) } }, webhooks: Stripe.webhooks };
  const app = createPaymentApp({ stripe, repository, config, codePepper: "unit-pepper-at-least-32-characters-long" });
  const requestId = crypto.randomUUID(), receiptToken = crypto.randomBytes(32).toString('base64url');
  const req = (path, method = 'GET', body, headers = {}) => app({ path, method, body, ip: 'fixture-ip', headers: { origin: config.siteOrigin, ...headers } });
  const checkout = () => req('/v1/payments/checkout', 'POST', JSON.stringify({ planId: 'two_year', requestId, receiptToken }));
  const event = () => ({ id: 'evt_unit_fixture', type: 'checkout.session.completed', livemode: false, created: Math.floor(Date.now() / 1000), data: { object: {
    id: sessionId, mode: 'payment', livemode: false, payment_status: 'paid', currency: 'cny', amount_total: 24900, amount_subtotal: 24900,
    payment_intent: 'pi_unit_fixture', customer_details: { email: ' Buyer@Example.com ' }, metadata: requests[0].input.metadata } } });
  const hook = e => {
    const payload = JSON.stringify(e), signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    return req('/v1/payments/webhook', 'POST', Buffer.from(payload), { origin: undefined, 'stripe-signature': signature });
  };
  return { repository, stripe, requests, sessionId, req, checkout, event, hook, receiptToken, requestId, config };
}
const body = response => JSON.parse(response.body);
test('configuration requires test keys, distinct prices and staging origin', () => {
  const env = { STRIPE_SECRET_KEY: 'sk_test_local_fixture', STRIPE_WEBHOOK_SECRET: secret, STRIPE_PRICE_YEAR_ID: 'price_year', STRIPE_PRICE_TWO_YEAR_ID: 'price_twoYear' };
  assert.equal(loadPaymentConfig({}), null);
  assert.throws(() => loadPaymentConfig({ ...env, STRIPE_SECRET_KEY: 'sk_live_not_allowed' }));
  assert.throws(() => loadPaymentConfig({ ...env, PAYMENTS_SITE_ORIGIN: 'https://learnyzenglish.com' }));
  assert.throws(() => loadPaymentConfig({ ...env, STRIPE_PRICE_TWO_YEAR_ID: 'price_year' }));
  assert.throws(() => loadPaymentConfig({ ...env, STRIPE_WEBHOOK_SECRET: '' }));
  assert.deepEqual(loadPaymentConfig(env).plans.map(p => [p.amount, p.years, p.currency]), [[14900, 1, 'cny'], [24900, 2, 'cny']]);
});
test('Checkout uses configured one-time CNY price and stable idempotency; email is collected on hosted page', async () => {
  const f = setup();assert.equal((await f.checkout()).statusCode, 200);await f.checkout();
  const { input, options } = f.requests[0];
  assert.equal(input.mode, 'payment');assert.deepEqual(input.line_items, [{ price: 'price_testTwoYear', quantity: 1 }]);
  assert.equal(input.customer_email, undefined);assert.equal(input.payment_method_types, undefined);assert.equal(input.wallet_options, undefined);assert.equal(input.allow_promotion_codes, undefined);
  assert.equal(input.adaptive_pricing.enabled, false);assert.equal(options.idempotencyKey, f.requests[1].options.idempotencyKey);
  assert.ok(input.cancel_url.includes('checkout=cancelled'));assert.ok(input.success_url.includes('{CHECKOUT_SESSION_ID}'));
  assert.equal(await f.repository.getPaid(f.sessionId), null);
  assert.ok(!JSON.stringify(await f.req('/v1/payments/plans')).includes('price_test'));
});
test('client amount, unknown plan, unapproved origin and invalid Stripe price cannot override config', async () => {
  const f = setup();
  assert.equal((await f.req('/v1/payments/checkout', 'POST', JSON.stringify({ planId: 'free', requestId: f.requestId, receiptToken: f.receiptToken }))).statusCode, 400);
  assert.equal((await f.req('/v1/payments/checkout', 'POST', '{}', { origin: 'https://other.invalid' })).statusCode, 403);
  f.stripe.prices.retrieve = async () => ({ active: true, livemode: false, type: 'one_time', currency: 'cny', unit_amount: 1 });
  assert.equal((await f.checkout()).statusCode, 503);assert.equal(f.requests.length, 0);
});
test('valid raw signature is required; parsed/reformatted payload and unsigned webhook do not create paid records', async () => {
  const f = setup();await f.checkout();const event = f.event();
  assert.equal((await f.req('/v1/payments/webhook', 'POST', JSON.stringify(event), { 'stripe-signature': 'invalid' })).statusCode, 400);
  assert.equal((await f.req('/v1/payments/webhook', 'POST', event)).statusCode, 400);
  const payload = JSON.stringify(event), signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal((await f.req('/v1/payments/webhook', 'POST', payload + ' ', { 'stripe-signature': signature })).statusCode, 400);
  assert.equal(await f.repository.getPaid(f.sessionId), null);
});
test('concurrent/replayed completed events create only one durable paid session, with normalized delivery email', async () => {
  const f = setup();await f.checkout();const e = f.event();
  const responses = await Promise.all(Array.from({ length: 8 }, () => f.hook(e)));
  assert.equal(responses.filter(r => body(r).duplicate === false).length, 1);
  assert.equal(f.repository.paid.size, 1);assert.equal((await f.repository.getPaid(f.sessionId)).email, 'buyer@example.com');
  const replay = await f.hook({ ...e, id: 'evt_another_same_session' });assert.equal(body(replay).duplicate, true);
});
test('unpaid, live, wrong amount, wrong price, missing email or unknown checkout never confirms payment', async () => {
  for (const kind of ['unpaid', 'live', 'amount', 'price', 'email', 'unknown']) {
    const f = setup();await f.checkout();const e = f.event(), s = e.data.object;
    if (kind === 'unpaid') s.payment_status = 'unpaid';
    if (kind === 'live') e.livemode = true;
    if (kind === 'amount') s.amount_total = 1;
    if (kind === 'price') f.stripe.checkout.sessions.listLineItems = async () => ({ data: [{ quantity: 1, price: { id: 'price_wrong' } }] });
    if (kind === 'email') s.customer_details.email = '';
    if (kind === 'unknown') s.metadata.receipt_hash = 'wrong';
    await f.hook(e);assert.equal(await f.repository.getPaid(f.sessionId), null, kind);
  }
});
test('return URL alone cannot mark paid or reveal orders; status requires the receipt token and exposes no email', async () => {
  const f = setup();await f.checkout();const path = `/v1/payments/status?session_id=${f.sessionId}`;
  assert.equal((await f.req(path)).statusCode, 404);
  const headers = { authorization: `Bearer ${f.receiptToken}` };
  assert.equal(body(await f.req(path, 'GET', undefined, headers)).status, 'pending');
  await f.hook(f.event());const result = await f.req(path, 'GET', undefined, headers);
  assert.equal(body(result).status, 'paid');assert.equal(body(result).email, undefined);assert.equal(body(result).code, undefined);assert.match(body(result).membership.code, /^YZ-Y-/);assert.equal(body(result).emailStatus, 'pending_configuration');
});
test('storage failure makes webhook retryable, and retry then confirms once', async () => {
  const f = setup();await f.checkout();const original = f.repository.recordPaidOnce.bind(f.repository);let failures = 1;
  f.repository.recordPaidOnce = record => { if (failures--) throw new Error('storage_down'); return original(record); };
  assert.equal((await f.hook(f.event())).statusCode, 500);assert.equal(await f.repository.getPaid(f.sessionId), null);
  assert.equal((await f.hook(f.event())).statusCode, 200);assert.equal(f.repository.paid.size, 1);
});
test('OSS paid record uses atomic create-if-absent across independent repository instances', async () => {
  const data = new Map();const client = { put: async (key, value, opts) => {
    assert.equal(opts.headers['x-oss-forbid-overwrite'], 'true');
    if (data.has(key)) throw Object.assign(new Error('exists'), { status: 409, code: 'FileAlreadyExists' });data.set(key, value);
  }, get: async key => ({ content: data.get(key) }) };
  const a = new OssPaymentRepository(client, '_private/payments-staging'), b = new OssPaymentRepository(client, '_private/payments-staging');
  const record = { sessionId: 'cs_test_atomic_fixture', email: 'fixture@example.com' };
  assert.deepEqual((await Promise.all([a.recordPaidOnce(record), b.recordPaidOnce(record)])).sort(), [false, true]);
  assert.equal(data.size, 1);assert.equal((await b.getPaid(record.sessionId)).email, record.email);
});

test('price rotation preserves outstanding checkouts, including pre-snapshot legacy sessions', async () => {
  for (const legacy of [false, true]) {
    const f = setup();await f.checkout();
    const plan = f.config.plans.find(p => p.id === 'two_year');
    const old = plan.priceId;plan.priceId = 'price_newDurationTwoYear';plan.legacyPriceIds = [old];
    if (legacy) delete f.repository.checkouts.get(f.sessionId).priceId;
    assert.equal((await f.hook(f.event())).statusCode, 200);
    assert.ok(await f.repository.getIssued(f.sessionId));
    const publicPlans = body(await f.req('/v1/payments/plans')).plans;
    assert.ok(publicPlans.every(p => !('legacyPriceIds' in p) && !('priceId' in p)));
  }
});
