# Security

## Reporting a vulnerability

Email **lukewebsitemarket@gmail.com** with the details and steps to reproduce. Please don't open a public issue for security problems. I'll acknowledge within a few days.

## Overview

Website Market is a static site with three serverless endpoints and no database. Card details are entered on Stripe's hosted checkout page and never reach this code.

| Area | What protects it |
|---|---|
| Client preview sites | Rendered in a sandboxed `<iframe>` without `allow-same-origin`, so a preview can't read the parent page's DOM or cookies. Top-level navigation only on a real click |
| Main pages | Strict Content-Security-Policy: scripts and styles only from this origin (plus Google Fonts CSS), no inline script or style, `frame-ancestors 'none'`. Browser tests run under the production headers and fail on any CSP violation |
| Rendering catalog data | One `escapeHtml` for all data inserted into markup; no inline event handlers |
| `POST /api/checkout` | JSON-only (blocks cross-site form posts), per-IP rate limit, plan checked with `Object.hasOwn`, business must exist in the deployed catalog. The browser only follows redirects to `https://checkout.stripe.com` |
| `POST /api/checkout-webhook` | Stripe signature verified over the raw body; generic error responses; duplicate deliveries skipped (in-memory event IDs plus a marker on the subscription) |
| `POST /api/contact` | JSON-only, length limits, control characters stripped, honeypot field, per-IP rate limit |
| Secrets | Only in Vercel environment variables; nothing secret is committed |
| What's deployed | Only `public/` is served. The admin tool runs locally from `tools/`, and repo docs, scripts and tests are never deployed |
| Dependencies | `npm audit` clean; Dependabot opens update PRs weekly |
| CI | Read-only `GITHUB_TOKEN`; `pull_request` (not `pull_request_target`), so forked PRs run without secrets |

See [`docs/security-audit.md`](docs/security-audit.md) for the full audit: findings, fixes and accepted risks.
