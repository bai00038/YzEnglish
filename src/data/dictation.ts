// Pure text-comparison helpers for the Dictation study tab
// (src/app/components/DictationPractice.tsx). No React, no DOM, no
// dependency on scene/video data — just string in, judgement out — so
// these are trivial to reason about and to hand-check against the
// product spec's worked examples.

// Curly single quotes unify to a straight apostrophe (kept — it's what
// makes "I'm" / "don't" / "we're" compare correctly); curly double quotes
// are just noise like the rest of IGNORED_PUNCTUATION, so they're dropped
// rather than unified to a straight ".
const CURLY_SINGLE_QUOTES = /[‘’]/g;
const CURLY_DOUBLE_QUOTES = /[“”]/g;
// Ignore sentence punctuation, preserving apostrophes and separators inside
// numbers so values like 1.5 and 15 stay distinct.
const IGNORED_PUNCTUATION = /[.,!?:;"()]/g;
const NUMBER_WORDS = new Map([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
].map((word, value) => [word, value]));
const TENS = new Map([
  "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
].map((word, index) => [word, (index + 2) * 10]));
const SCALES = new Map([["thousand", 1_000], ["million", 1_000_000], ["billion", 1_000_000_000]]);

const unit = [...NUMBER_WORDS.keys()].slice(1, 10).join("|");
const underHundred = `(?:${[...NUMBER_WORDS.keys()].slice(1).join("|")}|(?:${[...TENS.keys()].join("|")})(?:[ -](?:${unit}))?)`;
const group = `(?:(?:${unit}) hundred(?:(?: and)? ${underHundred})?|${underHundred})`;
// Match the longest valid cardinal phrase, keeping separate digits in
// sequences such as "one two three" separate.
const integerWords = new RegExp(
  `^(?:${group} billion(?: (?:and )?${group} million)?(?: (?:and )?${group} thousand)?(?: (?:and )?${group})?` +
  `|${group} million(?: (?:and )?${group} thousand)?(?: (?:and )?${group})?` +
  `|${group} thousand(?: (?:and )?${group})?|${group}|zero)(?= |$)`,
);
const clockNotation = /\b\d{1,2}:\d{2}\b|\b(?:half past|quarter (?:past|to))\b/;
const hour = `(?:\\d{1,2}|${underHundred})`;
const minute = `(?:\\d{2}|(?:oh|zero) (?:${unit}|[1-9])|${[...NUMBER_WORDS.keys()].slice(10).join("|")}|(?:${[...TENS.keys()].slice(0, 4).join("|")})(?:[ -](?:${unit}))?)`;
const spokenClock = new RegExp(`^(${hour}) (${minute})(?= |$)`);
const relativeClock = new RegExp(`^(half past|quarter past|quarter to) (${hour})(?= |$)`);
const onTheHour = new RegExp(`^(${hour}) o'clock(?= |$)`);

function numberValue(phrase: string): number {
  if (/^\d+$/.test(phrase)) return Number(phrase);
  let total = 0;
  let subtotal = 0;
  for (const part of phrase.split(/[ -]/)) {
    const scale = SCALES.get(part);
    if (scale) {
      total += subtotal * scale;
      subtotal = 0;
    } else if (part === "hundred") {
      subtotal *= 100;
    } else {
      subtotal += NUMBER_WORDS.get(part) ?? TENS.get(part) ?? 0;
    }
  }
  return total + subtotal;
}

function matchClock(text: string, allowSpokenClock: boolean) {
  const digits = text.match(/^(\d{1,2}):(\d{2})(?= |$)/);
  if (digits && Number(digits[1]) < 24 && Number(digits[2]) < 60) {
    return { phrase: digits[0], hour: Number(digits[1]), minute: Number(digits[2]) };
  }
  const exactHour = text.match(onTheHour);
  if (exactHour && numberValue(exactHour[1]) < 24) {
    return { phrase: exactHour[0], hour: numberValue(exactHour[1]), minute: 0 };
  }
  const relative = text.match(relativeClock);
  if (relative) {
    const hours = numberValue(relative[2]);
    if (hours >= 1 && hours <= 12) {
      if (relative[1] === "quarter to") return { phrase: relative[0], hour: hours === 1 ? 12 : hours - 1, minute: 45 };
      return { phrase: relative[0], hour: hours, minute: relative[1] === "half past" ? 30 : 15 };
    }
  }
  if (!allowSpokenClock) return undefined;
  const spoken = text.match(spokenClock);
  if (!spoken) return undefined;
  const hours = numberValue(spoken[1]);
  const minutes = numberValue(spoken[2].replace(/^(?:oh|zero) /, ""));
  if (hours >= 24 || minutes >= 60) return undefined;
  return { phrase: spoken[0], hour: hours, minute: minutes };
}

export function normalizeDictationText(text: string): string {
  return text
    .toLowerCase()
    .replace(CURLY_SINGLE_QUOTES, "'")
    .replace(CURLY_DOUBLE_QUOTES, "")
    .replace(/—/g, " ")
    .replace(IGNORED_PUNCTUATION, (mark, index, source: string) =>
      /[.,:]/.test(mark) && /\d/.test(source[index - 1] ?? "") && /\d/.test(source[index + 1] ?? "") ? mark : "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Dictation checks listening comprehension, so a standard contraction and
// its written-out form are equivalent. Ambiguous contractions intentionally
// expose both valid expansions ("he's" = "he is" / "he has"), and the full
// sentence still has to match one complete expansion before it is accepted.
function expandContractionToken(token: string): string[] {
  const fixed: Record<string, string[]> = {
    "can't": ["can not"],
    cannot: ["can not"],
    "won't": ["will not"],
    "shan't": ["shall not"],
    "let's": ["let us"],
    "y'all": ["you all"],
  };
  if (fixed[token]) return fixed[token];

  const endings: Array<[RegExp, (stem: string) => string[]]> = [
    [/^(.+)'m$/, stem => [`${stem} am`]],
    [/^(.+)'re$/, stem => [`${stem} are`]],
    [/^(.+)'ve$/, stem => [`${stem} have`]],
    [/^(.+)'ll$/, stem => [`${stem} will`]],
    [/^(.+)'d$/, stem => [`${stem} would`, `${stem} had`]],
    [/^(.+)'s$/, stem => [`${stem} is`, `${stem} has`]],
    [/^(.+)n't$/, stem => [`${stem} not`]],
  ];

  for (const [pattern, expand] of endings) {
    const match = token.match(pattern);
    if (match) return expand(match[1]);
  }
  return [token];
}

function dictationComparisonVariants(tokens: DictationTokenSource[]): string[] {
  return tokens.reduce<string[]>((variants, token) => {
    const expansions = expandContractionToken(token.norm);
    return variants.flatMap(prefix => expansions.map(expansion => prefix ? `${prefix} ${expansion}` : expansion));
  }, [""]);
}

export function isDictationExactMatch(correctText: string, userText: string): boolean {
  return tokensMatch(...tokenizeAnswers(correctText, userText));
}

function tokensMatch(correct: DictationTokenSource[], user: DictationTokenSource[]): boolean {
  const correctVariants = new Set(dictationComparisonVariants(correct));
  return dictationComparisonVariants(user).some(variant => correctVariants.has(variant));
}

interface DictationTokenSource {
  /** Original text as authored/typed — always what renders. */
  raw: string;
  /** Normalized form — only ever used for equality comparisons. */
  norm: string;
}

// Keep the original spelling for display. A number phrase forms one token
// so the word diff can align "twenty one" with "21" even in a partial match.
function tokenize(text: string, allowSpokenClock: boolean): DictationTokenSource[] {
  // An em dash separates words even when written without spaces.
  const words = (text.match(/[^\s—]+—*|—+/g) ?? [])
    .map(raw => ({ raw, norm: normalizeDictationText(raw) }))
    .filter(t => t.norm.length > 0);

  const tokens: DictationTokenSource[] = [];
  for (let i = 0; i < words.length;) {
    const word = words[i];
    const remaining = words.slice(i).map(token => token.norm).join(" ");
    const clock = matchClock(remaining, allowSpokenClock);
    if (clock) {
      const end = i + clock.phrase.split(" ").length;
      const norm = clock.minute === 0 ? String(clock.hour) : `${clock.hour}:${String(clock.minute).padStart(2, "0")}`;
      tokens.push({ raw: words.slice(i, end).map(token => token.raw).join(" "), norm });
      i = end;
      continue;
    }
    const number = remaining.match(integerWords)?.[0];
    if (number) {
      const end = i + number.split(" ").length;
      tokens.push({ raw: words.slice(i, end).map(token => token.raw).join(" "), norm: String(numberValue(number)) });
      i = end;
    } else {
      const norm = /^\d{1,3}(?:,\d{3})+$/.test(word.norm) ? word.norm.replace(/,/g, "") : word.norm;
      tokens.push({ raw: word.raw, norm });
      i++;
    }
  }
  return tokens;
}

function tokenizeAnswers(correctText: string, userText: string): [DictationTokenSource[], DictationTokenSource[]] {
  // A clock cue disambiguates adjacent numbers like "ten thirty".
  const allowSpokenClock = clockNotation.test(normalizeDictationText(correctText))
    || clockNotation.test(normalizeDictationText(userText));
  return [tokenize(correctText, allowSpokenClock), tokenize(userText, allowSpokenClock)];
}

export type DictationTokenStatus = "correct" | "incorrect" | "missing";

export interface DictationToken {
  text: string;
  status: DictationTokenStatus;
}

export interface DictationDiff {
  /** What the user actually typed — "correct" (matched) or "incorrect" (wrong/extra) tokens only, in the user's own order. */
  userTokens: DictationToken[];
  /** The full correct sentence — "correct" (matched) or "missing" (omitted by the user) tokens only, in the correct sentence's order. */
  correctTokens: DictationToken[];
}

// Word-level LCS alignment. A naive index-by-index compare would cascade
// one dropped/inserted word into every word after it reading as wrong;
// this instead finds the longest common subsequence of normalized tokens
// between the correct sentence and the user's answer, so a single missing
// or extra word only ever affects itself — see the worked examples in
// dictation spec §5/§6 this was built against (e.g. dropping "a" out of
// "a new foundation", or "you were" out of "everything you were looking",
// must not mark the words after it wrong).
//
// Standard O(n·m) LCS dynamic-programming table — sentence-length inputs
// only, so this is always tiny in practice.
export function diffDictationWords(correctText: string, userText: string): DictationDiff {
  const [correct, user] = tokenizeAnswers(correctText, userText);

  // When the full sentences are equivalent after contraction expansion,
  // preserve each side's original spelling while marking every token right.
  // This keeps "what're" visible as typed without falsely contrasting it
  // against the authored "what are".
  if (tokensMatch(correct, user)) {
    return {
      userTokens: user.map(token => ({ text: token.raw, status: "correct" })),
      correctTokens: correct.map(token => ({ text: token.raw, status: "correct" })),
    };
  }

  const n = correct.length;
  const m = user.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = correct[i].norm === user[j].norm
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const userTokens: DictationToken[] = [];
  const correctTokens: DictationToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (correct[i].norm === user[j].norm) {
      correctTokens.push({ text: correct[i].raw, status: "correct" });
      userTokens.push({ text: user[j].raw, status: "correct" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // Advancing past correct[i] (skipping it) keeps at least as much of
      // the LCS as advancing past user[j] would — so correct[i] is the
      // one not present in the user's answer.
      correctTokens.push({ text: correct[i].raw, status: "missing" });
      i++;
    } else {
      userTokens.push({ text: user[j].raw, status: "incorrect" });
      j++;
    }
  }
  while (i < n) {
    correctTokens.push({ text: correct[i].raw, status: "missing" });
    i++;
  }
  while (j < m) {
    userTokens.push({ text: user[j].raw, status: "incorrect" });
    j++;
  }

  return { userTokens, correctTokens };
}
