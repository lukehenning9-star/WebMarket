# Website Market

A landing page platform for displaying restaurant websites built for potential clients. Business owners visit this site, search for their restaurant name, and preview the site built for them before purchasing.

## How it works

- `previews/<slug>/` — each client's built website lives here
- `previews/<slug>/meta.json` — business info (name, category, city, price, features)
- `previews/manifest.json` — auto-generated index of all sites (created by `build.py`)
- `index.html` + `styles.css` + `app.js` — the landing page and search interface
- `admin.html` — browser-based admin tool for viewing/managing the registry
- `add-to-market.py` — CLI script to register a new business (preferred method)
- `build.py` — scans `previews/` and regenerates `manifest.json` (runs on every Vercel deploy)
- `vercel.json` — tells Vercel to run `build.py` before each deployment

## Adding a new client website

After you finish building a restaurant website in this or any other session, register it like this:

```bash
python add-to-market.py \
    --name     "Restaurant Name" \
    --category "Type of Restaurant" \
    --city     "City, ST" \
    --price    299 \
    --features "Online Menu,Contact Form,Mobile Optimized"
```

This will:
1. Create `previews/restaurant-name/` with a placeholder index.html
2. Create `previews/restaurant-name/meta.json` with the business info
3. Regenerate `previews/manifest.json` immediately
4. Print next steps

Then **copy your built website files** into `previews/restaurant-name/` (overwriting the placeholder), commit, and push.

**On Vercel:** `build.py` runs automatically on every deployment, so the manifest is always regenerated fresh. No extra steps needed.

## Building a new client website

Build the restaurant website directly in this repo under `previews/`:

```
previews/
  restaurant-name/
    index.html      ← main entry point (required)
    meta.json       ← business info for search (required)
    styles.css
    images/
    ...
```

The preview renders inside an iframe on the main site, so the site should be self-contained (all CSS/images relative to its own folder).

## Local development

This site uses `fetch()` to load `previews/manifest.json`, so it must be served over HTTP:

```bash
python build.py            # regenerate manifest from meta.json files
python -m http.server 8080 # serve the site
# then open: http://localhost:8080
```

## Deploying

Push to the main branch — Vercel runs `python build.py` automatically, regenerates the manifest, and deploys. Any new `previews/` subfolder pushed to the repo is instantly discoverable in search.

## Configuration

Before going live, replace `YOUR_EMAIL@example.com` in these files:
- `index.html` (appears in the nav CTA, the no-results message, and the CTA section — search for `YOUR_EMAIL`)
- `app.js` (line in `renderResults` for the no-results link, and `openPreview` fallback email)

Per-client purchase emails can be set in each `previews/<slug>/meta.json` under the `contactEmail` field.
