const Stripe = require('stripe');

const PRICES = {
    tier2: {
        setupFee: 'price_1Tf1eX9Zed1ZaDEwYRKiYkZv',
        monthly:  'price_1Tf1fW9Zed1ZaDEw2liEYcMn',
        yearly:   'price_1Tf1fn9Zed1ZaDEwxHLtjLlP',
    },
    tier3: {
        setupFee: 'price_1Tg8cO9Zed1ZaDEwmIeBYzDC',
        monthly:  'price_1Tg8ej9Zed1ZaDEwSnfffwrh',
        yearly:   'price_1Tg8f49Zed1ZaDEw8kmnjCKj',
    },
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan, businessId, tier } = req.body;

    if (!['monthly', 'yearly'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    const prices = tier === 3 ? PRICES.tier3 : PRICES.tier2;
    const origin = 'https://uswebsitemarket.com';

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [
                { price: prices.setupFee, quantity: 1 },
                { price: prices[plan],    quantity: 1 },
            ],
            client_reference_id: businessId || 'unknown',
            success_url: `${origin}/success.html`,
            cancel_url:  `${origin}/`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('[checkout] Stripe error:', err.message, { plan, businessId, tier });
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
};
