from aligner.match import match_lines_to_words
from aligner.types import DialogueLine, Word


def _word(text, start, end, score=0.9):
    return Word(text=text, start=start, end=end, score=score)


def test_full_exact_match_uses_first_and_last_word_bounds():
    words = [
        _word("hello", 1.0, 1.3),
        _word("there", 1.4, 1.7),
        _word("friend", 1.8, 2.2),
    ]
    line = DialogueLine("l1", "s1", 1, "A", "Hello there, friend!")
    [m] = match_lines_to_words([line], words)
    assert m.start_time == 1.0
    assert m.end_time == 2.2
    assert m.matched_word_count == 3
    assert m.confidence > 0.9


def test_cursor_advances_so_earlier_words_are_not_reused():
    words = [
        _word("hello", 1.0, 1.3),
        _word("there", 1.4, 1.7),
        _word("goodbye", 2.0, 2.4),
        _word("now", 2.5, 2.8),
    ]
    lines = [
        DialogueLine("l1", "s1", 1, "A", "Hello there."),
        DialogueLine("l2", "s1", 2, "B", "Goodbye now."),
    ]
    m1, m2 = match_lines_to_words(lines, words)
    assert (m1.start_time, m1.end_time) == (1.0, 1.7)
    assert (m2.start_time, m2.end_time) == (2.0, 2.8)


def test_partial_coverage_lowers_confidence_but_still_matches():
    # ASR only picked up 2 of the line's 6 words -- coverage should be
    # reflected in a mid-range confidence, not a full-confidence match.
    words = [
        _word("of", 5.5, 5.6),
        _word("please", 6.8, 7.1, score=0.6),
    ]
    line = DialogueLine("l1", "s1", 1, "A", "Of course, right this way please.")
    [m] = match_lines_to_words([line], words)
    assert m.start_time == 5.5
    assert m.end_time == 7.1
    assert m.matched_word_count == 2
    assert m.total_word_count == 6
    assert 0.0 < m.confidence < 0.65


def test_no_matching_words_leaves_line_unmatched():
    words = [_word("hello", 1.0, 1.3)]
    line = DialogueLine("l1", "s1", 1, "A", "Completely different sentence entirely.")
    [m] = match_lines_to_words([line], words)
    assert m.start_time is None
    assert m.end_time is None
    assert m.confidence == 0.0


def test_empty_word_list():
    line = DialogueLine("l1", "s1", 1, "A", "Hello there.")
    [m] = match_lines_to_words([line], [])
    assert m.start_time is None
