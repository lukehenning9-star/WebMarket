# Website Market

A landing page platform for displaying restaurant websites built for potential clients. Business owners visit this site, search for their restaurant name, and preview the site built for them before purchasing.

## How it works

- `businesses.json` — registry of all client businesses and their preview paths
- `previews/<slug>/` — each client's built website lives here
- `index.html` + `styles.css` + `app.js` — the landing page and search interface
- `admin.html` — browser-based admin tool for viewing/managing the registry
- `add-to-market.py` — CLI script to register a new business (preferred method)

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
2. Add the entry to `businesses.json`
3. Print next steps

Then **copy your built website files** into `previews/restaurant-name/` (overwriting the placeholder), commit, and push.

## Building a new client website

Build the restaurant website directly in this repo under `previews/`:

```
previews/
  restaurant-name/
    index.html      ← main entry point (required)
    styles.css
    images/
    ...
```

The preview renders inside an iframe on the main site, so the site should be self-contained (all CSS/images relative to its own folder).

## Local development

This site uses `fetch()` to load `businesses.json`, so it must be served over HTTP:

```bash
python -m http.server 8080
# then open: http://localhost:8080
```

## Deploying

Push to the `main` branch — the site is ready for GitHub Pages, Netlify, or Vercel with zero configuration. Just point the root to this directory.

## Configuration

Before going live, replace `YOUR_EMAIL@example.com` in these files:
- `index.html` (appears in the nav CTA, the no-results message, and the CTA section — search for `YOUR_EMAIL`)
- `app.js` (line in `renderResults` for the no-results link, and `openPreview` fallback email)

Per-client purchase emails can be set in `businesses.json` under the `contactEmail` field.
