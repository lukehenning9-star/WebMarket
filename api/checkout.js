const Stripe = require('stripe');

const PRICES = {
    tier1: {
        setupFee: 'price_1TdyTk9Zed1ZaDEwYZziJp1Q',
        monthly:  'price_1TdyTk9Zed1ZaDEwjuxdBhgI',
        yearly:   'price_1Tdyjf9Zed1ZaDEwgZni4XOJ',
    },
    tier2: {
        setupFee: 'price_1Tf1eX9Zed1ZaDEwYRKiYkZv',
        monthly:  'price_1Tf1fW9Zed1ZaDEw2liEYcMn',
        yearly:   'price_1Tf1fn9Zed1ZaDEwxHLtjLlP',
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

    const prices = tier === 2 ? PRICES.tier2 : PRICES.tier1;
    const origin = 'https://uswebsitemarket.com';

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
};
