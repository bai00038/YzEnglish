const crypto = require('node:crypto');
const { createTestPool, allocate, membershipRecord } = require('./payment-issuance.cjs');

class MemoryPaymentRepository {
  constructor() { this.checkouts = new Map(); this.paid = new Map(); this.pool = createTestPool(); this.issued = []; this.outbox = new Map(); }
  async issuePaid(payment, plan, pepper) {
    const result = allocate(this.pool, this.issued, payment, plan, pepper);
    if (!result.duplicate) this.issued.push(result.record);
    return structuredClone(result.record);
  }
  async getIssued(id) { return structuredClone(this.issued.find(e => e.sessionId === id) || null); }
  async getIssuedCode(hash) { return membershipRecord(this.issued, hash); }
  async saveMail(record) { if (!this.outbox.has(record.sessionId)) this.outbox.set(record.sessionId, structuredClone(record)); }
  async getMail(id) { return structuredClone(this.outbox.get(id) || null); }
  async saveCheckout(record) {
    const prior = this.checkouts.get(record.sessionId);
    if (prior && prior.receiptHash !== record.receiptHash) throw new Error('checkout_conflict');
    if (!prior) this.checkouts.set(record.sessionId, structuredClone(record));
  }
  async getCheckout(id) { return structuredClone(this.checkouts.get(id) || null); }
  async getPaid(id) { return structuredClone(this.paid.get(id) || null); }
  async recordPaidOnce(record) {
    if (this.paid.has(record.sessionId)) return false;
    this.paid.set(record.sessionId, structuredClone(record)); return true;
  }
}
class OssPaymentRepository {
  constructor(client, prefix) { this.client = client; this.prefix = prefix.replace(/^\/+|\/+$/g, ''); }
  key(kind, id) { return `${this.prefix}/${kind}/${crypto.createHash('sha256').update(id).digest('hex')}.json`; }
  async read(kind, id) {
    try { const result = await this.client.get(this.key(kind, id)); return JSON.parse(result.content.toString('utf8')); }
    catch (error) { if (error.status === 404 || error.code === 'NoSuchKey') return null; throw error; }
  }
  async create(kind, record) {
    try {
      await this.client.put(this.key(kind, record.sessionId), Buffer.from(JSON.stringify(record)), { headers: {
        'x-oss-forbid-overwrite': 'true', 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      } });
      return true;
    } catch (error) { if (error.status === 409 && error.code === 'FileAlreadyExists') return false; throw error; }
  }
  async saveCheckout(record) {
    if (await this.create('checkouts', record)) return;
    const previous = await this.getCheckout(record.sessionId);
    if (!previous || previous.receiptHash !== record.receiptHash) throw new Error('checkout_conflict');
  }
  getCheckout(id) { return this.read('checkouts', id); }
  getPaid(id) { return this.read('paid', id); }
  async readIssuance() {
    try {
      const result = await this.client.get(`${this.prefix}/issuance.jsonl`);
      return { events: result.content.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)), position: result.content.length };
    } catch (error) {
      if (error.status === 404 || error.code === 'NoSuchKey') return { events: [], position: 0 };
      throw error;
    }
  }
  async pool() {
    let record = await this.read('pool', 'staging-code-pool-v1');
    if (!record) {
      await this.create('pool', { sessionId: 'staging-code-pool-v1', codes: createTestPool() });
      record = await this.read('pool', 'staging-code-pool-v1');
    }
    return record.codes;
  }
  async issuePaid(payment, plan, pepper) {
    const pool = await this.pool();
    for (let attempt = 0; attempt < 12; attempt++) {
      const { events, position } = await this.readIssuance();
      const result = allocate(pool, events, payment, plan, pepper);
      if (result.duplicate) return result.record;
      try {
        // AppendObject's byte-position condition makes allocation, email binding,
        // renewal and session idempotency one durable atomic transaction.
        await this.client.append(`${this.prefix}/issuance.jsonl`, Buffer.from(JSON.stringify(result.record) + '\n'), {
          position: String(position), headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
        });
        return result.record;
      } catch (error) {
        if (error.status !== 409 || !['PositionNotEqualToLength', 'ObjectAlreadyExists'].includes(error.code)) throw error;
      }
    }
    throw new Error('issuance_conflict');
  }
  async getIssued(id) { return (await this.readIssuance()).events.find(e => e.sessionId === id) || null; }
  async getIssuedCode(hash) { return membershipRecord((await this.readIssuance()).events, hash); }
  async saveMail(record) { await this.create('outbox', record); }
  getMail(id) { return this.read('outbox', id); }
  // A conditional OSS create, rather than a process-local Set, arbitrates
  // concurrent webhook workers and survives function restarts.
  recordPaidOnce(record) { return this.create('paid', record); }
}
module.exports = { MemoryPaymentRepository, OssPaymentRepository };
