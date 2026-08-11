import csv
from pathlib import Path

from align_scene import main

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def test_end_to_end_with_words_json_fixture(tmp_path):
    output = tmp_path / "aligned_demo.csv"
    exit_code = main([
        "--scene-id", "demo",
        "--words-json", str(FIXTURES / "words_demo.json"),
        "--video-duration", "12.0",
        "--dialogue-csv", str(FIXTURES / "dialogue_demo.csv"),
        "--output", str(output),
        "--include-notes",
    ])
    assert exit_code == 0

    with output.open(newline="") as f:
        rows = {r["line_id"]: r for r in csv.DictReader(f)}

    assert set(rows) == {"line_000001", "line_000002", "line_000003", "line_000004"}

    # Clean, fully-recognized line: tight match, high confidence, no review.
    l1 = rows["line_000001"]
    assert l1["start_time"] == "0.42"
    assert l1["end_time"] == "2.72"
    assert l1["review_required"] == "false"
    assert float(l1["confidence"]) > 0.9

    l2 = rows["line_000002"]
    assert l2["start_time"] == "2.92"
    assert l2["end_time"] == "5.22"
    assert l2["review_required"] == "false"

    # Partially-recognized line (ASR dropped 4 of 6 words): still bounded
    # by the words that *were* found, but flagged for review.
    l3 = rows["line_000003"]
    assert l3["start_time"] == "5.42"
    assert l3["end_time"] == "7.22"
    assert l3["review_required"] == "true"
    assert 0.0 < float(l3["confidence"]) < 0.65

    # Never-spoken line: no timestamps guessed, flagged for review.
    l4 = rows["line_000004"]
    assert l4["start_time"] == ""
    assert l4["end_time"] == ""
    assert l4["confidence"] == "0.00"
    assert l4["review_required"] == "true"
    assert "no alignment found" in l4["notes"]

    # scene_id is carried through, and lines stay in chronological order.
    assert all(r["scene_id"] == "demo" for r in rows.values())
    assert float(l1["start_time"]) < float(l2["start_time"]) < float(l3["start_time"])
