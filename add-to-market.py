#!/usr/bin/env python3
"""
add-to-market.py — Register a new restaurant website with Website Market.

USAGE:
    python add-to-market.py \\
        --name     "Mario's Pizza" \\
        --category "Italian Restaurant" \\
        --city     "Dallas, TX" \\
        --price    299 \\
        --features "Online Menu,Contact Form,Mobile Optimized,Google Maps"

This script:
  1. Creates the preview directory:  previews/<slug>/
  2. Drops in a placeholder index.html (replace with your real built site)
  3. Appends the business entry to businesses.json
  4. Prints next steps

Run this from the WebMarket root directory.
After running it, copy your built website files into previews/<slug>/
and make sure the main file is named index.html.
"""

import argparse
import json
import os
import re
import sys
from datetime import date


# ──────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────

def slugify(name: str) -> str:
    """Turn a business name into a URL-safe directory slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)   # strip non-alphanumeric
    slug = re.sub(r"\s+", "-", slug).strip("-")  # spaces → hyphens
    return slug


def find_repo_root() -> str:
    """Walk up from the current directory to find businesses.json."""
    current = os.path.abspath(".")
    for _ in range(5):
        if os.path.exists(os.path.join(current, "businesses.json")):
            return current
        current = os.path.dirname(current)
    return os.path.abspath(".")  # fall back to cwd


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Add a client website to Website Market",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--name",     required=True,
                        help='Business name, e.g. "Mario\'s Pizza"')
    parser.add_argument("--category", required=True,
                        help='Category, e.g. "Italian Restaurant"')
    parser.add_argument("--city",     required=True,
                        help='City and state, e.g. "Dallas, TX"')
    parser.add_argument("--price",    required=True, type=int,
                        help="Asking price in USD, e.g. 299")
    parser.add_argument("--features", default="Mobile Optimized,Contact Form",
                        help="Comma-separated feature list (default: Mobile Optimized,Contact Form)")
    parser.add_argument("--email",    default="",
                        help="Client email for purchase follow-up (optional)")
    args = parser.parse_args()

    root         = find_repo_root()
    slug         = slugify(args.name)
    features     = [f.strip() for f in args.features.split(",") if f.strip()]
    preview_dir  = os.path.join(root, "previews", slug)
    json_path    = os.path.join(root, "businesses.json")
    placeholder  = os.path.join(preview_dir, "index.html")

    print()
    print(f"  Adding: {args.name}")
    print(f"  Slug:   {slug}")
    print()

    # ── 1. Create preview directory ──────────────────────────────────────
    os.makedirs(preview_dir, exist_ok=True)
    print(f"  ✓  Created directory: previews/{slug}/")

    # ── 2. Drop in placeholder index.html ────────────────────────────────
    if not os.path.exists(placeholder):
        with open(placeholder, "w") as f:
            f.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{args.name}</title>
<style>
  body {{
    font-family: sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    background: #f8f4ee;
    color: #2a2016;
  }}
  .box {{
    text-align: center;
    padding: 60px 40px;
    max-width: 480px;
  }}
  h1 {{ font-size: 2rem; margin-bottom: 12px; }}
  p  {{ color: #8a7a60; line-height: 1.7; }}
  .badge {{
    display: inline-block;
    margin-bottom: 24px;
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #b87408;
    border: 1px solid rgba(184,116,8,0.3);
    padding: 5px 12px;
    border-radius: 2px;
  }}
</style>
</head>
<body>
  <div class="box">
    <span class="badge">Coming Soon</span>
    <h1>{args.name}</h1>
    <p>This is a placeholder. Replace this file with your built website.</p>
    <p style="margin-top:16px;font-size:0.85rem;opacity:0.6">
      previews/{slug}/index.html
    </p>
  </div>
</body>
</html>
""")
        print(f"  ✓  Created placeholder: previews/{slug}/index.html")
    else:
        print(f"  ↷  Skipped placeholder — index.html already exists")

    # ── 3. Read existing businesses.json ─────────────────────────────────
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            try:
                businesses = json.load(f)
            except json.JSONDecodeError as e:
                print(f"  ✗  businesses.json is invalid JSON: {e}")
                sys.exit(1)
    else:
        print(f"  ⚠  businesses.json not found — creating a new one")
        businesses = []

    # ── 4. Check for duplicate ────────────────────────────────────────────
    existing_ids = [b.get("id") for b in businesses]
    if slug in existing_ids:
        print(f"  ⚠  A business with id '{slug}' already exists in businesses.json")
        print(f"     Edit businesses.json manually if you want to update it.")
        print()
    else:
        # ── 5. Append new entry ───────────────────────────────────────────
        entry = {
            "id":          slug,
            "name":        args.name,
            "category":    args.category,
            "city":        args.city,
            "price":       args.price,
            "previewPath": f"previews/{slug}",
            "features":    features,
            "contactEmail": args.email,
            "addedDate":   str(date.today())
        }
        businesses.append(entry)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(businesses, f, indent=2, ensure_ascii=False)
            f.write("\n")

        print(f"  ✓  Added entry to businesses.json")
        print(f"     Total businesses in registry: {len(businesses)}")

    # ── 6. Next steps ─────────────────────────────────────────────────────
    print()
    print("  " + "─" * 52)
    print("  NEXT STEPS")
    print("  " + "─" * 52)
    print(f"  1. Copy your built website into:  previews/{slug}/")
    print(f"     Make sure there is an index.html in that folder.")
    print(f"  2. Commit and push:")
    print(f"     git add previews/{slug}/ businesses.json")
    print(f'     git commit -m "Add website preview for {args.name}"')
    print(f"     git push")
    print(f"  3. Done — {args.name!r} will appear in search on Website Market!")
    print("  " + "─" * 52)
    print()


if __name__ == "__main__":
    main()
