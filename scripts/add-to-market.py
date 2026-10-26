#!/usr/bin/env python3
"""
add-to-market.py — Register a new client website with Website Market.

USAGE (from the repo root):
    python3 scripts/add-to-market.py \\
        --name     "Mario's Pizza" \\
        --category "Italian Restaurant" \\
        --city     "Dallas, TX" \\
        --price    500 \\
        --features "Online Menu,Contact Form,Mobile Optimized,Google Maps"

This script:
  1. Creates public/previews/<slug>/            — the client's website folder
  2. Writes  public/previews/<slug>/meta.json   — business info for search
  3. Creates public/previews/<slug>/index.html  — placeholder (replace with the real site)
  4. Regenerates public/previews/manifest.json  so the site is searchable immediately

Then copy the built website into public/previews/<slug>/ (overwriting the
placeholder index.html), commit, and push. Vercel regenerates the manifest on
every deploy.
"""

import argparse
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import DEFAULT_PREVIEWS_DIR, build_manifest  # noqa: E402


def slugify(name: str) -> str:
    """Convert a business name to a lowercase-hyphenated slug ("Mario's Pizza" -> "marios-pizza")."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")
    return slug


PLACEHOLDER_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name}</title>
<style>
  body {{
    font-family: sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; margin: 0; background: #f8f4ee; color: #2a2016;
  }}
  .box {{ text-align: center; padding: 60px 40px; max-width: 480px; }}
  h1   {{ font-size: 2rem; margin-bottom: 12px; }}
  p    {{ color: #8a7a60; line-height: 1.7; }}
  .badge {{
    display: inline-block; margin-bottom: 24px;
    font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: #b87408; border: 1px solid rgba(184,116,8,0.3);
    padding: 5px 12px; border-radius: 2px;
  }}
</style>
</head>
<body>
  <div class="box">
    <span class="badge">Coming Soon</span>
    <h1>{name}</h1>
    <p>Replace this file with your built website.</p>
    <p style="margin-top:16px;font-size:0.85rem;opacity:0.55">public/previews/{slug}/index.html</p>
  </div>
</body>
</html>
"""


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Add a client website to Website Market",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--name", required=True, help='Business name, e.g. "Mario\'s Pizza"')
    parser.add_argument("--category", required=True, help='Category, e.g. "Italian Restaurant"')
    parser.add_argument("--city", required=True, help='City and state, e.g. "Dallas, TX"')
    parser.add_argument("--price", required=True, type=int, help="Setup price in USD, e.g. 500")
    parser.add_argument("--features", default="Mobile Optimized,Contact Form",
                        help="Comma-separated features")
    parser.add_argument("--email", default="", help="Client contact email (optional)")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite meta.json if the site is already registered")
    parser.add_argument("--previews-dir", type=Path, default=DEFAULT_PREVIEWS_DIR,
                        help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)

    slug = slugify(args.name)
    if not slug:
        print(f"  ✗  Can't make a folder name from {args.name!r}; use letters or numbers.", file=sys.stderr)
        return 1

    folder = Path(args.previews_dir) / slug
    meta_path = folder / "meta.json"
    placeholder = folder / "index.html"

    if meta_path.exists() and not args.force:
        print(f"  ✗  {meta_path} already exists. Pass --force to overwrite it.", file=sys.stderr)
        return 1

    print(f"\n  Adding: {args.name}\n  Slug:   {slug}\n")

    folder.mkdir(parents=True, exist_ok=True)

    meta = {
        "name": args.name,
        "category": args.category,
        "city": args.city,
        "price": args.price,
        "features": [f.strip() for f in args.features.split(",") if f.strip()],
        "contactEmail": args.email,
        "addedDate": str(date.today()),
    }
    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"  ✓  Wrote {meta_path}")

    if placeholder.exists():
        print("  ↷  Kept existing index.html")
    else:
        placeholder.write_text(
            PLACEHOLDER_TEMPLATE.format(name=html.escape(args.name), slug=slug), encoding="utf-8"
        )
        print(f"  ✓  Created placeholder {placeholder}")

    entries = build_manifest(args.previews_dir)
    print(f"  ✓  Rebuilt manifest ({len(entries)} sites)")

    print(f"""
  Next steps:
    1. Copy the built website into public/previews/{slug}/ (overwrite the placeholder)
    2. git add public/previews/{slug}/ && git commit -m "Add {args.name} preview" && git push
    3. Vercel deploys and the site appears in search
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
