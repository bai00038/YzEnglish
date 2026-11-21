import test from 'node:test';
import assert from 'node:assert/strict';
import { dictationRevealDelta } from '../../src/app/hooks/dictation-viewport.ts';
const rect = (top, height) => ({ top, bottom: top + height, height });
test('keyboard opening reveals a covered input; Safari panning uses its latest offset', () => {
  for (const offset of [0, 80, 160]) {
    const input = rect(700, 44);
    const delta = dictationRevealDelta(input, offset, 320);
    assert.ok(input.top - delta >= offset + 56);
    assert.ok(input.bottom - delta <= offset + 320 - 20);
  }
});
test('a second Safari pan rechecks visibility without a viewport resize', () => {
  const input = rect(160, 44);
  assert.equal(dictationRevealDelta(input, 0, 320), 0);
  const delta = dictationRevealDelta(input, 160, 320);
  assert.ok(delta < 0);
  assert.ok(input.top - delta >= 216);
});
test('only the blank determines the correction; visible blanks do not jump', () => {
  const input = rect(700, 44);
  const delta = dictationRevealDelta(input, 0, 320);
  assert.equal(delta, 544);
  assert.ok(input.top - delta >= 56);
  assert.ok(input.bottom - delta <= 300);
  assert.equal(dictationRevealDelta(rect(100, 44), 0, 320), 0);
});
