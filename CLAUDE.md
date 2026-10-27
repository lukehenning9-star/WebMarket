# Website Market

A marketplace where local business owners search their name, preview a website already built for them, and buy it through Stripe. See `README.md` for the architecture.

## Layout

- `public/` — everything Vercel serves (it is the output directory)
  - `index.html`, `purchase.html`, `all-builds.html`, `success.html`
  - `css/styles.css`
  - `js/<page>.js` — one ES module per page; shared code lives in `js/lib/`
  - `previews/<slug>/` — one client's website (`index.html` + `meta.json`)
  - `previews/manifest.json` — generated catalog; never edit by hand
- `api/` — Vercel serverless functions (Node, ES modules); shared helpers in `api/_lib/`
- `scripts/build.py` — regenerates the manifest (Vercel runs it on every deploy)
- `scripts/add-to-market.py` — registers a new client site
- `tools/admin.html` — local-only admin form (`npm run admin`); never deploy it
- `tests/` — `unit/` and `api/` (node:test), `python/` (unittest), `e2e/` (Playwright)

## Adding a new client website

Follow `.claude/skills/new-webmarket-site/SKILL.md`. In short:

```bash
python3 scripts/add-to-market.py \
    --name     "Business Name" \
    --category "Type of Business" \
    --city     "City, ST" \
    --price    500 \
    --features "Online Menu,Contact Form,Mobile Optimized"
```

This creates `public/previews/<slug>/` with `meta.json` and a placeholder `index.html`, and rebuilds the manifest. Copy the built site into that folder (overwriting the placeholder), run `npm test`, commit and push.

The preview renders inside a sandboxed iframe (scripts run, but there is no same-origin access, so no `localStorage`, cookies, or same-folder `fetch()`). Keep CSS/JS relative to the site's own folder.

## Commands

```bash
npm install          # once
npm run dev          # rebuild manifest + serve public/ on http://localhost:8080
npm run admin        # local admin tool on http://localhost:8081/tools/admin.html
npm test             # JS unit/API tests + Python script tests
npm run test:e2e     # Playwright browser tests (desktop + mobile)
```

## Deploying

Push to `main`. Vercel runs `python3 scripts/build.py` and serves `public/`. CI (`.github/workflows/ci.yml`) runs every test suite and fails if the committed manifest is stale.

## Backend

- `api/checkout.js` — creates a Stripe Checkout session; rejects any `businessId` not in the deployed manifest
- `api/checkout-webhook.js` — verifies the Stripe signature and emails purchase / abandoned-checkout alerts; skips repeat deliveries using event IDs and a marker on the subscription's metadata
- `api/contact.js` — demo-request form; length limits, a honeypot field, and a per-instance rate limit

Each handler is built by a `create…Handler({...})` factory so tests can pass in fake Stripe/email clients; the default export wires up the real ones.

Everything under `public/` is downloadable, including each `meta.json`, so only put information there that the business already shows publicly. `contactEmail` is left out of the manifest; leave it empty when unknown.

Main pages run under a strict Content-Security-Policy (`vercel.json`): no inline `<script>`, `<style>`, `style=""` or `on*=` attributes in `public/*.html` or in markup built by `public/js/`. Use classes, the `hidden` attribute, and `addEventListener`. The e2e suite fails on any CSP violation. Security design and the audit are in `SECURITY.md` and `docs/security-audit.md`.

Operational notes (pricing, Stripe IDs, env vars, session log) are in `docs/HANDOFF.md`.
