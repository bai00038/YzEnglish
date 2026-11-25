const test = require('node:test');
const assert = require('node:assert/strict');
const { OssPaymentRepository } = require('../src/payments-repository.cjs');
const { allocate, addYears } = require('../src/payment-issuance.cjs');
const { membershipMail } = require('../src/payment-mail.cjs');
const { createApp } = require('../src/app.cjs');
const { MemoryMembershipRepository } = require('../src/repository.cjs');
const { keyedHash } = require('../src/security.cjs');
const pepper = 'issuance-test-pepper-with-at-least-32-characters';
const year = { id: 'year', name: '年卡', years: 1 };
const payment = (sessionId, email = 'buyer@example.com') => ({ sessionId, email, paidAt: '2026-11-23T12:00:00Z' });
function storage() {
  const data = new Map();
  const conflict = () => Object.assign(new Error('conflict'), { status: 409, code: 'PositionNotEqualToLength' });
  return { data, get: async key => { if (!data.has(key)) throw Object.assign(new Error('missing'), { status: 404 }); return { content: data.get(key) }; },
    put: async (key, value) => { if (data.has(key)) throw Object.assign(new Error('exists'), { status: 409, code: 'FileAlreadyExists' }); data.set(key, value); },
    append: async (key, value, opts) => { const current = data.get(key) || Buffer.alloc(0); if (current.length !== Number(opts.position)) throw conflict(); data.set(key, Buffer.concat([current, value])); },
  };
}
test('separate OSS workers allocate once per session and renew one email without changing code', async () => {
  const client = storage(), a = new OssPaymentRepository(client, '_private/payments-staging'), b = new OssPaymentRepository(client, '_private/payments-staging');
  const records = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? a : b).issuePaid(payment('cs_test_same'), year, pepper)));
  assert.equal(new Set(records.map(r => r.code)).size, 1); assert.equal((await a.readIssuance()).events.length, 1);
  const renewed = await b.issuePaid(payment('cs_test_renew'), { id: 'two_year', name: '双年卡', years: 2 }, pepper);
  assert.equal(renewed.code, records[0].code); assert.equal(renewed.expiresAt, '2029-11-23T12:00:00.000Z');
  const replay = await a.issuePaid(payment('cs_test_renew'), year, pepper); assert.equal(replay.expiresAt, renewed.expiresAt);
  assert.equal((await b.getIssuedCode(keyedHash(pepper, renewed.code))).expiresAt, renewed.expiresAt);
  const other = await a.issuePaid(payment('cs_test_other', 'another@example.com'), year, pepper); assert.notEqual(other.code, renewed.code);
});
test('renewing an expired code starts from payment date; leap-year anniversaries clamp to February', () => {
  const first = allocate(['YZ-Y-TESTCODE'], [], { ...payment('old'), paidAt: '2020-02-29T12:00:00Z' }, year, pepper).record;
  assert.equal(first.expiresAt, '2021-02-28T12:00:00.000Z');
  assert.equal(allocate([], [first], payment('new'), year, pepper).record.expiresAt, '2027-11-23T12:00:00.000Z');
  assert.equal(addYears('2024-02-29T00:00:00Z', 2), '2026-02-28T00:00:00.000Z');
  assert.throws(() => allocate([], [], payment('sold_out'), year, pepper), /code_pool_exhausted/);
});
test('issued code works with the existing membership redeem and three-device rules', async () => {
  const payments = new OssPaymentRepository(storage(), '_private/payments-staging');
  const issued = await payments.issuePaid(payment('cs_test_redeem'), year, pepper);
  const membership = new MemoryMembershipRepository(); membership.getCode = hash => payments.getIssuedCode(hash);
  const app = createApp({ repository: membership, config: { codePepper: pepper, sessionSecret: pepper, allowedOrigins: ['https://staging.learnyzenglish.com'] }, now: () => Date.parse('2026-11-24T00:00:00Z') });
  const request = () => app({ path: '/v1/membership/redeem', method: 'POST', headers: {}, ip: 'fixture', body: JSON.stringify({ code: issued.code }) });
  assert.equal((await request()).statusCode, 200); assert.equal((await request()).statusCode, 200); assert.equal((await request()).statusCode, 200); assert.equal((await request()).statusCode, 409);
});
test('mail follows demo structure and is durable pending configuration without pretending delivery', async () => {
  const repo = new OssPaymentRepository(storage(), '_private/payments-staging');
  const issued = await repo.issuePaid(payment('cs_test_mail'), year, pepper);
  const mail = membershipMail(issued, 'https://staging.learnyzenglish.com'); await repo.saveMail(mail); await repo.saveMail(mail);
  assert.equal((await repo.getMail(issued.sessionId)).status, 'pending_configuration'); assert.equal(mail.sentAt, null);
  assert.equal(mail.subject, '你的会员码');
  for (const copy of ['欢迎加入', issued.code, '年卡', '我的学习', '去输入会员码', '3 台设备', '联系我们']) assert.ok(mail.html.includes(copy));
  assert.ok(mail.html.includes('/my-learning#membership-code=')); assert.ok(!mail.html.includes('<script'));
});
