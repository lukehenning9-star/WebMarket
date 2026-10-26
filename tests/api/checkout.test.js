import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createCheckoutHandler, createManifestLoader } from '../../api/checkout.js';
import { fakeStripe, mockRes, silenceConsole } from './helpers.js';

const KNOWN = new Set(['the-eatery', 'papa-jacks-bbq']);

describe('POST /api/checkout', () => {
    let stripe;
    let handler;

    beforeEach(() => {
        stripe = fakeStripe();
        handler = createCheckoutHandler({ getStripe: () => stripe, knownBusinessIds: async () => KNOWN });
    });

    it('creates a subscription session with the $500 setup fee and the chosen plan', async () => {
        const res = mockRes();
        await handler({ method: 'POST', body: { plan: 'yearly', businessId: 'the-eatery' } }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.url, 'https://checkout.stripe.test/session');
        const [session] = stripe.calls.sessions;
        assert.equal(session.mode, 'subscription');
        assert.equal(session.client_reference_id, 'the-eatery');
        assert.equal(session.line_items[0].price_data.unit_amount, 50000);
        assert.equal(session.line_items[1].price, 'price_1Tg8f49Zed1ZaDEw8kmnjCKj');
    });

    it('rejects businesses that are not in the catalog', async () => {
        for (const businessId of ['not-a-real-site', undefined, 42, { id: 'the-eatery' }]) {
            const res = mockRes();
            await handler({ method: 'POST', body: { plan: 'monthly', businessId } }, res);
            assert.equal(res.statusCode, 400);
        }
        assert.equal(stripe.calls.sessions.length, 0);
    });

    it('rejects unknown plans, including inherited object keys', async () => {
        for (const plan of ['weekly', 'toString', '__proto__', 'constructor', undefined]) {
            const res = mockRes();
            await handler({ method: 'POST', body: { plan, businessId: 'the-eatery' } }, res);
            assert.equal(res.statusCode, 400, `plan ${plan}`);
        }
    });

    it('rejects a missing body and non-POST methods', async () => {
        const noBody = mockRes();
        await handler({ method: 'POST' }, noBody);
        assert.equal(noBody.statusCode, 400);

        const get = mockRes();
        await handler({ method: 'GET' }, get);
        assert.equal(get.statusCode, 405);
    });

    it('returns 503 when the catalog cannot be loaded', async t => {
        silenceConsole(t);
        const failing = createCheckoutHandler({
            getStripe: () => stripe,
            knownBusinessIds: async () => { throw new Error('network down'); },
        });
        const res = mockRes();
        await failing({ method: 'POST', body: { plan: 'monthly', businessId: 'the-eatery' } }, res);
        assert.equal(res.statusCode, 503);
    });

    it('returns 500 when Stripe fails', async t => {
        silenceConsole(t);
        stripe.checkout.sessions.create = async () => { throw new Error('stripe down'); };
        const res = mockRes();
        await handler({ method: 'POST', body: { plan: 'monthly', businessId: 'the-eatery' } }, res);
        assert.equal(res.statusCode, 500);
    });
});

describe('createManifestLoader', () => {
    it('fetches the deployed manifest once and caches it until the TTL expires', async () => {
        let clock = 0;
        const urls = [];
        const fetchFn = async url => {
            urls.push(url);
            return { ok: true, json: async () => [{ id: 'the-eatery' }, { id: 'papa-jacks-bbq' }] };
        };
        const load = createManifestLoader({ fetchFn, ttlMs: 1000, now: () => clock });

        assert.ok((await load()).has('the-eatery'));
        clock = 999;
        await load();
        assert.equal(urls.length, 1);
        assert.equal(urls[0], 'https://uswebsitemarket.com/previews/manifest.json');

        clock = 1000;
        await load();
        assert.equal(urls.length, 2);
    });

    it('throws on a failed fetch instead of caching an empty catalog', async () => {
        const load = createManifestLoader({ fetchFn: async () => ({ ok: false, status: 502 }) });
        await assert.rejects(load(), /HTTP 502/);
    });
});
