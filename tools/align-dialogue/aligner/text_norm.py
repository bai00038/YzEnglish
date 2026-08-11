"""Text normalization shared by the transcript and the recognized words.

Both sides of the fuzzy match go through the same normalization so that
punctuation/case differences between the human-authored dialogue_en text
and WhisperX's output never count as a mismatch.
"""
from __future__ import annotations

import re
from typing import List

_TOKEN_RE = re.compile(r"[a-z0-9']+")


def normalize_word(word: str) -> str:
    return word.strip().strip("'").lower()


def tokenize(text: str) -> List[str]:
    """Split text into normalized word tokens (lowercase, punctuation stripped,
    contractions like "don't" kept whole)."""
    tokens = _TOKEN_RE.findall(text.lower())
    return [t for t in (normalize_word(t) for t in tokens) if t]
