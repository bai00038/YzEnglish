#!/usr/bin/env python3
"""Export all content tables from Supabase (read-only, anon/publishable key)
into local JSON files for the OSS migration audit.

Usage: SUPABASE_KEY=<key> python3 tools/export_supabase.py
"""
import json
import os
import sys
import urllib.request
import urllib.parse

BASE_URL = "https://aqztkhbauyzbcmfqxlia.supabase.co"
KEY = os.environ.get("SUPABASE_KEY", "").strip()
if not KEY:
    print("SUPABASE_KEY env var required", file=sys.stderr)
    sys.exit(1)

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "supabase", "export_20261001")
os.makedirs(OUT_DIR, exist_ok=True)

TABLES = [
    "categories",
    "scenes",
    "dialogue_lines",
    "key_expressions",
    "culture_tips",
    "pdf_resources",
    "resource_collections",
]


def fetch_all(table: str):
    rows = []
    page_size = 1000
    offset = 0
    while True:
        params = urllib.parse.urlencode(
            {"select": "*", "limit": page_size, "offset": offset, "order": "id.asc"}
        )
        url = f"{BASE_URL}/rest/v1/{table}?{params}"
        req = urllib.request.Request(
            url,
            headers={
                "apikey": KEY,
                "Authorization": f"Bearer {KEY}",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                batch = json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - report and stop cleanly
            print(f"!! failed fetching {table} at offset {offset}: {e}", file=sys.stderr)
            break
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


summary = {}
for table in TABLES:
    rows = fetch_all(table)
    path = os.path.join(OUT_DIR, f"{table}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    summary[table] = len(rows)
    print(f"{table}: {len(rows)} rows -> {path}")

with open(os.path.join(OUT_DIR, "_summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=1)
print("done")
