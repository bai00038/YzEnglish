import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERSHIP_CODE_STORAGE_KEY, saveMembershipDisplayCode, readMembershipDisplayCode, maskMembershipDisplayCode, maskMembershipCardCode } from '../../src/app/components/membership-code-display.ts';

const membership = { type: 'year', expiresAt: '2040-01-01T00:00:00Z', unlockedAt: '2039-01-01T00:00:00Z' };
for (const [code, masked] of [['YZ-Y-ABCD-EFGH', 'YZ-Y-••••••'], ['YZ-TEST-ABCD-EFGH', 'YZ-TEST-••••••'], ['YZ-ABCDEFGH', 'YZ-••••••']]) {
  test(`masks the random portion of ${code.split('-').slice(0, 2).join('-')}`, () => assert.equal(maskMembershipDisplayCode(code), masked));
}

test('the display record preserves the entire code for reveal/copy and normalizes input', () => {
  const storage = new Map();
  saveMembershipDisplayCode(' yz-y-abcd-efgh ', membership, { setItem: (key, value) => storage.set(key, value) });
  const code = readMembershipDisplayCode(storage.get(MEMBERSHIP_CODE_STORAGE_KEY), membership);
  assert.equal(code, 'YZ-Y-ABCD-EFGH');
  assert.notEqual(code, maskMembershipDisplayCode(code));
});

test('an unrelated membership or corrupt record does not expose a stale code', () => {
  const record = JSON.stringify({ code: 'YZ-Y-ABCD-EFGH', ...membership });
  assert.equal(readMembershipDisplayCode(record, { ...membership, type: 'month' }), '');
  assert.equal(readMembershipDisplayCode(record, { ...membership, expiresAt: '2041-01-01' }), '');
  for (const raw of ['', 'bad', '{}', 'null']) assert.equal(readMembershipDisplayCode(raw, membership), '');
});

test('compact card mask reveals only the final four characters', () => {
  assert.equal(maskMembershipCardCode('YZ-Y-ABCDEF-3F8K'), 'YZ-••••-••••-3F8K');
  assert.equal(maskMembershipCardCode('YZ-TEST-ABCDEF-3F8K'), 'YZ-••••-••••-3F8K');
});
