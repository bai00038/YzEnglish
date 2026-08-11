import csv
from pathlib import Path

import pytest

from aligner.io_csv import DialogueCsvError, read_dialogue_csv, write_aligned_csv
from aligner.types import AlignedLine


def _write_csv(tmp_path: Path, rows, header):
    path = tmp_path / "dialogue.csv"
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)
    return path


def test_reads_and_sorts_by_line_order(tmp_path):
    path = _write_csv(
        tmp_path,
        [
            {"line_id": "l2", "scene_id": "s1", "line_order": "2", "speaker": "B", "dialogue_en": "Second."},
            {"line_id": "l1", "scene_id": "s1", "line_order": "1", "speaker": "A", "dialogue_en": "First."},
        ],
        ["line_id", "scene_id", "line_order", "speaker", "dialogue_en"],
    )
    lines = read_dialogue_csv(str(path), scene_id="s1")
    assert [l.line_id for l in lines] == ["l1", "l2"]
    assert lines[0].text == "First."


def test_accepts_english_text_alias(tmp_path):
    path = _write_csv(
        tmp_path,
        [{"line_id": "l1", "line_order": "1", "speaker": "A", "english_text": "Hello there."}],
        ["line_id", "line_order", "speaker", "english_text"],
    )
    lines = read_dialogue_csv(str(path), scene_id="s1")
    assert lines[0].text == "Hello there."


def test_filters_by_scene_id_when_column_present(tmp_path):
    path = _write_csv(
        tmp_path,
        [
            {"line_id": "l1", "scene_id": "s1", "line_order": "1", "speaker": "A", "dialogue_en": "In scene."},
            {"line_id": "l2", "scene_id": "other", "line_order": "1", "speaker": "A", "dialogue_en": "Not in scene."},
        ],
        ["line_id", "scene_id", "line_order", "speaker", "dialogue_en"],
    )
    lines = read_dialogue_csv(str(path), scene_id="s1")
    assert [l.line_id for l in lines] == ["l1"]


def test_missing_required_field_raises_with_row_number(tmp_path):
    path = _write_csv(
        tmp_path,
        [{"line_id": "", "line_order": "1", "speaker": "A", "dialogue_en": "Hi."}],
        ["line_id", "line_order", "speaker", "dialogue_en"],
    )
    with pytest.raises(DialogueCsvError, match="row 2"):
        read_dialogue_csv(str(path), scene_id="s1")


def test_duplicate_line_id_raises(tmp_path):
    path = _write_csv(
        tmp_path,
        [
            {"line_id": "l1", "line_order": "1", "speaker": "A", "dialogue_en": "Hi."},
            {"line_id": "l1", "line_order": "2", "speaker": "A", "dialogue_en": "Hi again."},
        ],
        ["line_id", "line_order", "speaker", "dialogue_en"],
    )
    with pytest.raises(DialogueCsvError, match="duplicate line_id"):
        read_dialogue_csv(str(path), scene_id="s1")


def test_non_integer_line_order_raises(tmp_path):
    path = _write_csv(
        tmp_path,
        [{"line_id": "l1", "line_order": "one", "speaker": "A", "dialogue_en": "Hi."}],
        ["line_id", "line_order", "speaker", "dialogue_en"],
    )
    with pytest.raises(DialogueCsvError, match="not a whole number"):
        read_dialogue_csv(str(path), scene_id="s1")


def test_write_aligned_csv_roundtrip(tmp_path):
    out = tmp_path / "out.csv"
    rows = [
        AlignedLine("s1", "l1", 1.23, 4.56, 0.91, False, notes=["fine"]),
        AlignedLine("s1", "l2", None, None, 0.0, True, notes=["no alignment found"]),
    ]
    write_aligned_csv(str(out), rows, include_notes=True)

    with out.open(newline="") as f:
        reader = list(csv.DictReader(f))

    assert reader[0]["start_time"] == "1.23"
    assert reader[0]["review_required"] == "false"
    assert reader[1]["start_time"] == ""
    assert reader[1]["review_required"] == "true"
    assert reader[1]["notes"] == "no alignment found"
