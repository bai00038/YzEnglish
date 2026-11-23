import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTtsRequest } from './tts-request.mjs';
const config = { voiceId: 'Kore', style: 'Podcast' };
test('Gemini receives only the exact phrase as transcript, with style in metadata', () => {
  const request = buildTtsRequest('Of course', config);
  assert.deepEqual(request.contents, [{ role: 'user', parts: [{ text: 'Of course', speechMetadata: { style: 'Podcast' } }] }]);
  assert.deepEqual(request.generationConfig, { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } });
});
test('currency, punctuation and line breaks remain verbatim', () => {
  const text = 'A $10 copay.\n"You\'re welcome!"';
  assert.equal(buildTtsRequest(text, config).contents[0].parts[0].text, text);
});
test('blank transcripts or missing voices cannot reach the API', () => {
  for (const text of ['', '  ', null]) assert.throws(() => buildTtsRequest(text, config));
  assert.throws(() => buildTtsRequest('Hello', { ...config, voiceId: '' }));
});
