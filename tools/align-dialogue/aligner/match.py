"""Fuzzy-match each ordered dialogue line against WhisperX's recognized
word-level timestamps.

Strategy, per line, walking a cursor forward through the recognized words
so later lines never match earlier audio:

1. Take a search window starting at the cursor, sized generously relative
   to the line's word count (ASR can insert filler words or split things
   differently, so the window is wider than the line itself).
2. Find exact-token matches between the line and the window using
   difflib's longest-matching-blocks -- this handles the common case
   (WhisperX transcribes the line correctly) cheaply and deterministically.
3. For any line word difflib didn't match, fall back to rapidfuzz
   similarity against the window's still-unmatched words, to recover
   near-misses (mis-hearings, minor ASR errors).
4. start_time = the first matched word's start; end_time = the last
   matched word's end. Confidence blends match coverage, match quality,
   and WhisperX's own per-word alignment score.
5. Advance the cursor to just past the last matched word.

Lines with no matched words at all are left unmatched (start/end = None)
rather than guessed -- validate.py flags these for manual review.
"""
from __future__ import annotations

import difflib
from typing import Dict, List, Optional, Sequence, Tuple

from .text_norm import tokenize
from .types import DialogueLine, LineMatch, Word

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover - exercised via _fuzzy_ratio fallback
    fuzz = None

FUZZY_THRESHOLD = 70.0  # rapidfuzz 0-100 similarity to accept a non-exact word match
WINDOW_MULTIPLIER = 5
WINDOW_MIN_EXTRA = 25

# Confidence = weighted blend of: fraction of line words matched, average
# quality of those matches, and WhisperX's own per-word alignment score.
_W_COVERAGE = 0.55
_W_QUALITY = 0.25
_W_ASR_SCORE = 0.20


def _fuzzy_ratio(a: str, b: str) -> float:
    if fuzz is not None:
        return fuzz.ratio(a, b)
    return 100.0 if a == b else 0.0


def _match_one_line(line: DialogueLine, window_words: Sequence[Word]) -> Tuple[LineMatch, Optional[int]]:
    """Returns (match, last_matched_index_in_window) -- the index is None
    when nothing matched, so the caller knows not to advance the cursor
    based on it."""
    line_tokens = tokenize(line.text)
    if not line_tokens:
        return LineMatch(line, None, None, 0.0, 0, 0, ["dialogue line has no words after normalization"]), None
    if not window_words:
        return LineMatch(line, None, None, 0.0, 0, len(line_tokens), ["no recognized words remaining to search"]), None

    window_tokens = [tokenize_single(w.text) for w in window_words]

    # index within window -> match quality in [0, 1]
    matched: Dict[int, float] = {}
    exact_line_positions = set()

    matcher = difflib.SequenceMatcher(None, line_tokens, window_tokens, autojunk=False)
    for block in matcher.get_matching_blocks():
        for k in range(block.size):
            matched[block.b + k] = 1.0
            exact_line_positions.add(block.a + k)

    if fuzz is not None:
        for li, tok in enumerate(line_tokens):
            if li in exact_line_positions or not tok:
                continue
            best_idx, best_score = None, 0.0
            for widx, wtok in enumerate(window_tokens):
                if widx in matched or not wtok:
                    continue
                score = _fuzzy_ratio(tok, wtok)
                if score > best_score:
                    best_score, best_idx = score, widx
            if best_idx is not None and best_score >= FUZZY_THRESHOLD:
                matched[best_idx] = best_score / 100.0

    if not matched:
        return LineMatch(line, None, None, 0.0, 0, len(line_tokens), ["no matching words found in search window"]), None

    first_idx = min(matched)
    last_idx = max(matched)
    first_word = window_words[first_idx]
    last_word = window_words[last_idx]

    coverage = len(matched) / len(line_tokens)
    avg_quality = sum(matched.values()) / len(matched)

    asr_scores = [w.score for w in window_words[first_idx:last_idx + 1] if w.score is not None]
    avg_asr_score = sum(asr_scores) / len(asr_scores) if asr_scores else 1.0

    confidence = max(0.0, min(1.0,
        _W_COVERAGE * min(coverage, 1.0) + _W_QUALITY * avg_quality + _W_ASR_SCORE * avg_asr_score
    ))

    notes = []
    if coverage < 1.0:
        notes.append(f"matched {len(matched)}/{len(line_tokens)} words")

    match = LineMatch(
        line=line,
        start_time=first_word.start,
        end_time=last_word.end,
        confidence=confidence,
        matched_word_count=len(matched),
        total_word_count=len(line_tokens),
        notes=notes,
    )
    return match, last_idx


def tokenize_single(word: str) -> str:
    toks = tokenize(word)
    return toks[0] if toks else ""


def match_lines_to_words(lines: Sequence[DialogueLine], words: Sequence[Word]) -> List[LineMatch]:
    results: List[LineMatch] = []
    cursor = 0
    n_words = len(words)

    for line in lines:
        line_tokens = tokenize(line.text)
        window_size = max(len(line_tokens) * WINDOW_MULTIPLIER + WINDOW_MIN_EXTRA, 1)
        window_start = cursor
        window_end = min(n_words, window_start + window_size)
        window_words = words[window_start:window_end]

        result, last_idx_in_window = _match_one_line(line, window_words)
        results.append(result)

        if last_idx_in_window is None:
            # Nothing matched in this window -- nudge the cursor forward by
            # the line's expected length so a persistently-missing line
            # doesn't stall every subsequent line's search window at the
            # same spot.
            cursor = min(n_words, cursor + max(len(line_tokens), 1))
            continue

        cursor = window_start + last_idx_in_window + 1

    return results

    return results
