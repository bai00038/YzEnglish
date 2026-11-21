const test = require('node:test');
const assert = require('node:assert/strict');
const { OssMembershipRepository } = require('../src/repository.cjs');
test('OSS atomic append retries a simultaneous device update and preserves both records', async () => {
  let content = Buffer.from(''); let conflict = false;
  const client = {
    async get() { if (!content.length) throw Object.assign(new Error('missing'), { status: 404 }); return { content: Buffer.from(content) }; },
    async append(key, data, options) {
      assert.match(key, /_private\/membership\/learning\/hash\.jsonl$/);
      if (+options.position !== content.length) { conflict = true; throw Object.assign(new Error('conflict'), { status: 409, code: 'PositionNotEqualToLength' }); }
      content = Buffer.concat([content, data]);
    },
  };
  const repository = new OssMembershipRepository(client);
  await Promise.all([repository.updateLearning('hash', { type: 'learn', entryId: 'word-one' }, 'a'), repository.updateLearning('hash', { type: 'learn', entryId: 'word-two' }, 'b')]);
  assert.equal(conflict, true);
  assert.deepEqual((await repository.getLearning('hash')).learned, ['word-one', 'word-two']);
  await repository.updateLearning('hash', { type: 'unlearn', entryId: 'word-one' }, 'b');
  assert.deepEqual((await repository.getLearning('hash')).learned, ['word-two']);
});
