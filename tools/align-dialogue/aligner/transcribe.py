"""WhisperX transcription + forced alignment -> word-level timestamps.

whisperx/torch are only imported inside run_whisperx(), so everything
else in this tool (matching, validation, CSV I/O, tests) works without
those heavy dependencies installed -- useful for iterating on the
fuzzy-matching logic against a cached `words.json` via --words-json.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from .types import Word


def run_whisperx(
    audio_path: Path,
    *,
    language: str = "en",
    model_name: str = "medium",
    device: str = "cpu",
    compute_type: Optional[str] = None,
) -> List[Word]:
    """Transcribe + force-align audio_path, returning word-level timestamps
    in ascending time order."""
    try:
        import whisperx
    except ImportError as exc:
        raise RuntimeError(
            "whisperx is not installed. Run `pip install -r requirements.txt` "
            "(see this tool's README for the ffmpeg/torch prerequisites), or "
            "pass --words-json to skip transcription with a precomputed word list."
        ) from exc

    # torch>=2.6 defaults torch.load(weights_only=True), which rejects the
    # omegaconf/typing/lightning internals baked into pyannote's VAD
    # checkpoint (loaded internally by whisperx for voice activity
    # detection, via lightning_fabric's cloud_io.load -- not something
    # this tool calls directly, so allowlisting individual globals one
    # `Unsupported global` error at a time isn't practical). Falling back
    # to weights_only=False here is the fix torch's own error message
    # recommends as option 1 -- acceptable because this checkpoint is
    # whisperx/pyannote's own pinned, pretrained model download from
    # Hugging Face, not arbitrary user-supplied data.
    try:
        import torch
        _orig_torch_load = torch.load

        def _torch_load_weights_only_false(*a, **kw):
            # lightning_fabric passes weights_only=None explicitly (its own
            # "unset" sentinel), which setdefault() would not override.
            if kw.get("weights_only") is None:
                kw["weights_only"] = False
            return _orig_torch_load(*a, **kw)

        torch.load = _torch_load_weights_only_false
    except ImportError:
        pass

    if compute_type is None:
        compute_type = "float16" if device == "cuda" else "int8"

    model = whisperx.load_model(model_name, device, compute_type=compute_type)
    audio = whisperx.load_audio(str(audio_path))
    result = model.transcribe(audio, language=language)

    align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
    aligned = whisperx.align(
        result["segments"],
        align_model,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    words: List[Word] = []
    for seg in aligned.get("word_segments", []):
        # WhisperX occasionally can't align a word (usually stray
        # punctuation) and omits start/end -- skip those rather than
        # guessing a timestamp for them.
        if "start" not in seg or "end" not in seg:
            continue
        words.append(
            Word(
                text=str(seg.get("word", "")).strip(),
                start=float(seg["start"]),
                end=float(seg["end"]),
                score=float(seg["score"]) if seg.get("score") is not None else None,
            )
        )

    words.sort(key=lambda w: w.start)
    return words


def save_words_json(words: List[Word], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {"text": w.text, "start": w.start, "end": w.end, "score": w.score}
        for w in words
    ]
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_words_json(path: Path) -> List[Word]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return [
        Word(
            text=item["text"],
            start=float(item["start"]),
            end=float(item["end"]),
            score=(float(item["score"]) if item.get("score") is not None else None),
        )
        for item in payload
    ]
