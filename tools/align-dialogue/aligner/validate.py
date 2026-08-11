"""Turn raw LineMatch results into final AlignedLine rows: apply lead-in/
lead-out padding, resolve overlaps between adjacent lines, clamp to video
duration, and decide which lines need manual review.

Implements requirements #12-15 from the tool spec:
  - keep >=start_pad seconds before the first spoken word when possible
  - keep ~end_pad seconds after the last spoken word without overlapping
    the next line
  - start_time < end_time, chronological order, no overuns past duration,
    no unintended overlap between adjacent lines
  - round to 2 decimal places
"""
from __future__ import annotations

from typing import List, Optional, Sequence

from .types import AlignedLine, LineMatch

MIN_LINE_DURATION = 0.01


def _round2(x: float) -> float:
    return round(x + 1e-9, 2)


def validate_and_adjust(
    matches: Sequence[LineMatch],
    *,
    scene_id: str,
    video_duration: Optional[float] = None,
    start_pad: float = 0.08,
    end_pad: float = 0.12,
    min_gap: float = 0.01,
    confidence_threshold: float = 0.65,
) -> List[AlignedLine]:
    n = len(matches)

    # Pass 1: raw padded (start, end) per line, ignoring neighbors.
    padded: List[Optional[List[float]]] = []
    for m in matches:
        if m.start_time is None or m.end_time is None:
            padded.append(None)
        else:
            padded.append([max(0.0, m.start_time - start_pad), m.end_time + end_pad])

    flags: List[List[str]] = [[] for _ in range(n)]

    # Pass 2 (forward): trim each line's start so it doesn't creep before the
    # previous line's end, unless the previous line explicitly allows
    # overlap with this one (simultaneous speakers).
    prev_end: Optional[float] = None
    for i in range(n):
        if padded[i] is None:
            prev_end = None
            continue
        prev_allows_overlap = matches[i - 1].line.allow_overlap_with_next if i > 0 else False
        s, e = padded[i]
        if prev_end is not None and not prev_allows_overlap and s < prev_end + min_gap:
            if s < prev_end:
                flags[i].append(
                    f"start_time overlapped previous line's end ({_round2(prev_end)}s); shifted forward"
                )
            s = prev_end + min_gap
            padded[i][0] = s
        prev_end = e

    # Pass 3 (backward): trim each line's end so it doesn't creep into the
    # next line's (already start-trimmed) start, unless this line allows
    # overlap with the next.
    for i in range(n - 2, -1, -1):
        if padded[i] is None or padded[i + 1] is None:
            continue
        if matches[i].line.allow_overlap_with_next:
            continue
        s, e = padded[i]
        next_start = padded[i + 1][0]
        if e > next_start - min_gap:
            flags[i].append(
                f"end_time would overlap next line's start ({_round2(next_start)}s); trimmed"
            )
            e = max(s + MIN_LINE_DURATION, next_start - min_gap)
            padded[i][1] = e

    # Pass 4: clamp to video duration, enforce start < end, check
    # chronological order, round, and decide review_required.
    aligned: List[AlignedLine] = []
    prev_start: Optional[float] = None
    for i, m in enumerate(matches):
        notes = list(m.notes) + flags[i]

        if padded[i] is None:
            aligned.append(AlignedLine(
                scene_id=scene_id,
                line_id=m.line.line_id,
                start_time=None,
                end_time=None,
                confidence=0.0,
                review_required=True,
                notes=notes + ["no alignment found -- needs manual timing"],
            ))
            continue

        s, e = padded[i]

        if video_duration is not None and e > video_duration:
            notes.append(f"end_time exceeded video duration ({video_duration}s); clamped")
            e = video_duration
            if s >= e:
                s = max(0.0, e - MIN_LINE_DURATION)

        if s >= e:
            notes.append("insufficient gap available; collapsed to minimum duration")
            e = s + MIN_LINE_DURATION

        s, e = _round2(s), _round2(e)
        if s >= e:
            e = _round2(s + MIN_LINE_DURATION)

        if prev_start is not None and s < prev_start:
            notes.append("start_time is earlier than the previous line's -- out of chronological order")
        prev_start = s

        critical = bool(flags[i]) or any(
            "no alignment" in n_ or "out of chronological order" in n_ or "exceeded video duration" in n_
            for n_ in notes
        )
        review_required = critical or m.confidence < confidence_threshold

        aligned.append(AlignedLine(
            scene_id=scene_id,
            line_id=m.line.line_id,
            start_time=s,
            end_time=e,
            confidence=_round2(m.confidence),
            review_required=review_required,
            notes=notes,
        ))

    return aligned
