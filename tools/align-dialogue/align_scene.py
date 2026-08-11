#!/usr/bin/env python3
"""Automated dialogue timestamp alignment for YzEnglish scenes.

Downloads a scene's final video, transcribes + force-aligns its audio with
WhisperX, fuzzy-matches the recognized words against the *existing*
English dialogue transcript (never replacing that text), and writes a CSV
of start_time/end_time/confidence/review_required per line -- ready to
paste back into the Google Sheets Dialogue_Lines tab's start_time/end_time
columns (see google-apps-script/scenes-sync/README.md).

This script only ever reads a public video_url and writes local files; it
does not call Supabase or touch any website/Apps Script code.

Typical usage:

    python align_scene.py \\
        --scene-id scene8 \\
        --video-url "https://.../scene8.mp4" \\
        --dialogue-csv dialogue.csv \\
        --output aligned_scene8.csv

See README.md for setup (ffmpeg, whisperx) and the full flag reference.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Optional

from aligner.io_csv import DialogueCsvError, read_dialogue_csv, write_aligned_csv
from aligner.match import match_lines_to_words
from aligner.media import MediaError, download_video, extract_audio, guess_video_suffix, probe_duration
from aligner.transcribe import load_words_json, run_whisperx, save_words_json
from aligner.types import AlignedLine, Word
from aligner.validate import validate_and_adjust


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Align a scene's dialogue lines to video timestamps using WhisperX forced alignment.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--scene-id", required=True, help="Scene identity, e.g. scene8 (matches Scenes.scene_id).")
    p.add_argument("--video-url", help="Public URL of the final video. Required unless --words-json is given.")
    p.add_argument("--dialogue-csv", required=True, help="CSV of ordered dialogue lines (line_id, speaker, english_text/dialogue_en, line_order[, scene_id]).")
    p.add_argument("--output", required=True, help="Path to write the aligned CSV to.")

    cache = p.add_argument_group("caching")
    cache.add_argument("--cache-dir", default=".align_cache", help="Where downloaded video/audio/transcripts are cached, keyed by scene_id.")
    cache.add_argument("--force-redownload", action="store_true", help="Re-download the video even if a cached copy exists.")
    cache.add_argument("--force-retranscribe", action="store_true", help="Re-run WhisperX even if a cached words.json exists.")
    cache.add_argument("--words-json", help="Skip download+ffmpeg+WhisperX entirely and use this precomputed word-timestamp JSON instead (see README for the format). Useful for iterating on matching without re-running ASR.")
    cache.add_argument("--video-duration", type=float, help="Video duration in seconds, used only with --words-json when no local video file exists to probe. Without this, the video-duration validation check is skipped.")

    whisper = p.add_argument_group("whisperx")
    whisper.add_argument("--whisper-model", default="medium", help="WhisperX model size (tiny/base/small/medium/large-v2/large-v3).")
    whisper.add_argument("--device", default="cpu", choices=["cpu", "cuda"], help="Inference device.")
    whisper.add_argument("--compute-type", default=None, help="WhisperX compute_type override (default: float16 on cuda, int8 on cpu).")
    whisper.add_argument("--language", default="en", help="Spoken language code for transcription + alignment.")

    timing = p.add_argument_group("timing")
    timing.add_argument("--start-pad", type=float, default=0.08, help="Seconds to keep before the first matched word.")
    timing.add_argument("--end-pad", type=float, default=0.12, help="Seconds to keep after the last matched word.")
    timing.add_argument("--min-gap", type=float, default=0.01, help="Minimum gap enforced between adjacent, non-overlapping lines.")
    timing.add_argument("--confidence-threshold", type=float, default=0.65, help="Lines below this confidence are flagged review_required.")

    p.add_argument("--include-notes", action="store_true", help="Add a diagnostic 'notes' column to the output CSV explaining each review flag.")
    return p


def get_words_and_duration(args: argparse.Namespace) -> tuple[List[Word], Optional[float]]:
    if args.words_json:
        words = load_words_json(Path(args.words_json))
        return words, args.video_duration

    if not args.video_url:
        raise SystemExit("--video-url is required unless --words-json is given.")

    cache_dir = Path(args.cache_dir) / args.scene_id
    video_path = cache_dir / f"video{guess_video_suffix(args.video_url)}"
    audio_path = cache_dir / "audio.wav"
    words_path = cache_dir / "words.json"

    if args.force_redownload or not video_path.exists():
        download_video(args.video_url, video_path)
    else:
        print(f"Using cached video: {video_path}")

    duration = probe_duration(video_path)

    if args.force_retranscribe or not words_path.exists():
        extract_audio(video_path, audio_path)
        print(f"Running WhisperX ({args.whisper_model} on {args.device})... this can take a while.")
        words = run_whisperx(
            audio_path,
            language=args.language,
            model_name=args.whisper_model,
            device=args.device,
            compute_type=args.compute_type,
        )
        save_words_json(words, words_path)
    else:
        print(f"Using cached transcript: {words_path}")
        words = load_words_json(words_path)

    return words, duration


def print_summary(aligned: List[AlignedLine], threshold: float) -> None:
    total = len(aligned)
    flagged = sum(1 for a in aligned if a.review_required)
    unmatched = sum(1 for a in aligned if a.start_time is None)
    print(f"\n{total} line(s) aligned. {flagged} flagged for manual review (confidence < {threshold} or a validation issue), {unmatched} with no match at all.")
    for a in aligned:
        if a.review_required:
            reason = "; ".join(a.notes) if a.notes else "low confidence"
            print(f"  REVIEW line_id={a.line_id} confidence={a.confidence:.2f} -- {reason}")


def main(argv: Optional[List[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)

    try:
        dialogue_lines = read_dialogue_csv(args.dialogue_csv, scene_id=args.scene_id)
    except DialogueCsvError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    try:
        words, duration = get_words_and_duration(args)
    except MediaError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"{len(dialogue_lines)} dialogue line(s), {len(words)} recognized word(s), video duration={duration}")

    matches = match_lines_to_words(dialogue_lines, words)
    aligned = validate_and_adjust(
        matches,
        scene_id=args.scene_id,
        video_duration=duration,
        start_pad=args.start_pad,
        end_pad=args.end_pad,
        min_gap=args.min_gap,
        confidence_threshold=args.confidence_threshold,
    )

    write_aligned_csv(args.output, aligned, include_notes=args.include_notes)
    print(f"Wrote {args.output}")
    print_summary(aligned, args.confidence_threshold)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
