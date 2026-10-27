import Stripe from 'stripe';
import { isJsonRequest } from './_lib/http.js';
import { clientIp, createRateLimiter } from './_lib/rate-limit.js';

export const PRICES = {
    monthly: 'price_1Tg8ej9Zed1ZaDEwSnfffwrh',
    yearly:  'price_1Tg8f49Zed1ZaDEw8kmnjCKj',
};

// One-time setup fee, defined inline so no Stripe dashboard price is needed
const SETUP_FEE_ITEM = {
    price_data: {
        currency: 'usd',
        product_data: { name: 'Website Setup Fee' },
        unit_amount: 50000, // $500.00
    },
    quantity: 1,
};

const ORIGIN = 'https://uswebsitemarket.com';
const MANIFEST_TTL_MS = 5 * 60 * 1000;

/**
 * Returns a function that resolves to the set of valid business IDs.
 * scripts/build.py regenerates the manifest on every deploy, so it is read
 * from the deployed site instead of being bundled with this function.
 */
export function createManifestLoader({ fetchFn = fetch, ttlMs = MANIFEST_TTL_MS, now = Date.now } = {}) {
    let cache = { ids: null, fetchedAt: 0 };
    return async function knownBusinessIds() {
        if (cache.ids && now() - cache.fetchedAt < ttlMs) return cache.ids;
        const res = await fetchFn(`${ORIGIN}/previews/manifest.json`);
        if (!res.ok) throw new Error(`manifest fetch failed: HTTP ${res.status}`);
        const entries = await res.json();
        cache = { ids: new Set(entries.map(entry => entry.id)), fetchedAt: now() };
        return cache.ids;
    };
}

export function createCheckoutHandler({ getStripe, knownBusinessIds, isRateLimited = () => false }) {
    return async function handler(req, res) {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        if (!isJsonRequest(req)) {
            return res.status(415).json({ error: 'Expected application/json' });
        }
        if (isRateLimited(clientIp(req))) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        const { plan, businessId } = req.body || {};

        if (!Object.hasOwn(PRICES, plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        try {
            const ids = await knownBusinessIds();
            if (typeof businessId !== 'string' || !ids.has(businessId)) {
                return res.status(400).json({ error: 'Unknown business' });
            }
        } catch (err) {
            console.error('[checkout] Could not load manifest:', err.message);
            return res.status(503).json({ error: 'Checkout temporarily unavailable' });
        }

        try {
            const session = await getStripe().checkout.sessions.create({
                mode: 'subscription',
                line_items: [
                    SETUP_FEE_ITEM,
                    { price: PRICES[plan], quantity: 1 },
                ],
                client_reference_id: businessId,
                success_url: `${ORIGIN}/success.html`,
                cancel_url:  `${ORIGIN}/`,
            });
            return res.status(200).json({ url: session.url });
        } catch (err) {
            console.error('[checkout] Stripe error:', err.message, { plan, businessId });
            return res.status(500).json({ error: 'Failed to create checkout session' });
        }
    };
}

export default createCheckoutHandler({
    getStripe: () => new Stripe(process.env.STRIPE_SECRET_KEY),
    knownBusinessIds: createManifestLoader(),
    isRateLimited: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 }),
});
