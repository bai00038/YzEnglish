from aligner.text_norm import tokenize


def test_strips_punctuation_and_lowercases():
    assert tokenize("Good evening, welcome to our restaurant.") == [
        "good", "evening", "welcome", "to", "our", "restaurant",
    ]


def test_keeps_contractions():
    assert tokenize("Don't you have this in a small?") == [
        "don't", "you", "have", "this", "in", "a", "small",
    ]


def test_empty_and_symbol_only_text():
    assert tokenize("") == []
    assert tokenize("... !! ??") == []
