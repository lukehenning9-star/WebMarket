const Stripe    = require('stripe');
const nodemailer = require('nodemailer');
const { buffer } = require('micro');

const NOTIFY_EMAIL = 'lukewebsitemarket@gmail.com';

// Stripe delivers events at least once, so the same event can arrive again.
// Event IDs seen by this warm instance are skipped cheaply; purchases are
// also marked on the subscription's metadata, which survives cold starts.
const SEEN_LIMIT = 500;
const seenEventIds = new Set();
const NOTIFIED_KEY = 'webmarket_notified_event';

function rememberEvent(id) {
    seenEventIds.add(id);
    if (seenEventIds.size > SEEN_LIMIT) {
        seenEventIds.delete(seenEventIds.values().next().value);
    }
}

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

    if (seenEventIds.has(event.id)) {
        return res.status(200).json({ received: true, duplicate: true });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            await handleCompleted(stripe, event);
        } else if (event.type === 'checkout.session.expired') {
            await handleExpired(event);
        }
    } catch (err) {
        // A non-2xx response makes Stripe retry the event later.
        console.error('[webhook] Failed to handle event:', event.id, event.type, err.message);
        return res.status(500).json({ error: 'Handler failed' });
    }

    rememberEvent(event.id);
    res.status(200).json({ received: true });
};

async function handleCompleted(stripe, event) {
    const session = event.data.object;
    const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata?.[NOTIFIED_KEY]) {
            console.log('[webhook] Purchase already notified:', subscriptionId);
            return;
        }
    }

    const { businessId, custEmail, custName } = describeSession(session);
    const amount = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : '';

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

    if (subscriptionId) {
        try {
            await stripe.subscriptions.update(subscriptionId, {
                metadata: { [NOTIFIED_KEY]: event.id, business_id: businessId },
            });
        } catch (err) {
            // The email already went out; failing here would trigger a retry and a duplicate.
            console.error('[webhook] Could not mark subscription as notified:', subscriptionId, err.message);
        }
    }
}

async function handleExpired(event) {
    const { businessId, custEmail } = describeSession(event.data.object);
    if (custEmail === 'not captured') return;

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

function describeSession(session) {
    return {
        businessId: session.client_reference_id || 'unknown',
        custEmail:  session.customer_details?.email || 'not captured',
        custName:   session.customer_details?.name  || '',
    };
}

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
