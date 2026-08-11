# align-dialogue

Automated dialogue timestamp alignment for YzEnglish scenes. Given a
scene's final video and its existing English dialogue transcript, this
tool produces accurate `start_time`/`end_time` values automatically —
nobody has to hand-convert `HH:MM:SS:frames` to decimal seconds.

**Standalone offline tool.** It does not call Supabase, does not touch
the website (`src/`), and does not touch either Apps Script sync
(`google-apps-script/`). It only reads a public `video_url` and a
dialogue CSV, and writes a CSV back out. Getting the produced timestamps
onto the site is a separate, manual step: paste them into the Google
Sheets `Dialogue_Lines` tab's `start_time`/`end_time` columns and run the
existing sync (see `google-apps-script/scenes-sync/README.md`) — this
tool deliberately does not write to Sheets or Supabase itself.

## How it works

1. Download the video from `video_url`.
2. Extract its audio with `ffmpeg`.
3. Transcribe + force-align the audio with [WhisperX](https://github.com/m-bain/whisperX), producing word-level timestamps.
4. Fuzzy-match the recognized words against each dialogue line's existing
   `english_text`, in order — the first matched word's start becomes
   `start_time`, the last matched word's end becomes `end_time`.
5. Add lead-in/lead-out padding, resolve any overlap with neighboring
   lines, clamp to the video's duration, and round to 2 decimals.
6. Score a confidence per line and flag low-confidence or otherwise
   questionable lines with `review_required=true` instead of guessing.

The original `english_text` is never modified or replaced by the
automatic transcription — it's only used as the target to match against.

## Setup

Requires Python 3.9+ and the `ffmpeg`/`ffprobe` binaries on your `PATH`
(`brew install ffmpeg` on macOS, `apt install ffmpeg` on Debian/Ubuntu).

```bash
cd tools/align-dialogue
python3 -m venv .venv && source .venv/bin/activate

# Install a torch build matching your machine first (CPU-only example;
# see https://pytorch.org/get-started/locally/ for CUDA builds):
pip install torch --index-url https://download.pytorch.org/whl/cpu

pip install -r requirements.txt
```

WhisperX downloads its ASR + forced-alignment models from Hugging Face on
first use (no auth token needed for English). GPU (`--device cuda`) is
much faster than CPU for longer scenes but not required.

## Usage

```bash
python align_scene.py \
  --scene-id scene8 \
  --video-url "https://your-project.supabase.co/storage/v1/object/public/video_resources/scene8.mp4" \
  --dialogue-csv dialogue.csv \
  --output aligned_scene8.csv
```

Run `python align_scene.py --help` for the full flag reference (padding,
confidence threshold, WhisperX model size/device/language, etc.).

### Input: `--dialogue-csv`

A CSV of the scene's ordered dialogue lines — e.g. an export of the
Google Sheets `Dialogue_Lines` tab. Required columns (by header name, any
order):

| Column | Notes |
|---|---|
| `line_id` | Permanent line identity (`external_line_id`). Must be non-empty and unique in the file. |
| `line_order` | Whole number; used to sort lines, not required to already be contiguous. |
| `speaker` | Carried straight through to the output for readability; not otherwise used. |
| `dialogue_en` or `english_text` | The line's existing English text — matched against, never rewritten. |

Optional columns:

| Column | Notes |
|---|---|
| `scene_id` | If present, rows for other scenes are filtered out; if absent, every row is assumed to belong to `--scene-id`. |
| `allow_overlap_with_next` | `true`/`1`/`yes` if this line's speaker genuinely talks over the next line (simultaneous speech). Default `false` — adjacent lines are trimmed to never overlap. |

Any other columns (`dialogue_zh`, `speaker_zh`, existing `start_time`/
`end_time`, ...) are ignored — this tool only ever *produces* timing, it
never reads existing timing as input.

### Output: `--output`

```
scene_id,line_id,start_time,end_time,confidence,review_required
scene8,line_000001,4.32,6.71,0.94,false
scene8,line_000002,6.83,9.05,0.58,true
```

- `start_time`/`end_time`: decimal seconds (`HTMLVideoElement.currentTime`-compatible), rounded to 2 places. Blank when no alignment could be found at all.
- `confidence`: 0–1, blending how much of the line's text was matched, match quality, and WhisperX's own per-word alignment score.
- `review_required`: `true` if confidence is below `--confidence-threshold` (default `0.65`) **or** validation had to intervene (forced overlap trim, clamped to video duration, out-of-order result, no match found). Always check these lines by ear before publishing.

Pass `--include-notes` to add a 7th `notes` column explaining *why* each
line was flagged (useful while reviewing; omit it if you want the CSV
shape to exactly match the columns above for a downstream import).

## Caching (and iterating without re-running WhisperX)

Downloads and transcripts are cached under `--cache-dir` (default
`.align_cache/<scene-id>/`): `video.<ext>`, `audio.wav`, `words.json`.
Re-running the same `--scene-id` reuses them; pass `--force-redownload`
or `--force-retranscribe` to bypass the cache.

To tune matching/padding/thresholds without re-running the (slow) ASR
step, point `--words-json` at a cached `words.json` directly:

```bash
python align_scene.py --scene-id scene8 \
  --words-json .align_cache/scene8/words.json \
  --video-duration 187.4 \
  --dialogue-csv dialogue.csv --output aligned_scene8.csv
```

`words.json` is a plain list of `{"text", "start", "end", "score"}`
objects in ascending time order — the same shape `align_scene.py` writes
to the cache after a real WhisperX run. `tests/fixtures/words_demo.json`
is a small worked example you can run right away (see below).

## Try it without a real video

`tests/fixtures/` has a synthetic scene (`words_demo.json` +
`dialogue_demo.csv`) that exercises the full CLI, including a
deliberately garbled line and an unmatched line, with no video download
or WhisperX install required:

```bash
python align_scene.py --scene-id demo \
  --words-json tests/fixtures/words_demo.json \
  --video-duration 12.0 \
  --dialogue-csv tests/fixtures/dialogue_demo.csv \
  --output /tmp/aligned_demo.csv --include-notes
```

## Tests

```bash
pip install pytest  # already in requirements.txt
pytest
```

Tests cover CSV parsing/validation, the fuzzy-matching algorithm, and
timestamp validation/padding/overlap resolution — none of them require
`whisperx`, `torch`, or `ffmpeg` to be installed.
