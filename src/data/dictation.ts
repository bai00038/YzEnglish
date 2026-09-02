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
// . , ! ? : ; " ( ) — deliberately NOT the apostrophe, so contractions
// survive normalization intact. Nothing here ever rewrites a word's
// spelling, adds/removes articles, or substitutes synonyms.
const IGNORED_PUNCTUATION = /[.,!?:;"()]/g;

export function normalizeDictationText(text: string): string {
  return text
    .toLowerCase()
    .replace(CURLY_SINGLE_QUOTES, "'")
    .replace(CURLY_DOUBLE_QUOTES, "")
    .replace(IGNORED_PUNCTUATION, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDictationExactMatch(correctText: string, userText: string): boolean {
  return normalizeDictationText(correctText) === normalizeDictationText(userText);
}

interface DictationTokenSource {
  /** Original text as authored/typed — always what renders. */
  raw: string;
  /** Normalized form — only ever used for equality comparisons. */
  norm: string;
}

// Tokenizes on the RAW text's own whitespace (not the normalized string),
// so a token's displayed form is exactly what was authored/typed. Tokens
// that normalize to "" (pure punctuation with nothing else in it) are
// dropped rather than compared, since they carry no dictation-relevant
// content either way.
function tokenize(text: string): DictationTokenSource[] {
  return text
    .split(/\s+/)
    .filter(raw => raw.length > 0)
    .map(raw => ({ raw, norm: normalizeDictationText(raw) }))
    .filter(t => t.norm.length > 0);
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
  const correct = tokenize(correctText);
  const user = tokenize(userText);
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
