"""Shared dataclasses used across the pipeline stages."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class DialogueLine:
    """One row from the input dialogue CSV (mirrors the Google Sheets
    Dialogue_Lines tab's identity/order/text columns -- see
    google-apps-script/scenes-sync/README.md). Timing columns are never
    read from here; this tool produces them."""

    line_id: str
    scene_id: str
    line_order: int
    speaker: str
    text: str
    allow_overlap_with_next: bool = False


@dataclass
class Word:
    """A single word-level timestamp, e.g. from WhisperX's word_segments."""

    text: str
    start: float
    end: float
    score: Optional[float] = None


@dataclass
class LineMatch:
    """Result of fuzzy-matching one DialogueLine against the recognized words,
    before padding/overlap validation."""

    line: DialogueLine
    start_time: Optional[float]
    end_time: Optional[float]
    confidence: float
    matched_word_count: int
    total_word_count: int
    notes: List[str] = field(default_factory=list)


@dataclass
class AlignedLine:
    """Final, validated output row -- what gets written to the CSV."""

    scene_id: str
    line_id: str
    start_time: Optional[float]
    end_time: Optional[float]
    confidence: float
    review_required: bool
    notes: List[str] = field(default_factory=list)
