const Stripe = require('stripe');

const PRICES = {
    setupFee: 'price_1TdyTk9Zed1ZaDEwYZziJp1Q',
    monthly:  'price_1TdyTk9Zed1ZaDEwjuxdBhgI',
    yearly:   'price_1Tdyjf9Zed1ZaDEwgZni4XOJ',
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan, businessId } = req.body;

    if (!['monthly', 'yearly'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            { price: PRICES.setupFee, quantity: 1 },
            { price: PRICES[plan],    quantity: 1 },
        ],
        client_reference_id: businessId || 'unknown',
        success_url: `${origin}/?purchased=1`,
        cancel_url:  `${origin}/`,
    });

    res.json({ url: session.url });
};
