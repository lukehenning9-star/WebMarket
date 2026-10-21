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
    --price    500 \
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

The preview renders inside a sandboxed iframe on the main site (scripts run, but there is no same-origin access, so no `localStorage`, cookies, or same-folder `fetch()`). Keep CSS/JS relative to the site's own folder. See `.claude/skills/new-webmarket-site/SKILL.md` for the full rules.

## Local development

This site uses `fetch()` to load `previews/manifest.json`, so it must be served over HTTP:

```bash
python build.py            # regenerate manifest from meta.json files
python -m http.server 8080 # serve the site
# then open: http://localhost:8080
```

## Deploying

Push to the main branch — Vercel runs `python build.py` automatically, regenerates the manifest, and deploys. Any new `previews/` subfolder pushed to the repo is instantly discoverable in search.

## Backend

Three Vercel serverless functions in `api/`:
- `checkout.js` — creates a Stripe Checkout session; rejects any `businessId` not in the deployed `previews/manifest.json`
- `checkout-webhook.js` — verifies the Stripe signature and emails purchase / abandoned-checkout alerts; skips repeat deliveries using event IDs and a marker on the subscription's metadata
- `contact.js` — demo-request form; length limits, a honeypot field, and a per-instance rate limit

Per-client contact emails can be set in each `previews/<slug>/meta.json` under the `contactEmail` field (not yet used by any automated flow).
