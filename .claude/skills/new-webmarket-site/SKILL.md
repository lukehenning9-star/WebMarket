# WebMarket — Add a New Client Website

## What this repo is
WebMarket is a static landing page where restaurant owners search for their business name and preview a website built for them before purchasing. It lives at `lukehenning9-star/WebMarket`.

## Repo structure (only the parts that matter)
```
WebMarket/
├── index.html            ← the main landing/search page (do not edit)
├── build.py              ← regenerates previews/manifest.json (run after adding a site)
├── add-to-market.py      ← registers a new client (run this after building)
├── previews/
│   ├── manifest.json     ← auto-generated search index (never edit by hand)
│   ├── marios-pizza/     ← example: one client's complete website
│   │   ├── index.html
│   │   └── meta.json
│   └── golden-wok/       ← another example
│       ├── index.html
│       └── meta.json
```

## Your job
Build a complete, self-contained restaurant website and register it so it appears in the WebMarket search bar.

## Step-by-step workflow

### 1. Get the business details
Ask for (or confirm): business name, cuisine type, city/state, phone, address, hours, any menu items or photos to include.

### 2. Build the website
Create the site in `previews/<slug>/` where `<slug>` is the business name in lowercase-hyphenated format (e.g. "Mario's Pizza" → `marios-pizza`).

```
previews/
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
python add-to-market.py \
    --name     "Business Name" \
    --category "Type of Restaurant" \
    --city     "City, ST" \
    --price    299 \
    --features "Online Menu,Contact Form,Mobile Optimized,Google Maps"
```

This creates `previews/<slug>/meta.json` and regenerates `previews/manifest.json`.

### 4. If meta.json already exists (you ran add-to-market.py first)
The script creates a placeholder `index.html`. Replace it with your built site — your `index.html` overwrites the placeholder.

### 5. Commit and push
```bash
git add previews/<slug>/
git commit -m "Add website preview for Business Name"
git push
```

Vercel auto-deploys and runs `build.py`, so the business appears in the WebMarket search bar immediately after the deploy completes (~30 seconds).

## meta.json format (for reference)
```json
{
  "name": "Mario's Pizza",
  "category": "Italian Restaurant",
  "city": "Dallas, TX",
  "price": 299,
  "features": ["Online Menu", "Contact Form", "Mobile Optimized"],
  "contactEmail": ""
}
```

## What NOT to do
- Do not edit `index.html`, `styles.css`, `app.js`, or `build.py` at the repo root
- Do not edit `previews/manifest.json` by hand
- Do not put files outside `previews/<slug>/`
- Do not use absolute URLs or CDN links for assets inside the preview site (they need to work offline/in iframes)
