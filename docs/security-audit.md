# Security audit — October 2026

A review of everything that could expose private data or be abused: the deployed site, the three API endpoints, the client preview sites, the build and CI pipeline, dependencies, and the full public git history.

## Scope and method

- **Code:** every file in `api/`, `public/js/`, `scripts/` and `tools/`, read line by line.
- **Deployment:** `vercel.json`, what Vercel serves, and the response headers. Those headers are also enforced in the Playwright suite (see below).
- **Client sites:** all 16 previews, checked for third-party scripts, embedded frames, forms, mixed content and unsafe links.
- **History:** all 199 commits across every branch and every pull-request ref, scanned for:
  - API keys and tokens (Stripe, AWS, Google, GitHub, Slack, Vercel, SendGrid, JWTs, private keys);
  - hard-coded passwords;
  - sensitive file types (`.env`, keys, dumps);
  - personal email addresses and phone numbers.
- **Dependencies:** `npm audit`.
- **Tests:** each fix below has an automated test, and the browser tests run under the production security headers.

## Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `vercel.json` used `outputDirectory: "."`, so the whole repository was publicly downloadable from the live site, including internal notes, agent instructions and build scripts | High | Fixed. Only `public/` is deployed |
| 2 | Preview iframe sandbox combined `allow-scripts` with `allow-same-origin` on same-origin content, which lets a preview remove its own sandbox | High | Fixed. `allow-same-origin` removed; a browser test asserts the parent can't reach any preview's DOM |
| 3 | `/api/checkout` accepted any `businessId`, so a session could be created for a site that doesn't exist | Medium | Fixed. Validated against the deployed catalog |
| 4 | Stripe could deliver the same webhook event more than once, sending duplicate purchase emails; a failed email was acknowledged and never retried | Medium | Fixed. Duplicate deliveries are skipped, and a failure returns 500 so Stripe retries |
| 5 | `nodemailer` 6.x had 19 published advisories (header injection, recipient-domain bypass, denial of service) | Medium | Fixed. Upgraded to 10.x; `npm audit` clean |
| 6 | `/api/contact` had no rate limit, size limits or bot filtering, so it could be used to flood the inbox | Medium | Fixed. Length limits, control-character stripping, a honeypot field and a per-IP rate limit |
| 7 | No Content-Security-Policy; inline `onclick` handlers built from catalog data | Medium | Fixed. Strict CSP; event delegation on `data-` attributes; inline styles moved to the stylesheet |
| 8 | Unauthenticated `admin.html` was deployed publicly | Low | Fixed. Moved to `tools/`, served only locally on `127.0.0.1` |
| 9 | API endpoints accepted any content type, which allowed cross-site form posts | Low | Fixed. JSON-only (415 otherwise) |
| 10 | Checkout followed whatever redirect URL the API returned | Low | Fixed. Only `https://checkout.stripe.com` is followed |
| 11 | Webhook echoed Stripe library error text to the caller | Low | Fixed. Generic "Invalid signature" response |
| 12 | Owner's personal email used as a placeholder in three public `meta.json` files | Low | Fixed. Cleared; contributor docs now note that `meta.json` is public |
| 13 | Checkout session creation was not rate-limited | Low | Fixed. Per-IP limit |
| 14 | Local dev server listened on all network interfaces | Low | Fixed. Bound to `127.0.0.1` |
| 15 | Checkout email didn't show whether the payment had cleared | Info | Fixed. Payment status included |

## No issues found

- **Secrets:** no secrets in any commit, branch or pull-request ref. Stripe price IDs in `api/checkout.js` are public identifiers, not credentials.
- **Client sites:** no third-party scripts, embedded frames or forms; every `target="_blank"` link has `rel="noopener"`; no `http://` resources.
- **Escaping:** all catalog and query text rendered into HTML is escaped. Tests feed hostile names through the card renderer.
- **Email header injection:** user input is stripped of control characters and newlines collapse into the subject line. Tested.
- **Path handling:** `add-to-market.py` turns names into `[a-z0-9-]` slugs, so a business name can't write outside `public/previews/`.

## Accepted risks

- **Rate limits are per instance.** They live in function memory, and Vercel can run several instances that don't share it. That slows a single abuser but isn't a global quota; a shared store such as Redis would make it one.
- **Concurrent webhook retries.** Two deliveries of the same event arriving at the same moment on different instances could both send an email. The cost is a duplicate notification to my own inbox.
- **Contributor email in commit metadata.** It's part of public git history and can't be removed without rewriting every branch.
