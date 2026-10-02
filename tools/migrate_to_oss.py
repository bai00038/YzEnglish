#!/usr/bin/env python3
"""Migrate website scenes: Supabase JSON export + R2 assets -> Alibaba OSS.

Layout per scene: content/<NEW_ID>/cover.jpg | video.mp4 | handout.pdf | scene.json
Also writes content/index.json (pack listing).

Credentials via env: OSS_KEY_ID / OSS_KEY_SECRET (never written to disk).
"""
import json
import os
import sys
import urllib.parse
import urllib.request

import oss2

EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "supabase", "export_20261001")
TMP_DIR = "/tmp/oss-migration"
os.makedirs(TMP_DIR, exist_ok=True)

KEY_ID = os.environ.get("OSS_KEY_ID", "").strip()
KEY_SECRET = os.environ.get("OSS_KEY_SECRET", "").strip()
if not KEY_ID or not KEY_SECRET:
    print("OSS_KEY_ID / OSS_KEY_SECRET required", file=sys.stderr)
    sys.exit(1)

BUCKET_NAME = "yz-english-videos"
ENDPOINT = "https://oss-ap-southeast-1.aliyuncs.com"
PUBLIC_BASE = "https://go.learnyzenglish.com"

# old scene id -> new content id (approved 2026-10-01)
ID_MAP = {
    28: "SH-02-001",  # shopping-for-clothes
    31: "SH-02-002",  # requesting-a-price-adjustment-at-costco
    35: "DL-01-001",  # dining-at-a-turkish-restaurant
    40: "HC-02-001",  # getting-a-dental-filling
    41: "HC-02-002",  # dental-implant-surgery
    42: "SF-01-001",  # parent-teacher-meeting
    43: "HC-03-001",  # picking-up-a-prescription
}

CONTENT_TYPES = {
    "cover.jpg": "image/jpeg",
    "video.mp4": "video/mp4",
    "handout.pdf": "application/pdf",
    "scene.json": "application/json",
}


def load(name):
    with open(os.path.join(EXPORT_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def download(url, dest):
    # quote spaces etc. in R2 urls ("price adjustment.mp4")
    parts = urllib.parse.urlsplit(url)
    safe_url = urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, urllib.parse.quote(parts.path), parts.query, parts.fragment)
    )
    req = urllib.request.Request(safe_url, headers={"User-Agent": "yz-migration/1.0"})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            f.write(chunk)
    return dest


def main():
    scenes = {s["id"]: s for s in load("scenes.json")}
    dlg_lines = load("dialogue_lines.json")
    key_exprs = load("key_expressions.json")
    tips = load("culture_tips.json")

    auth = oss2.Auth(KEY_ID, KEY_SECRET)
    bucket = oss2.Bucket(auth, ENDPOINT, BUCKET_NAME)
    # sanity: prove the write path works before the long downloads
    bucket.list_objects(prefix="content/", max_keys=1).object_list

    index = []
    for old_id, new_id in ID_MAP.items():
        s = scenes.get(old_id)
        if not s:
            print(f"!! scene {old_id} missing from export, skipped")
            continue
        prefix = f"content/{new_id}/"
        print(f"--- {new_id} ({s.get('slug')})")

        assets = {}
        for src_url, fname in [
            (s.get("photo_url"), "cover.jpg"),
            (s.get("video_url"), "video.mp4"),
            (s.get("pdf_url"), "handout.pdf"),
        ]:
            if not src_url:
                print(f"    {fname}: no source url, skipped")
                continue
            local = os.path.join(TMP_DIR, f"{new_id}-{fname}")
            try:
                download(src_url, local)
                size = os.path.getsize(local)
                key = prefix + fname
                bucket.put_object_from_file(
                    key, local, headers={"Content-Type": CONTENT_TYPES[fname]}
                )
                assets[fname.split(".")[0]] = f"{PUBLIC_BASE}/{key}"
                print(f"    {fname}: {size/1048576:.1f} MB -> {key}")
                os.remove(local)
            except Exception as e:  # noqa: BLE001
                print(f"    !! {fname} failed: {e}")

        lines = sorted(
            (r for r in dlg_lines if r.get("scene_id") == old_id),
            key=lambda r: r.get("line_order") or 0,
        )
        dialogue = [
            {
                "speaker": r.get("speaker"),
                "speakerZh": r.get("speaker_zh"),
                "en": r.get("dialogue_en"),
                "zh": r.get("dialogue_zh"),
                "start": r.get("start_time"),
                "end": r.get("end_time"),
            }
            for r in lines
        ]
        # fallback to legacy dialogue jsonb if no dialogue_lines rows
        if not dialogue and s.get("dialogue"):
            dialogue = s["dialogue"]

        scene_json = {
            "id": new_id,
            "legacy_scene_id": old_id,
            "legacy_slug": s.get("slug"),
            "title_en": s.get("title_en"),
            "title_zh": s.get("title_zh"),
            "category": s.get("category_id"),
            "region": s.get("region"),
            "level": s.get("level"),
            "duration": s.get("duration"),
            "description": s.get("description"),
            "scene_setup": {"en": s.get("scene_setup_en"), "zh": s.get("scene_setup_zh")},
            "learning_goal": {"en": s.get("learning_goal_en"), "zh": s.get("learning_goal_zh")},
            "dialogue": dialogue,
            "key_expressions": [
                {"en": r.get("expression_en"), "zh": r.get("expression_zh")}
                for r in sorted(
                    (r for r in key_exprs if r.get("scene_id") == old_id),
                    key=lambda r: r.get("sort_order") or 0,
                )
            ],
            "culture_tips": [
                {"en": r.get("body_en"), "zh": r.get("body_zh")}
                for r in sorted(
                    (r for r in tips if r.get("scene_id") == old_id),
                    key=lambda r: r.get("sort_order") or 0,
                )
            ],
            "subtitle_cues": s.get("subtitle_cues"),
            "assets": assets,
        }
        scene_key = prefix + "scene.json"
        bucket.put_object(
            scene_key,
            json.dumps(scene_json, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        print(f"    scene.json -> {scene_key} ({len(dialogue)} dialogue lines)")
        index.append(
            {
                "id": new_id,
                "title_en": s.get("title_en"),
                "title_zh": s.get("title_zh"),
                "level": s.get("level"),
                "scene_json": f"{PUBLIC_BASE}/{scene_key}",
            }
        )

    index_key = "content/index.json"
    bucket.put_object(
        index_key,
        json.dumps({"packs": index}, ensure_ascii=False, indent=1).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    print(f"index.json -> {index_key} ({len(index)} packs)")
    print("MIGRATION DONE")


if __name__ == "__main__":
    main()
