import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createWebhookHandler, NOTIFIED_KEY } from '../../api/checkout-webhook.js';
import { fakeStripe, mockRes, signedWebhookRequest, silenceConsole, WEBHOOK_SECRET } from './helpers.js';

const completed = (id, subscription = 'sub_123') => ({
    id,
    type: 'checkout.session.completed',
    data: {
        object: {
            client_reference_id: 'the-eatery',
            subscription,
            amount_total: 60000,
            customer_details: { email: 'owner@example.com', name: 'Owner' },
        },
    },
});

describe('POST /api/checkout-webhook', () => {
    let stripe;
    let emails;
    let handler;

    function build() {
        return createWebhookHandler({
            getStripe: () => stripe,
            webhookSecret: () => WEBHOOK_SECRET,
            notify: async subject => { emails.push(subject); },
        });
    }

    beforeEach(t => {
        silenceConsole(t);
        stripe = fakeStripe();
        emails = [];
        handler = build();
    });

    it('rejects a payload signed with the wrong secret', async () => {
        const res = mockRes();
        await handler(signedWebhookRequest(completed('evt_1'), 'whsec_wrong'), res);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body, 'Invalid signature', 'does not echo library error details');
        assert.deepEqual(emails, []);
    });

    it('emails once per purchase and marks the subscription', async () => {
        const res = mockRes();
        await handler(signedWebhookRequest(completed('evt_1')), res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(emails, ['✅ New purchase — the-eatery']);
        assert.equal(stripe.metadataBySubscription.get('sub_123')[NOTIFIED_KEY], 'evt_1');
    });

    it('skips a redelivered event on the same instance without calling Stripe', async () => {
        await handler(signedWebhookRequest(completed('evt_1')), mockRes());
        const res = mockRes();
        await handler(signedWebhookRequest(completed('evt_1')), res);

        assert.equal(res.body.duplicate, true);
        assert.equal(emails.length, 1);
        assert.equal(stripe.calls.retrieved.length, 1);
    });

    it('skips an already-notified purchase after a cold start (fresh instance)', async () => {
        await handler(signedWebhookRequest(completed('evt_1')), mockRes());
        const coldInstance = build();
        const res = mockRes();
        await coldInstance(signedWebhookRequest(completed('evt_1')), res);

        assert.equal(res.statusCode, 200);
        assert.equal(emails.length, 1);
    });

    it('returns 500 when the email fails so Stripe retries, then succeeds on retry', async () => {
        let failNext = true;
        const flaky = createWebhookHandler({
            getStripe: () => stripe,
            webhookSecret: () => WEBHOOK_SECRET,
            notify: async subject => {
                if (failNext) { failNext = false; throw new Error('smtp down'); }
                emails.push(subject);
            },
        });

        const first = mockRes();
        await flaky(signedWebhookRequest(completed('evt_2')), first);
        assert.equal(first.statusCode, 500);
        assert.equal(stripe.metadataBySubscription.get('sub_123'), undefined);

        const retry = mockRes();
        await flaky(signedWebhookRequest(completed('evt_2')), retry);
        assert.equal(retry.statusCode, 200);
        assert.equal(emails.length, 1);
    });

    it('still acknowledges the event if marking the subscription fails after emailing', async () => {
        stripe.subscriptions.update = async () => { throw new Error('stripe down'); };
        const res = mockRes();
        await handler(signedWebhookRequest(completed('evt_3')), res);
        assert.equal(res.statusCode, 200);
        assert.equal(emails.length, 1);
    });

    it('sends an abandoned-checkout alert only when Stripe captured an email', async () => {
        const expired = (id, email) => ({
            id,
            type: 'checkout.session.expired',
            data: { object: { client_reference_id: 'papa-jacks-bbq', customer_details: email ? { email } : null } },
        });

        await handler(signedWebhookRequest(expired('evt_4', null)), mockRes());
        assert.deepEqual(emails, []);

        await handler(signedWebhookRequest(expired('evt_5', 'lead@example.com')), mockRes());
        assert.deepEqual(emails, ['⚠️ Abandoned checkout — papa-jacks-bbq']);
    });

    it('acknowledges unrelated event types without emailing', async () => {
        const res = mockRes();
        await handler(signedWebhookRequest({ id: 'evt_6', type: 'invoice.paid', data: { object: {} } }), res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(emails, []);
    });
});
