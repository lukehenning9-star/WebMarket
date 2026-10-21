const Stripe = require('stripe');

const PRICES = {
    monthly:  'price_1Tg8ej9Zed1ZaDEwSnfffwrh',
    yearly:   'price_1Tg8f49Zed1ZaDEw8kmnjCKj',
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

// build.py regenerates the manifest on every deploy, so it is read from the
// deployed site instead of being bundled with this function.
const MANIFEST_TTL_MS = 5 * 60 * 1000;
let manifestCache = { ids: null, fetchedAt: 0 };

async function knownBusinessIds() {
    if (manifestCache.ids && Date.now() - manifestCache.fetchedAt < MANIFEST_TTL_MS) {
        return manifestCache.ids;
    }
    const res = await fetch(`${ORIGIN}/previews/manifest.json`);
    if (!res.ok) throw new Error(`manifest fetch failed: HTTP ${res.status}`);
    const entries = await res.json();
    manifestCache = { ids: new Set(entries.map(e => e.id)), fetchedAt: Date.now() };
    return manifestCache.ids;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                SETUP_FEE_ITEM,
                { price: PRICES[plan], quantity: 1 },
            ],
            client_reference_id: businessId,
            success_url: `${ORIGIN}/success.html`,
            cancel_url:  `${ORIGIN}/`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('[checkout] Stripe error:', err.message, { plan, businessId });
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
};
