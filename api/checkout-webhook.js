const Stripe    = require('stripe');
const nodemailer = require('nodemailer');
const { buffer } = require('micro');

const NOTIFY_EMAIL = 'lukewebsitemarket@gmail.com';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig    = req.headers['stripe-signature'];

    let rawBody;
    try {
        rawBody = await buffer(req);
    } catch (err) {
        return res.status(400).send('Could not read request body');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature error:', err.message);
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    const session      = event.data.object;
    const businessId   = session.client_reference_id || 'unknown';
    const custEmail    = session.customer_details?.email || 'not captured';
    const custName     = session.customer_details?.name  || '';
    const amount       = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : '';

    if (event.type === 'checkout.session.completed') {
        await notify(
            `✅ New purchase — ${businessId}`,
            [
                `Website purchased: ${businessId}`,
                `Customer: ${custName || custEmail}`,
                `Email: ${custEmail}`,
                `Amount charged: ${amount}`,
                '',
                'Log in to Stripe for full details.',
            ].join('\n')
        );
    }

    if (event.type === 'checkout.session.expired' && custEmail !== 'not captured') {
        await notify(
            `⚠️ Abandoned checkout — ${businessId}`,
            [
                `Someone started but didn't complete checkout for: ${businessId}`,
                `Customer email: ${custEmail}`,
                '',
                'You may want to follow up directly.',
            ].join('\n')
        );
    }

    res.status(200).json({ received: true });
};

async function notify(subject, text) {
    if (!process.env.GMAIL_APP_PASSWORD) {
        console.log('GMAIL_APP_PASSWORD not set — skipping email:', subject);
        return;
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({ from: NOTIFY_EMAIL, to: NOTIFY_EMAIL, subject, text });
}
