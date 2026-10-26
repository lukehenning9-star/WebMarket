# WebMarket — Session Handoff

## What this is
A landing page platform at **uswebsitemarket.com** where business owners search their name, find a pre-built professional website, preview it in an iframe modal, and purchase it via Stripe. Luke built the sites in advance and sells them cold-call style.

---

## Current pricing (ALL sites)
- **Setup fee:** $500 (one-time, charged on first payment)
- **Monthly:** $100/mo
- **Yearly:** $1,000/yr (saves $200 vs monthly)

Every site uses the same pricing; there is no per-site tier logic.

---

## Stripe price IDs (LIVE)
```
setupFee: inline price_data in api/checkout.js  ($500 one-time — no dashboard price needed)
monthly:  price_1Tg8ej9Zed1ZaDEwSnfffwrh        ($100/mo)
yearly:   price_1Tg8f49Zed1ZaDEw8kmnjCKj        ($1,000/yr)
```
Recurring prices are hardcoded in `api/checkout.js`; the setup fee is an inline
`price_data` line item (`unit_amount: 50000`), so changing it is a one-line code edit.
The old $1,000 setup price (price_1Tg8cO9Zed1ZaDEwmIeBYzDC) is unused and can be
archived in the Stripe dashboard.

---

## Environment variables (set in Vercel)
- `STRIPE_SECRET_KEY` — live Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (whsec_...)
- `GMAIL_APP_PASSWORD` — Gmail app password for lukewebsitemarket@gmail.com

---

## Vercel setup
- Deploy triggers on push to `main`
- Build command: `python3 scripts/build.py` (regenerates `public/previews/manifest.json`)
- Output directory: `public/` — only that folder is served, so repo docs and scripts stay private
- No framework — static site + serverless functions in `/api/`
- Stripe webhook endpoint registered at: `https://uswebsitemarket.com/api/checkout-webhook`
  - Listens for: `checkout.session.completed`, `checkout.session.expired`

---

## Key files
See `README.md` (architecture, layout) and `CLAUDE.md` (commands). In short:
| Path | Purpose |
|------|---------|
| `public/index.html` + `public/js/home.js` | Landing page (search → preview → buy) |
| `public/purchase.html` + `public/js/purchase.js` | Direct purchase flow |
| `public/all-builds.html` + `public/js/all-builds.js` | Browse all sites |
| `public/js/lib/search.js` | Search normalization + ranking (unit tested) |
| `public/admin.html` | Internal admin view (noindex) |
| `api/checkout.js` / `checkout-webhook.js` / `contact.js` | Stripe checkout, purchase emails, demo form |
| `scripts/build.py` | Writes `public/previews/manifest.json` |
| `scripts/add-to-market.py` | Registers a new site |
| `tests/` | `npm test` (JS + Python), `npm run test:e2e` (Playwright) |

---

## All 16 sites (as of this session)
| Slug | Business | City |
|------|----------|------|
| `610fit-academy` | 610Fit Academy | Waco, TX |
| `andrews-cleaning-service` | Andrew's Cleaning Service | Wichita, KS |
| `barks-an-bubbles` | Barks-An-Bubbles | Wichita, KS |
| `bonjours-puppy-parade` | Bonjour's Puppy Parade | Wichita, KS |
| `go-dolla-fitness` | Go Dolla Fitness | Wichita, KS |
| `julius-rib-cage` | Julius Rib Cage | Wichita, KS |
| `just-like-mamas-kitchen` | Just Like Mama's Kitchen | Wichita, KS |
| `keep-it-cute-grooming` | Keep it Cute Grooming | Wichita, KS |
| `lavish-mutts-llc` | Lavish Mutts | Wichita, KS |
| `midway-custom-detailing` | Midway Custom Detailing | Waco, TX |
| `nose-to-toes-pet-grooming` | Nose to Toes Pet Grooming | Andover, KS |
| `papa-jacks-bbq` | Papa Jack's BBQ | Waco, TX |
| `tanker-bbq-co` | Tanker BBQ Co. | Wichita, KS |
| `taste-of-flavorz` | Taste of Flavorz | Wichita, KS |
| `the-dapper-hound` | The Dapper Hound | Wichita, KS |
| `the-eatery` | The Eatery | Wichita, KS |

---

