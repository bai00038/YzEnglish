const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Stripe = require('stripe');
const { loadMailConfig, buildSignedRequest, sendMail } = require('../src/payment-mail-send.cjs');
const { createPaymentApp } = require('../src/payments.cjs');
const { loadPaymentConfig } = require('../src/payments-config.cjs');
const { MemoryPaymentRepository } = require('../src/payments-repository.cjs');

const mailEnv = {
  DIRECTMAIL_ACCOUNT_NAME: 'code@mail.learnyzenglish.com',
  DIRECTMAIL_ACCESS_KEY_ID: 'LTAI_test_fixture',
  DIRECTMAIL_ACCESS_KEY_SECRET: 'test_secret_fixture',
};
const sampleMail = { to: 'buyer@example.com', subject: 'Yz English 会员码', text: 'plain body', html: '<p>html body</p>' };

test('mail config is fail-closed: null until account and key pair are all set', () => {
  assert.equal(loadMailConfig({}), null);
  assert.equal(loadMailConfig({ DIRECTMAIL_ACCOUNT_NAME: 'a@b.c' }), null);
  assert.equal(loadMailConfig({ DIRECTMAIL_ACCOUNT_NAME: 'a@b.c', DIRECTMAIL_ACCESS_KEY_ID: 'id' }), null);
  const config = loadMailConfig(mailEnv);
  assert.equal(config.accountName, 'code@mail.learnyzenglish.com');
  assert.equal(config.fromAlias, 'Yz English');
  assert.equal(config.endpoint, 'https://dm.ap-southeast-1.aliyuncs.com/');
  assert.equal(config.regionId, 'ap-southeast-1');
  const custom = loadMailConfig({ ...mailEnv, DIRECTMAIL_FROM_ALIAS: 'YZ', DIRECTMAIL_REGION_ID: 'cn-hangzhou' });
  assert.equal(custom.fromAlias, 'YZ');
  assert.equal(custom.regionId, 'cn-hangzhou');
});

test('signed request carries the SingleSendMail parameters and a valid HMAC-SHA1 signature', () => {
  const config = loadMailConfig(mailEnv);
  const now = new Date('2026-11-25T17:00:00.000Z');
  const { url, body } = buildSignedRequest(sampleMail, config, { now, nonce: 'fixed-nonce-1' });
  assert.equal(url, config.endpoint);
  const params = Object.fromEntries(new URLSearchParams(body));
  assert.equal(params.Action, 'SingleSendMail');
  assert.equal(params.AccountName, 'code@mail.learnyzenglish.com');
  assert.equal(params.ToAddress, 'buyer@example.com');
  assert.equal(params.Subject, 'Yz English 会员码');
  assert.equal(params.AddressType, '1');
  assert.equal(params.Timestamp, '2026-11-25T17:00:00Z');
  const { Signature, ...unsigned } = params;
  const encode = value => encodeURIComponent(String(value)).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~');
  const canonical = Object.keys(unsigned).sort().map(key => `${encode(key)}=${encode(unsigned[key])}`).join('&');
  const expected = crypto.createHmac('sha1', `${mailEnv.DIRECTMAIL_ACCESS_KEY_SECRET}&`)
    .update(`POST&${encode('/')}&${encode(canonical)}`).digest('base64');
  assert.equal(Signature, expected);
});

test('sendMail resolves on success and throws on a DirectMail error response', async () => {
  const config = loadMailConfig(mailEnv);
  const okFetch = async () => ({ ok: true, status: 200, json: async () => ({ EnvId: 'env-1', RequestId: 'r-1' }) });
  assert.equal((await sendMail(sampleMail, config, okFetch)).EnvId, 'env-1');
  const badFetch = async () => ({ ok: false, status: 400, json: async () => ({ Code: 'InvalidToAddress', Message: 'bad' }) });
  await assert.rejects(() => sendMail(sampleMail, config, badFetch), /directmail_send_failed:InvalidToAddress/);
});

// --- Integration with the payment flow (harness mirrors payments.test.cjs) ---
const secret = 'whsec_local_test_fixture';
const baseConfig = loadPaymentConfig({ STRIPE_SECRET_KEY: 'sk_test_local_fixture', STRIPE_WEBHOOK_SECRET: secret,
  STRIPE_PRICE_YEAR_ID: 'price_testYear', STRIPE_PRICE_TWO_YEAR_ID: 'price_testTwoYear' });
function setup(mailSender) {
  const config = structuredClone(baseConfig);
  const repository = new MemoryPaymentRepository(), requests = [];
  const sessionId = 'cs_test_checkoutFixture123';
  const stripe = { prices: { retrieve: async id => { const plan = config.plans.find(p => p.priceId === id); return { livemode: false, active: true, type: 'one_time', currency: plan.currency, unit_amount: plan.amount }; } },
    checkout: { sessions: { create: async (input, options) => { requests.push({ input, options }); return { id: sessionId, livemode: false, url: `https://checkout.stripe.com/c/pay/${sessionId}` }; },
      listLineItems: async () => ({ data: [{ quantity: 1, price: { id: requests[0].input.line_items[0].price } }] }) } }, webhooks: Stripe.webhooks };
  const app = createPaymentApp({ stripe, repository, config, codePepper: 'unit-pepper-at-least-32-characters-long',
    mailConfig: loadMailConfig(mailEnv), mailSender });
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
  const status = () => req(`/v1/payments/status?session_id=${sessionId}`, 'GET', undefined, { authorization: `Bearer ${receiptToken}` });
  return { repository, checkout, event, hook, status };
}
const body = response => JSON.parse(response.body);

test('configured transport sends the code mail once and status reports sent', async () => {
  const sent = [];
  const f = setup(async mail => { sent.push(mail); });
  await f.checkout();
  assert.equal((await f.hook(f.event())).statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'buyer@example.com');
  assert.match(sent[0].subject, /会员码/);
  assert.equal(body(await f.status()).emailStatus, 'sent');
  assert.equal(body(await f.status()).emailStatus, 'sent');
  assert.equal(sent.length, 1);
});

test('transport failure keeps the issued code and never reports sent', async () => {
  const f = setup(async () => { throw new Error('directmail_send_failed:Throttling'); });
  await f.checkout();
  assert.equal((await f.hook(f.event())).statusCode, 200);
  const result = body(await f.status());
  assert.equal(result.status, 'paid');
  assert.match(result.membership.code, /^YZ-/);
  assert.equal(result.emailStatus, 'pending_configuration');
  assert.equal((await f.repository.getMailStatus('cs_test_checkoutFixture123')), null);
});
