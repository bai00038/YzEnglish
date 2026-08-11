"""Video download, audio extraction, and duration probing.

Shells out to the system `ffmpeg`/`ffprobe` binaries -- see this tool's
README for install instructions. Nothing here touches the website; this
only ever reads a public video_url and writes into the local cache dir.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import requests

_CHUNK_SIZE = 1024 * 1024


class MediaError(RuntimeError):
    pass


def guess_video_suffix(video_url: str) -> str:
    path = urlparse(video_url).path
    suffix = Path(path).suffix
    return suffix if suffix else ".mp4"


def download_video(video_url: str, dest_path: Path, *, chunk_size: int = _CHUNK_SIZE) -> Path:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest_path.with_suffix(dest_path.suffix + ".part")

    with requests.get(video_url, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        written = 0
        with tmp_path.open("wb") as f:
            for chunk in resp.iter_content(chunk_size=chunk_size):
                if not chunk:
                    continue
                f.write(chunk)
                written += len(chunk)
                if total:
                    pct = 100 * written / total
                    print(f"\rDownloading video: {written / 1e6:.1f}MB / {total / 1e6:.1f}MB ({pct:.0f}%)", end="")
        if total:
            print()

    tmp_path.replace(dest_path)
    return dest_path


def extract_audio(video_path: Path, audio_path: Path, *, sample_rate: int = 16000) -> Path:
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(video_path),
        "-vn",
        "-ac", "1",
        "-ar", str(sample_rate),
        "-f", "wav",
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise MediaError(
            f"ffmpeg failed to extract audio from {video_path}:\n{result.stderr[-4000:]}"
        )
    return audio_path


def probe_duration(media_path: Path) -> float:
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        str(media_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise MediaError(f"ffprobe failed on {media_path}:\n{result.stderr[-2000:]}")
    try:
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        raise MediaError(f"could not parse ffprobe duration output for {media_path}: {result.stdout}") from exc
