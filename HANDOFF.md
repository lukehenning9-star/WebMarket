# WebMarket — Session Handoff

## What this is
A landing page platform at **uswebsitemarket.com** where business owners search their name, find a pre-built professional website, preview it in an iframe modal, and purchase it via Stripe. Luke built the sites in advance and sells them cold-call style.

---

## Current pricing (ALL sites)
- **Setup fee:** $1,000 (one-time, charged on first payment)
- **Monthly:** $100/mo
- **Yearly:** $1,000/yr (saves $200 vs monthly)

All 16 sites are tier 3. The tier 2 concept ($750/$75) has been removed from all code.

---

## Stripe price IDs (LIVE, tier 3 only)
```
setupFee: price_1Tg8cO9Zed1ZaDEwmIeBYzDC   ($1,000 one-time)
monthly:  price_1Tg8ej9Zed1ZaDEwSnfffwrh   ($100/mo)
yearly:   price_1Tg8f49Zed1ZaDEw8kmnjCKj   ($1,000/yr)
```
These are hardcoded in `api/checkout.js`. No tier logic remains.

---

## Environment variables (set in Vercel)
- `STRIPE_SECRET_KEY` — live Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (whsec_...)
- `GMAIL_APP_PASSWORD` — Gmail app password for lukewebsitemarket@gmail.com

---

## Vercel setup
- Deploy triggers on push to `main`
- Build command: `python3 build.py` (regenerates `previews/manifest.json`)
- No framework — pure static + serverless functions in `/api/`
- Stripe webhook endpoint registered at: `https://uswebsitemarket.com/api/checkout-webhook`
  - Listens for: `checkout.session.completed`, `checkout.session.expired`

---

## Key files
| File | Purpose |
|------|---------|
| `index.html` + `styles.css` + `app.js` | Main landing page (search → preview → buy) |
| `purchase.html` + `purchase.js` | "Get your website" direct purchase flow |
| `all-builds.html` + `all-builds.js` | Browse all sites without searching |
| `success.html` | Post-purchase confirmation page |
| `admin.html` | Internal admin view |
| `api/checkout.js` | Creates Stripe Checkout Session |
| `api/checkout-webhook.js` | Emails Luke when purchase completes or is abandoned |
| `api/contact.js` | Handles demo request form submissions (emails Luke) |
| `build.py` | Scans `previews/*/meta.json` and writes `previews/manifest.json` |
| `add-to-market.py` | CLI to register a new business site |
| `previews/manifest.json` | Auto-generated index of all sites (do not edit manually) |

---

## All 16 sites (as of this session)
| Slug | Business | City | Tier |
|------|----------|------|------|
| `610fit-academy` | 610Fit Academy | Waco, TX | 3 |
| `andrews-cleaning-service` | Andrew's Cleaning Service | Wichita, KS | 3 |
| `barks-an-bubbles` | Barks-An-Bubbles | Wichita, KS | 3 |
| `bonjours-puppy-parade` | Bonjour's Puppy Parade | Wichita, KS | 3 |
| `go-dolla-fitness` | Go Dolla Fitness | Wichita, KS | 3 |
| `julius-rib-cage` | Julius Rib Cage | Wichita, KS | 3 |
| `just-like-mamas-kitchen` | Just Like Mama's Kitchen | Wichita, KS | 3 |
| `keep-it-cute-grooming` | Keep it Cute Grooming | Wichita, KS | 3 |
| `lavish-mutts-llc` | Lavish Mutts | Wichita, KS | 3 |
| `midway-custom-detailing` | Midway Custom Detailing | Waco, TX | 3 |
| `nose-to-toes-pet-grooming` | Nose to Toes Pet Grooming | Andover, KS | 3 |
| `papa-jacks-bbq` | Papa Jack's BBQ | Waco, TX | 3 |
| `tanker-bbq-co` | Tanker BBQ Co. | Wichita, KS | 3 |
| `taste-of-flavorz` | Taste of Flavorz | Wichita, KS | 3 |
| `the-dapper-hound` | The Dapper Hound | Wichita, KS | 3 |
| `the-eatery` | The Eatery | Wichita, KS | 3 |

---

## How to add a new client site
```bash
python add-to-market.py \
    --name     "Business Name" \
    --category "Category" \
    --city     "City, ST" \
    --price    1000 \
    --features "Feature 1,Feature 2,Feature 3"
```
Then copy the built website files into `previews/<slug>/`. Commit and push to main — Vercel rebuilds the manifest automatically.

After adding any new site, run:
```bash
python3 -c "
import json, glob
for path in glob.glob('previews/*/meta.json'):
    with open(path) as f: meta = json.load(f)
    meta['tier'] = 3
    with open(path, 'w') as f: json.dump(meta, f, indent=2)
"
python3 build.py
```
This ensures new sites always get tier 3 pricing.

---

## Git branches
- `main` — production (Vercel deploys from here)
- `claude/gifted-ramanujan-aD5r6` — Luke's working branch (kept in sync with main)

Always push to both:
```bash
git push origin claude/gifted-ramanujan-aD5r6
git push origin claude/gifted-ramanujan-aD5r6:main
```

---

## What was done in the last session
- Unified all pricing to $1,000/$100/mo/$1,000/yr (removed tier 2 entirely)
- Fixed `purchase.js` which had stale $400/$50/$500 pricing
- Added try/catch + error logging to `api/checkout.js`
- Set all 16 `meta.json` files to `"tier": 3`
- Confirmed env vars, webhook, and success page are all in place

---

## Known things to watch
- **Checkout flow**: The setup fee is bundled as a line item in a `mode: 'subscription'` Stripe session. This works if the setup fee price was created as a recurring price in Stripe. If checkout ever fails, check Vercel function logs under `api/checkout`.
- **Stock photos**: All sites use Unsplash images as placeholders. On purchase, swap with real business photos.
- **contactEmail field**: Each `meta.json` has a `contactEmail` field that is not yet wired into any automated flow — it's there for future use.
- **Luke's email**: lukewebsitemarket@gmail.com (business) / lukehenning9@gmail.com (personal, appears in some meta.json files as contactEmail placeholder)
