export function comparableTranscript(value) {
  return value.toLowerCase().replace(/donuts/g, 'doughnuts').replace(/donut/g, 'doughnut')
    .replace(/[^\p{L}\p{N}$]/gu, '');
}
export function selectTargetRange(words, expected, duration) {
  if (!words.length || !Number.isFinite(duration) || duration <= 0) throw new Error('Missing valid word timing');
  const target = comparableTranscript(expected);
  for (let i = 0; i < words.length; i++) {
    if (comparableTranscript(words.slice(i).map(w => w.text).join(' ')) !== target) continue;
    const first = words[i], last = words.at(-1);
    if (![first.start, last.end].every(Number.isFinite) || first.start < 0 || last.end <= first.start || last.end > duration + .15) throw new Error('Invalid target timing');
    if (i === 0) return { start: 0, end: duration, kept: true };
    const prefix = words.slice(0, i).map(w => w.text).join(' ');
    if (!/podcast|speak only|following english|introduction|commentary/i.test(prefix)) throw new Error('Unrecognized extra speech before target');
    const previousEnd = words[i - 1].end;
    if (!Number.isFinite(previousEnd) || first.start - previousEnd < .18) throw new Error('Target boundary too close to preceding speech');
    return { start: Math.max(0, first.start - Math.min(.14, (first.start - previousEnd) * .4)), end: Math.min(duration, last.end + .22), kept: false };
  }
  throw new Error('Transcript has no exact target-only suffix');
}
