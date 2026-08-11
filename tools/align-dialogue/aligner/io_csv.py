"""Reading the input dialogue transcript and writing the aligned output.

Input CSV is expected to look like an export of the Google Sheets
`Dialogue_Lines` tab (see google-apps-script/scenes-sync/README.md):
`line_id`, `scene_id`, `line_order`, `speaker`, `dialogue_en` (or
`english_text`), with `dialogue_zh`/`speaker_zh`/`start_time`/`end_time`
columns present but ignored -- this tool only ever *produces* timing, it
never reads existing timing as input.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List, Optional, Sequence

from .types import AlignedLine, DialogueLine

# Accept either the sheet's real column name or a more generic alias, since
# the task's ordered-lines input is described as "speaker and english_text".
_TEXT_COLUMNS = ("english_text", "dialogue_en", "text", "line_text")
_TRUE_VALUES = {"1", "true", "yes", "y"}

OUTPUT_FIELDNAMES = [
    "scene_id",
    "line_id",
    "start_time",
    "end_time",
    "confidence",
    "review_required",
]
NOTES_FIELDNAME = "notes"


class DialogueCsvError(ValueError):
    """Raised for a malformed input CSV -- always names the offending row,
    same philosophy as the Apps Script sync refusing to silently skip a
    line with a missing/duplicate identity (see scenes-sync/README.md)."""


def _find_text_column(fieldnames: Sequence[str]) -> str:
    lower_to_actual = {f.lower(): f for f in fieldnames}
    for candidate in _TEXT_COLUMNS:
        if candidate in lower_to_actual:
            return lower_to_actual[candidate]
    raise DialogueCsvError(
        f"dialogue CSV is missing a text column -- expected one of {_TEXT_COLUMNS}, "
        f"found columns {list(fieldnames)}"
    )


def read_dialogue_csv(path: str, *, scene_id: str) -> List[DialogueLine]:
    """Read and validate the dialogue CSV, returning lines sorted by
    line_order. If the CSV has a scene_id column, rows for other scenes are
    filtered out; if it doesn't, every row is assumed to belong to
    `scene_id`."""

    csv_path = Path(path)
    if not csv_path.is_file():
        raise DialogueCsvError(f"dialogue CSV not found: {path}")

    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise DialogueCsvError(f"dialogue CSV has no header row: {path}")

        fieldnames = [name.strip() for name in reader.fieldnames]
        reader.fieldnames = fieldnames
        text_col = _find_text_column(fieldnames)
        lower_to_actual = {f.lower(): f for f in fieldnames}
        scene_col = lower_to_actual.get("scene_id")
        overlap_col = lower_to_actual.get("allow_overlap_with_next")

        lines: List[DialogueLine] = []
        seen_line_ids: Dict[str, int] = {}

        for row_num, row in enumerate(reader, start=2):  # header is row 1
            row_scene_id = (row.get(scene_col) or "").strip() if scene_col else scene_id
            if scene_col and row_scene_id and row_scene_id != scene_id:
                continue

            line_id = (row.get("line_id") or "").strip()
            speaker = (row.get("speaker") or "").strip()
            text = (row.get(text_col) or "").strip()
            line_order_raw = (row.get("line_order") or "").strip()

            missing = [
                name
                for name, value in (
                    ("line_id", line_id),
                    ("speaker", speaker),
                    (text_col, text),
                    ("line_order", line_order_raw),
                )
                if not value
            ]
            if missing:
                raise DialogueCsvError(
                    f"row {row_num}: missing required field(s) {missing}"
                )

            try:
                line_order = int(line_order_raw)
            except ValueError as exc:
                raise DialogueCsvError(
                    f"row {row_num}: line_order {line_order_raw!r} is not a whole number"
                ) from exc

            if line_id in seen_line_ids:
                raise DialogueCsvError(
                    f"row {row_num}: duplicate line_id {line_id!r} "
                    f"(first seen at row {seen_line_ids[line_id]})"
                )
            seen_line_ids[line_id] = row_num

            allow_overlap = False
            if overlap_col:
                allow_overlap = (row.get(overlap_col) or "").strip().lower() in _TRUE_VALUES

            lines.append(
                DialogueLine(
                    line_id=line_id,
                    scene_id=scene_id,
                    line_order=line_order,
                    speaker=speaker,
                    text=text,
                    allow_overlap_with_next=allow_overlap,
                )
            )

    if not lines:
        raise DialogueCsvError(
            f"no dialogue rows found for scene_id={scene_id!r} in {path}"
        )

    lines.sort(key=lambda l: l.line_order)
    return lines


def write_aligned_csv(path: str, aligned: Sequence[AlignedLine], *, include_notes: bool = False) -> None:
    fieldnames = list(OUTPUT_FIELDNAMES)
    if include_notes:
        fieldnames.append(NOTES_FIELDNAME)

    out_path = Path(path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for a in aligned:
            row = {
                "scene_id": a.scene_id,
                "line_id": a.line_id,
                "start_time": "" if a.start_time is None else f"{a.start_time:.2f}",
                "end_time": "" if a.end_time is None else f"{a.end_time:.2f}",
                "confidence": f"{a.confidence:.2f}",
                "review_required": "true" if a.review_required else "false",
            }
            if include_notes:
                row[NOTES_FIELDNAME] = "; ".join(a.notes)
            writer.writerow(row)
