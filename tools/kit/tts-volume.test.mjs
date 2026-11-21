import test from 'node:test';
import assert from 'node:assert/strict';
import { connectTtsBoost } from '../../src/data/tts-volume.ts';

test('core-expression boost adds about 5dB with peak compression and disconnects all nodes', () => {
  const connections = [];
  const disconnected = [];
  const node = name => ({ connect: next => connections.push([name, next]), disconnect: () => disconnected.push(name) });
  const gain = { ...node('gain'), gain: { value: 1 } };
  const limiter = { ...node('limiter'), ...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(key => [key,{ value: 0 }])) };
  const source = node('source');
  const destination = {};
  const audio = {};
  const cleanup = connectTtsBoost({ createGain: () => gain, createDynamicsCompressor: () => limiter, createMediaElementSource: value => { assert.equal(value,audio); return source; }, destination },audio);
  assert.ok(20*Math.log10(gain.gain.value)>5 && 20*Math.log10(gain.gain.value)<5.2);
  assert.equal(limiter.threshold.value,-3);
  assert.equal(limiter.ratio.value,20);
  assert.deepEqual(connections,[['source',gain],['gain',limiter],['limiter',destination]]);
  cleanup();
  assert.deepEqual(disconnected,['source','gain','limiter']);
});
