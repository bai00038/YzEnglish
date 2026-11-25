const crypto = require('node:crypto');
const { keyedHash } = require('./security.cjs');
const { deviceLimit: DEVICE_LIMIT } = require('../config/membership.json');

// A finite, private staging pool. Never use these codes or this ledger in production.
function createTestPool(size = 100) {
  return Array.from({ length: size }, () => `YZ-Y-${crypto.randomBytes(12).toString('hex').toUpperCase()}`);
}
function addYears(value, years) {
  const date = new Date(value), month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + years);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString();
}
function allocate(pool, events, payment, plan, pepper) {
  const issued = events.filter(e => e.kind === 'issued');
  const prior = issued.find(e => e.sessionId === payment.sessionId);
  if (prior) return { record: prior, duplicate: true };
  const previous = issued.filter(e => e.email === payment.email).at(-1);
  const used = new Set(issued.map(e => e.code));
  const code = previous?.code || pool.find(code => !used.has(code));
  if (!code) throw new Error('code_pool_exhausted');
  const base = Math.max(Date.parse(payment.paidAt), previous ? Date.parse(previous.expiresAt) : 0);
  return { duplicate: false, record: { kind: 'issued', sessionId: payment.sessionId,
    email: payment.email, code, codeHash: keyedHash(pepper, code), planId: plan.id, planName: plan.name,
    expiresAt: addYears(base, plan.years), paidAt: payment.paidAt, renewed: Boolean(previous) } };
}
function membershipRecord(events, codeHash) {
  const record = events.filter(e => e.kind === 'issued' && e.codeHash === codeHash).at(-1);
  return record ? { type: 'year', planName: record.planName, expiresAt: record.expiresAt, maxDevices: DEVICE_LIMIT, disabled: false, createdAt: record.paidAt } : null;
}
module.exports = { createTestPool, allocate, membershipRecord, addYears };
