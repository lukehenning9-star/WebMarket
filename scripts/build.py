#!/usr/bin/env python3
"""
build.py — Generate public/previews/manifest.json from the preview folders.

Vercel runs this on every deployment (see vercel.json). Run it locally any time
after adding or changing a site:

    python3 scripts/build.py

Each subfolder of public/previews/ that contains an index.html becomes one
catalog entry. Business details come from that folder's meta.json; a folder
without meta.json gets an entry derived from its folder name. The manifest is
the only data source the website's search reads.
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PREVIEWS_DIR = REPO_ROOT / "public" / "previews"


def load_entry(folder: Path) -> dict:
    """Build one manifest entry for a preview folder."""
    slug = folder.name
    meta_path = folder / "meta.json"

    if meta_path.exists():
        with meta_path.open(encoding="utf-8") as f:
            meta = json.load(f)
        if not isinstance(meta, dict):
            raise ValueError(f"{meta_path}: expected a JSON object")
    else:
        meta = {"name": slug.replace("-", " ").title()}

    features = meta.get("features", [])
    if not isinstance(features, list):
        raise ValueError(f"{meta_path}: 'features' must be a list")

    return {
        "id": slug,
        "name": meta.get("name") or slug,
        "category": meta.get("category", ""),
        "city": meta.get("city", ""),
        "price": meta.get("price", 0),
        "previewPath": f"previews/{slug}",
        "features": features,
    }


def build_manifest(previews_dir: Path = DEFAULT_PREVIEWS_DIR) -> list:
    """Scan previews_dir, write manifest.json into it, and return the entries."""
    previews_dir = Path(previews_dir)
    if not previews_dir.is_dir():
        raise FileNotFoundError(f"previews directory not found: {previews_dir}")

    entries = [
        load_entry(folder)
        for folder in sorted(previews_dir.iterdir())
        if folder.is_dir() and (folder / "index.html").exists()
    ]

    manifest_path = previews_dir / "manifest.json"
    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return entries


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--previews-dir", type=Path, default=DEFAULT_PREVIEWS_DIR)
    args = parser.parse_args(argv)

    try:
        entries = build_manifest(args.previews_dir)
    except (OSError, ValueError) as err:
        print(f"  ✗  {err}", file=sys.stderr)
        return 1

    count = len(entries)
    print(f"  ✓  Generated {args.previews_dir / 'manifest.json'}  ({count} site{'s' if count != 1 else ''})")
    for e in entries:
        city = f" · {e['city']}" if e["city"] else ""
        print(f"       {e['name']}{city}  →  public/{e['previewPath']}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
