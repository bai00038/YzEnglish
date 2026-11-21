import type { KitEntry, KitOccurrence } from './kit';

export interface KitWordMatch { start: number; end: number; entry: KitEntry; occurrence: KitOccurrence }
const normalize = (text: string) => text.toLowerCase().replace(/[’‘]/g, "'");
const tokenize = (text: string) => [...text.matchAll(/[a-z]+(?:['’][a-z]+)?|\d+/gi)].map(match => ({ text: normalize(match[0]), start: match.index!, end: match.index! + match[0].length }));
const irregular: Record<string, string[]> = {
  tooth: ['teeth'], foot: ['feet'], child: ['children'], person: ['people'], man: ['men'], woman: ['women'],
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'], have: ['has', 'had'], do: ['does', 'did', 'done'],
  go: ['goes', 'went', 'gone'], get: ['got', 'gotten', 'getting'], take: ['took', 'taken'],
  give: ['gave', 'given'], bring: ['brought'], feel: ['felt'], bite: ['bit', 'bitten'], hurt: ['hurt'],
};
function forms(word: string) {
  const values = new Set([word, ...(irregular[word] ?? []), word + 's', word + 'es', word + 'ed', word + 'ing']);
  if (/[^aeiou]y$/.test(word)) { values.add(word.slice(0, -1) + 'ies'); values.add(word.slice(0, -1) + 'ied'); }
  if (/e$/.test(word)) { values.add(word + 'd'); values.add(word.slice(0, -1) + 'ing'); }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(word)) { values.add(word + word.at(-1) + 'ed'); values.add(word + word.at(-1) + 'ing'); }
  return values;
}
const lineKey = (text: string) => tokenize(text).map(token => token.text).join(' ');

export function findKitWordMatches(text: string, sceneId: string, anchorStart: number | undefined, entries: KitEntry[], kinds: readonly KitEntry['kind'][] = ['word']): KitWordMatch[] {
  const tokens = tokenize(text);
  const candidates: KitWordMatch[] = [];
  for (const entry of entries) {
    if (!kinds.includes(entry.kind)) continue;
    const occurrence = entry.occurrences.find(source => source.sceneId === sceneId && (
      typeof anchorStart === 'number' && source.anchor_start !== null
        ? Math.abs(source.anchor_start - anchorStart) <= .15
        : lineKey(source.anchor_line ?? source.displayExample) === lineKey(text)
    ));
    if (!occurrence) continue;
    // Slashes and parenthetical notes are authored alternatives/labels,
    // e.g. "fever / cold" or "crowded (teeth)", not literal dialogue.
    const variants = entry.text.split(/\s*\/\s*/).flatMap(label => {
      const words = tokenize(label.replace(/\([^)]*\)/g, '')).map(token => token.text);
      if (!words.length) return [];
      return words.length > 1 && /^(a|an|the)$/.test(words[0]) ? [words, words.slice(1)] : [words];
    });
    for (const variant of variants) {
      const accepted = variant.map(forms);
      for (let start = 0; start + variant.length <= tokens.length; start++) {
        const slice = tokens.slice(start, start + variant.length);
        if (!slice.every((token, index) => accepted[index].has(token.text))) continue;
        if (slice.some((token, index) => index > 0 && !/^[\s-]+$/.test(text.slice(slice[index - 1].end, token.start)))) continue;
        candidates.push({ start: slice[0].start, end: slice.at(-1)!.end, entry, occurrence });
      }
    }
  }
  // Prefer complete phrases over overlapping individual words.
  const selected: KitWordMatch[] = [];
  candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  for (const candidate of candidates) {
    if (!selected.some(item => candidate.start < item.end && candidate.end > item.start)) selected.push(candidate);
  }
  return selected.sort((a, b) => a.start - b.start);
}

export function kitLookupExamples(entry: KitEntry, current: KitOccurrence) {
  const key = (source: KitOccurrence) => `${source.sceneId}:${source.anchor_start ?? lineKey(source.displayExample)}`;
  const seen = new Set([key(current)]);
  const others = entry.occurrences.filter(source => {
    const id = key(source);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...others.filter(source => source.sceneId !== current.sceneId), ...others.filter(source => source.sceneId === current.sceneId)];
}
