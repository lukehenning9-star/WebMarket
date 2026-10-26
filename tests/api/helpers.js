import { Readable } from 'node:stream';
import Stripe from 'stripe';

/** Minimal stand-in for Vercel's Node response helpers. */
export function mockRes() {
    const res = { statusCode: 200, body: undefined };
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => { res.body = body; return res; };
    res.send = body => { res.body = body; return res; };
    res.end = () => res;
    return res;
}

const signer = new Stripe('sk_test_signing_only');
export const WEBHOOK_SECRET = 'whsec_test_secret';

/** A request whose body is a real Stripe-signed payload, readable as a stream. */
export function signedWebhookRequest(event, secret = WEBHOOK_SECRET) {
    const payload = JSON.stringify(event);
    const header = signer.webhooks.generateTestHeaderString({ payload, secret });
    const req = Readable.from([Buffer.from(payload)]);
    req.method = 'POST';
    req.headers = { 'stripe-signature': header, 'content-type': 'application/json' };
    return req;
}

/** Fake Stripe client: real signature verification, in-memory subscriptions. */
export function fakeStripe() {
    const calls = { sessions: [], retrieved: [], updated: [] };
    const metadataBySubscription = new Map();
    return {
        calls,
        metadataBySubscription,
        webhooks: signer.webhooks,
        checkout: {
            sessions: {
                create: async params => {
                    calls.sessions.push(params);
                    return { url: 'https://checkout.stripe.test/session' };
                },
            },
        },
        subscriptions: {
            retrieve: async id => {
                calls.retrieved.push(id);
                return { id, metadata: { ...(metadataBySubscription.get(id) || {}) } };
            },
            update: async (id, { metadata }) => {
                calls.updated.push([id, metadata]);
                metadataBySubscription.set(id, { ...(metadataBySubscription.get(id) || {}), ...metadata });
                return { id };
            },
        },
    };
}

export function silenceConsole(t) {
    t.mock.method(console, 'error', () => {});
    t.mock.method(console, 'log', () => {});
}
