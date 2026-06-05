#!/usr/bin/env python3
"""
build.py — Auto-generate previews/manifest.json from preview subfolders.

Vercel runs this automatically on every deployment (see vercel.json).
Run it manually any time after adding or changing a client folder:

    python build.py

How it works:
  1. Scans every subdirectory inside previews/
  2. Reads that folder's meta.json for business info
  3. Writes a combined previews/manifest.json that the search bar uses

A folder is included if it contains index.html (the actual site).
If a folder has no meta.json, a minimal entry is created from the slug.
"""

import json
import os

PREVIEWS_DIR = "previews"
MANIFEST_PATH = os.path.join(PREVIEWS_DIR, "manifest.json")


def build_manifest():
    if not os.path.isdir(PREVIEWS_DIR):
        print(f"  ✗  '{PREVIEWS_DIR}/' directory not found. Run from the repo root.")
        return

    entries = []

    for slug in sorted(os.listdir(PREVIEWS_DIR)):
        folder = os.path.join(PREVIEWS_DIR, slug)

        # Only process directories that have an index.html
        if not os.path.isdir(folder):
            continue
        if not os.path.exists(os.path.join(folder, "index.html")):
            continue

        meta_path = os.path.join(folder, "meta.json")

        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        else:
            # No meta.json — derive a display name from the folder slug
            display_name = slug.replace("-", " ").title()
            meta = {
                "name": display_name,
                "category": "Restaurant",
                "city": "",
                "price": 0,
                "features": [],
                "contactEmail": ""
            }

        entry = {
            "id":           slug,
            "name":         meta.get("name", slug),
            "category":     meta.get("category", "Restaurant"),
            "city":         meta.get("city", ""),
            "price":        meta.get("price", 0),
            "previewPath":  f"previews/{slug}",
            "features":     meta.get("features", []),
            "contactEmail": meta.get("contactEmail", ""),
            "tier":         meta.get("tier", 1)
        }
        entries.append(entry)

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
        f.write("\n")

    count = len(entries)
    print(f"  ✓  Generated {MANIFEST_PATH}  ({count} site{'s' if count != 1 else ''})")
    for e in entries:
        city = f" · {e['city']}" if e["city"] else ""
        print(f"       {e['name']}{city}  →  {e['previewPath']}/")


if __name__ == "__main__":
    build_manifest()