## How to add a new client site
```bash
python3 scripts/add-to-market.py \
    --name     "Business Name" \
    --category "Category" \
    --city     "City, ST" \
    --price    500 \
    --features "Feature 1,Feature 2,Feature 3"
```
Then copy the built website files into `public/previews/<slug>/`, run `npm test`, commit, and push to main.

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

## Session log

### Pricing change
- Ran deep market research on pricing/viability; verdict: model is sound, but the
  $1,000 upfront was the biggest close-killer (comps in TX take ~$200 down)
- Cut setup fee to **$500** (monthly/yearly unchanged at $100/$1,000)
- Setup fee is now an inline `price_data` line item in `api/checkout.js` — no
  Stripe dashboard price needed; old $1,000 price is orphaned and can be archived
- Updated pricing copy on every page
- Set `price: 500` / `monthlyPrice: 100` in all 16 `meta.json` files (shown in admin.html)

### Hardening pass (after a code audit)
- `api/checkout.js` rejects any `businessId` not in the deployed `previews/manifest.json`
  (fetched from the live site, cached 5 min); returns 503 if the manifest can't be read
- `api/checkout-webhook.js` skips repeat Stripe deliveries: in-memory event-ID set, plus a
  `webmarket_notified_event` marker on the subscription's metadata so a purchase email is
  only sent once even after a cold start. Email failure returns 500 so Stripe retries
- `api/contact.js` has length limits, control-character stripping, a hidden honeypot
  field (`website`), and a per-instance rate limit (3 requests / 10 min per IP)
- Frontend checkout now shows an error instead of redirecting to `undefined` on failure
- Preview iframe sandbox no longer has `allow-same-origin` or `allow-top-navigation`;
  scripted top navigation is only allowed on a user click (keeps tap-to-call working)
- `admin.html` reads `previews/manifest.json` (was reading stale `businesses.json`, now deleted)
  and downloads a `meta.json` for the new site; marked `noindex`
- Removed "One flat fee, no subscriptions" from the landing page and PRODUCT.md
- Skill + CLAUDE.md now document the sandbox rules and ban picsum/loremflickr images

### Public-repo cleanup (for internship applications)
- Moved the website into `public/` (Vercel output dir). Before this, `outputDirectory: "."`
  published the whole repo, so HANDOFF.md, CLAUDE.md and the scripts were downloadable
- Merged three copy-pasted page scripts into ES modules under `public/js/lib/`; inline
  `onclick` handlers replaced with event delegation and `data-` attributes
- Search moved to `public/js/lib/search.js`: apostrophe/punctuation-insensitive, multi-word
  AND matching across fields, ranked (name > category > city). Fixes "mamas kitchen" and
  "bbq waco" returning nothing
- API handlers are now factories with injected Stripe/email clients; ESM; `micro` removed
- Manifest no longer publishes `contactEmail` or `tier`
- Added README, `.gitignore`, `.gitattributes`, `package-lock.json`, security headers,
  og:image, tests (44 JS, 12 Python, 10 Playwright × desktop/mobile) and GitHub Actions CI
- Upgraded nodemailer 6 → 10 (19 advisories; `npm audit` now clean). CI runner pinned to
  ubuntu-24.04 because Playwright 1.56 can't install browsers on ubuntu-latest (26.04)

---

## Known things to watch
- **Checkout flow**: The $500 setup fee is an inline one-time `price_data` line item in a `mode: 'subscription'` Stripe session (Stripe invoices one-time items on the first invoice). If checkout ever fails, check Vercel function logs under `api/checkout`.
- **Stock photos**: Sites use Unsplash/Pexels images as placeholders. On purchase, swap with real business photos. `610fit-academy`, `lavish-mutts-llc` and `taste-of-flavorz` still use picsum.photos / loremflickr.com, which return arbitrary photos — replace those first.
- **Rate limit is per instance**: the contact-form limit lives in function memory, so it slows one abusive client but isn't a global quota. A shared store (e.g. Vercel KV / Upstash) would be needed for a hard limit.
- **contactEmail field**: Each `meta.json` has a `contactEmail` field that is not yet wired into any automated flow. It is intentionally left out of the public manifest.
- **Luke's email**: lukewebsitemarket@gmail.com (business) / lukehenning9@gmail.com (personal, appears in some meta.json files as contactEmail placeholder)
