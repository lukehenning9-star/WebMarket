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
  1. Creates previews/<slug>/          — the client's website folder
  2. Creates previews/<slug>/meta.json — business info for the search bar
  3. Creates previews/<slug>/index.html — placeholder (replace with real site)
  4. Runs build.py to regenerate previews/manifest.json immediately

After running this, copy your built website files into previews/<slug>/
(overwriting the placeholder index.html), then commit and push.

On Vercel, build.py runs automatically on every deployment so the manifest
is always up to date — no manual step needed after the initial setup.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date


def slugify(name: str) -> str:
    """Convert a business name to a lowercase-hyphenated slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    return slug


def find_repo_root() -> str:
    """Walk up from cwd to find the repo root (contains build.py)."""
    current = os.path.abspath(".")
    for _ in range(5):
        if os.path.exists(os.path.join(current, "build.py")):
            return current
        current = os.path.dirname(current)
    return os.path.abspath(".")


def main():
    parser = argparse.ArgumentParser(
        description="Add a client website to Website Market",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--name",     required=True,
                        help='Business name,  e.g. "Mario\'s Pizza"')
    parser.add_argument("--category", required=True,
                        help='Category,        e.g. "Italian Restaurant"')
    parser.add_argument("--city",     required=True,
                        help='City and state,  e.g. "Dallas, TX"')
    parser.add_argument("--price",    required=True, type=int,
                        help="Asking price in USD, e.g. 299")
    parser.add_argument("--features", default="Mobile Optimized,Contact Form",
                        help="Comma-separated features")
    parser.add_argument("--email",    default="",
                        help="Client contact email (optional)")
    args = parser.parse_args()

    root        = find_repo_root()
    slug        = slugify(args.name)
    features    = [f.strip() for f in args.features.split(",") if f.strip()]
    folder      = os.path.join(root, "previews", slug)
    meta_path   = os.path.join(folder, "meta.json")
    placeholder = os.path.join(folder, "index.html")

    print()
    print(f"  Adding: {args.name}")
    print(f"  Slug:   {slug}")
    print()

    # ── 1. Create preview directory ──────────────────────────────────────
    os.makedirs(folder, exist_ok=True)
    print(f"  ✓  Created directory: previews/{slug}/")

    # ── 2. Write meta.json ────────────────────────────────────────────────
    meta = {
        "name":         args.name,
        "category":     args.category,
        "city":         args.city,
        "price":        args.price,
        "features":     features,
        "contactEmail": args.email,
        "addedDate":    str(date.today())
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"  ✓  Wrote meta.json:   previews/{slug}/meta.json")

    # ── 3. Drop placeholder index.html ───────────────────────────────────
    if not os.path.exists(placeholder):
        with open(placeholder, "w", encoding="utf-8") as f:
            f.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{args.name}</title>
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
    <h1>{args.name}</h1>
    <p>Replace this file with your built website.</p>
    <p style="margin-top:16px;font-size:0.85rem;opacity:0.55">previews/{slug}/index.html</p>
  </div>
</body>
</html>
""")
        print(f"  ✓  Created placeholder: previews/{slug}/index.html")
    else:
        print(f"  ↷  Skipped placeholder — index.html already exists")

    # ── 4. Regenerate previews/manifest.json ─────────────────────────────
    print()
    build_script = os.path.join(root, "build.py")
    try:
        result = subprocess.run(
            [sys.executable, build_script],
            cwd=root,
            capture_output=True,
            text=True
        )
        print(result.stdout.rstrip())
        if result.returncode != 0:
            print(f"  ⚠  build.py exited with code {result.returncode}")
            if result.stderr:
                print(result.stderr.rstrip())
    except Exception as e:
        print(f"  ⚠  Could not run build.py: {e}")
        print(f"     Run manually:  python build.py")

    # ── 5. Next steps ─────────────────────────────────────────────────────
    print()
    print("  " + "─" * 54)
    print("  NEXT STEPS")
    print("  " + "─" * 54)
    print(f"  1. Copy your built website files into previews/{slug}/")
    print(f"     (Overwrite the placeholder index.html)")
    print(f"  2. Commit and push:")
    print(f"     git add previews/{slug}/")
    print(f'     git commit -m "Add website preview for {args.name}"')
    print(f"     git push")
    print(f"  3. Vercel auto-deploys → build.py runs → manifest updates")
    print(f"     {args.name!r} instantly appears in search. Done!")
    print("  " + "─" * 54)
    print()


if __name__ == "__main__":
    main()
