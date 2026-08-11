from aligner.types import DialogueLine, LineMatch
from aligner.validate import validate_and_adjust


def _match(line_id, start, end, confidence=0.9, allow_overlap_with_next=False, line_order=1):
    line = DialogueLine(line_id, "s1", line_order, "A", "text", allow_overlap_with_next)
    return LineMatch(line, start, end, confidence, 3, 3, [])


def test_applies_start_and_end_padding():
    [a] = validate_and_adjust([_match("l1", 2.0, 3.0)], scene_id="s1", start_pad=0.08, end_pad=0.12)
    assert a.start_time == 1.92
    assert a.end_time == 3.12
    assert a.review_required is False


def test_start_pad_does_not_go_below_zero():
    [a] = validate_and_adjust([_match("l1", 0.03, 1.0)], scene_id="s1", start_pad=0.08)
    assert a.start_time == 0.0


def test_low_confidence_flagged_for_review():
    [a] = validate_and_adjust([_match("l1", 2.0, 3.0, confidence=0.4)], scene_id="s1", confidence_threshold=0.65)
    assert a.review_required is True


def test_unmatched_line_has_no_timestamps_and_is_flagged():
    line = DialogueLine("l1", "s1", 1, "A", "text")
    m = LineMatch(line, None, None, 0.0, 0, 3, ["no matching words found in search window"])
    [a] = validate_and_adjust([m], scene_id="s1")
    assert a.start_time is None
    assert a.end_time is None
    assert a.review_required is True


def test_overlapping_adjacent_lines_are_trimmed_apart():
    # Line 1's padded end (3.12) would land after line 2's padded start (3.02)
    # -- line 2's start is pushed forward to keep min_gap between them.
    matches = [
        _match("l1", 2.0, 3.0, line_order=1),
        _match("l2", 3.1, 4.0, line_order=2),
    ]
    a1, a2 = validate_and_adjust(matches, scene_id="s1", start_pad=0.08, end_pad=0.12, min_gap=0.01)
    assert a1.end_time <= a2.start_time - 0.01 + 1e-9
    assert a2.review_required is True
    assert "overlap" in " ".join(a2.notes)


def test_allow_overlap_with_next_skips_trimming():
    matches = [
        _match("l1", 2.0, 3.0, line_order=1, allow_overlap_with_next=True),
        _match("l2", 2.5, 4.0, line_order=2),
    ]
    a1, a2 = validate_and_adjust(matches, scene_id="s1", start_pad=0.08, end_pad=0.12)
    # end_pad still applied, but no forced trim against the next line's start.
    assert a1.end_time == 3.12
    assert "overlap" not in " ".join(a1.notes)


def test_clamped_to_video_duration():
    [a] = validate_and_adjust([_match("l1", 9.9, 10.0)], scene_id="s1", video_duration=10.0, end_pad=0.5)
    assert a.end_time == 10.0
    assert a.review_required is True


def test_out_of_order_start_flagged():
    # allow_overlap_with_next on line 1 bypasses the adjacency overlap trim
    # (which would otherwise push line 2 forward and mask the reversal),
    # so this specifically exercises the chronological-order check itself.
    matches = [
        _match("l1", 5.0, 6.0, line_order=1, allow_overlap_with_next=True),
        _match("l2", 1.0, 2.0, line_order=2),
    ]
    a1, a2 = validate_and_adjust(matches, scene_id="s1")
    assert a2.review_required is True
    assert any("chronological" in n for n in a2.notes)


def test_reversed_adjacent_lines_are_still_pulled_into_order():
    # Without allow_overlap_with_next, the ordinary overlap trim pushes
    # line 2 to start after line 1 ends -- order is enforced by
    # construction, and the line is still flagged for review either way.
    matches = [
        _match("l1", 5.0, 6.0, line_order=1),
        _match("l2", 1.0, 2.0, line_order=2),
    ]
    a1, a2 = validate_and_adjust(matches, scene_id="s1")
    assert a2.start_time >= a1.end_time
    assert a2.review_required is True


def test_rounds_to_two_decimal_places():
    [a] = validate_and_adjust([_match("l1", 1.005, 2.0001)], scene_id="s1", start_pad=0.001, end_pad=0.001)
    assert a.start_time == round(a.start_time, 2)
    assert a.end_time == round(a.end_time, 2)
