import type { KitEntry } from './kit';
import { findKitWordMatches } from './kit-word-matches.ts';
import { isDictationExactMatch } from './dictation.ts';

export interface DictationBlank { start: number; end: number; answer: string; source?: 'chunk' | 'word'; entryId?: string }
const stopwords = new Set(`a an the i me my mine myself you your yours yourself he him his himself she her hers herself it its itself we us our ours ourselves they them their theirs themselves this that these those who whom whose which what where when why how is am are was were be been being have has had having do does did doing can could may might must shall should will would ought to of in on at by for from with without about into onto over under up down out off through as than and or but so if then because while until although not no yes please here there just very too also only some any all each every both either neither such other another one two i'm i've i'll i'd you're you've you'll you'd he's she's it's we're we've they're they've don't doesn't didn't isn't aren't wasn't weren't can't couldn't won't wouldn't shouldn't let's that's thanks okay ok well right now`.split(/\s+/));

export function chooseDictationBlank(text: string, sceneId: string, anchorStart: number | undefined, entries: KitEntry[]): DictationBlank {
  // Search each tier separately so an overlapping word cannot hide a chunk.
  for (const kind of ['chunk', 'word'] as const) {
    const matches = findKitWordMatches(text, sceneId, anchorStart, entries, [kind]);
    const match = matches.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start)[0];
    if (match) return { start: match.start, end: match.end, answer: text.slice(match.start, match.end), source: kind, entryId: match.entry.id };
  }
  const tokens = [...text.matchAll(/[a-z]+(?:['’][a-z]+)?|\d+(?:[.:]\d+)*/gi)];
  const content = tokens.filter(token => !stopwords.has(token[0].toLowerCase().replace(/’/g, "'")));
  // Even a short all-function-word reply ("Yes, please.") needs one blank.
  const token = (content.length ? content : tokens).sort((a, b) => b[0].length - a[0].length)[0];
  if (token) return { start: token.index!, end: token.index! + token[0].length, answer: token[0] };
  return { start: 0, end: text.length, answer: text };
}

export function isBlankAnswerCorrect(answer: string, input: string) {
  return Boolean(input.trim()) && isDictationExactMatch(answer, input);
}
