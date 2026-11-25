import test from 'node:test';
import assert from 'node:assert/strict';
import { isDictationExactMatch, diffDictationWords } from '../../src/data/dictation.ts';
import { isBlankAnswerCorrect } from '../../src/data/dictation-blank.ts';

const equivalents = [
  ['Okay.', 'ok'], ['OK, see you tomorrow.', 'Okay, see you tomorrow!'],
  ['O.K.', 'okay'], ['All right.', 'alright'],
  ['My favourite colour is grey.', 'My favorite color is gray.'],
  ['Our neighbours cancelled the theatre trip.', 'Our neighbors canceled the theater trip.'],
  ['The centre is organising it.', 'The center is organizing it.'],
  ["I'm travelling.", 'I am traveling.'], ["Don't worry.", 'Do not worry.'],
  ['twenty-one', '21'], ['10:30', 'ten thirty'],
];
test('blank and full-sentence grading accept common equivalent written forms in both directions', () => {
  for (const [expected, input] of equivalents) {
    for (const [a, b] of [[expected, input], [input, expected]]) {
      assert.equal(isDictationExactMatch(a, b), true, `${a} / ${b}`);
      assert.equal(isBlankAnswerCorrect(a, b), true, `${a} / ${b}`);
      const diff = diffDictationWords(a, b);
      assert.ok([...diff.userTokens, ...diff.correctTokens].every(t => t.status === 'correct'));
      assert.equal(diff.userTokens.map(t => t.text).join(' '), b);
    }
  }
});
test('equivalent spelling stays correct when another word is wrong', () => {
  const diff = diffDictationWords('Okay, tomorrow.', 'ok today');
  assert.equal(diff.userTokens[0].status, 'correct');
  assert.equal(diff.userTokens[1].status, 'incorrect');
});
test('real spelling, missing words, negation and numeric differences remain incorrect', () => {
  for (const [a, b] of [['Okay', 'okey'], ['all right', 'right'], ['colour', 'colur'],
    ["don't", 'do'], ['1.5', '15'], ['bite down', 'bite'], ['Okay', '']]) {
    assert.equal(isDictationExactMatch(a, b), false, `${a} / ${b}`);
    assert.equal(isBlankAnswerCorrect(a, b), false, `${a} / ${b}`);
  }
});
