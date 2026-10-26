# WebMarket — Add a New Client Website

## What this repo is
WebMarket is a static landing page where restaurant owners search for their business name and preview a website built for them before purchasing. It lives at `lukehenning9-star/WebMarket`.

## Repo structure (only the parts that matter)
```
WebMarket/
├── scripts/
│   ├── build.py              ← regenerates public/previews/manifest.json
│   └── add-to-market.py      ← registers a new client (run this after building)
└── public/
    ├── index.html            ← the main landing/search page (do not edit)
    └── previews/
        ├── manifest.json     ← auto-generated search index (never edit by hand)
        ├── the-eatery/       ← example: one client's complete website
        │   ├── index.html
        │   └── meta.json
        └── papa-jacks-bbq/   ← another example
            ├── index.html
            └── meta.json
```

## Your job
Build a complete, self-contained restaurant website and register it so it appears in the WebMarket search bar.

## Step-by-step workflow

### 1. Get the business details
Ask for (or confirm): business name, cuisine type, city/state, phone, address, hours, any menu items or photos to include.

### 2. Build the website
Create the site in `public/previews/<slug>/` where `<slug>` is the business name in lowercase-hyphenated format (e.g. "Mario's Pizza" → `marios-pizza`).

```
public/previews/
  <slug>/
    index.html    ← required — the full restaurant website
    styles.css    ← optional but preferred (keep CSS separate)
    images/       ← optional
```

**The site must be self-contained** — all CSS, images, and JS must use paths relative to its own folder (e.g. `./styles.css`, `./images/logo.png`). It will render inside an iframe on the main WebMarket site.

**Required pages/sections** (all on one scrolling page is fine):
- Hero with restaurant name + tagline
- Menu highlights (at least 4–6 items with prices)
- Hours and location/address
- Contact info (phone, email)

**Design bar**: Make it look like a real, professional restaurant website — proper typography, warm colors appropriate to the cuisine, mobile responsive. Do not use placeholder lorem ipsum text.

### 3. Register the site — run this command
```bash
python3 scripts/add-to-market.py \
    --name     "Business Name" \
    --category "Type of Restaurant" \
    --city     "City, ST" \
    --price    500 \
    --features "Online Menu,Contact Form,Mobile Optimized,Google Maps"
```

This creates `public/previews/<slug>/meta.json` and regenerates `public/previews/manifest.json`. It refuses to overwrite an existing `meta.json` unless you pass `--force`.

### 4. If meta.json already exists (you ran add-to-market.py first)
The script creates a placeholder `index.html`. Replace it with your built site — your `index.html` overwrites the placeholder.

### 5. Commit and push
```bash
npm test                      # catches a stale manifest or missing meta.json
git add public/previews/<slug>/
git commit -m "Add website preview for Business Name"
git push
```

Vercel auto-deploys and runs `scripts/build.py`, so the business appears in the WebMarket search bar immediately after the deploy completes (~30 seconds).

## meta.json format (for reference)
```json
{
  "name": "Mario's Pizza",
  "category": "Italian Restaurant",
  "city": "Dallas, TX",
  "price": 500,
  "features": ["Online Menu", "Contact Form", "Mobile Optimized"],
  "contactEmail": ""
}
```

## What NOT to do
- Do not edit the platform files (`public/*.html`, `public/css/`, `public/js/`, `scripts/`, `api/`) when adding a site
- Do not edit `public/previews/manifest.json` by hand
- Do not put files outside `public/previews/<slug>/`
- Do not use random-image services (`picsum.photos`, `loremflickr.com`) — they return arbitrary photos that don't match the content. Use local files in the site folder, or a specific photo URL from Unsplash/Pexels that you have checked shows the right subject
- Do not rely on `localStorage`, `sessionStorage`, cookies, or `fetch()` to files in your folder — previews run in a sandboxed iframe with no same-origin access (see below)

## Iframe sandbox rules
The preview iframe uses `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-forms"`. That means:
- Scripts run, but the page gets an opaque origin: storage APIs throw and same-folder `fetch()`/`XMLHttpRequest` fail
- Linked CSS, JS, images and Google Fonts load normally
- External links should use `target="_blank"` (popups are allowed and open un-sandboxed)
- A script may navigate the top window (e.g. for `tel:` links) only in response to a user click
