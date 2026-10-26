import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createContactHandler } from '../../api/contact.js';
import { clientIp, createRateLimiter } from '../../api/_lib/rate-limit.js';
import { mockRes, silenceConsole } from './helpers.js';

const request = (body, ip = '203.0.113.1') => ({
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
});

describe('POST /api/contact', () => {
    let emails;
    let handler;

    beforeEach(() => {
        emails = [];
        handler = createContactHandler({
            notify: async (subject, text) => { emails.push({ subject, text }); },
            isRateLimited: createRateLimiter({ windowMs: 60_000, max: 3 }),
        });
    });

    it('emails a valid request', async () => {
        const res = mockRes();
        await handler(request({ company: 'Acme', contact: 'a@b.co', details: 'Need a site' }), res);
        assert.equal(res.statusCode, 200);
        assert.equal(emails[0].subject, 'Demo Request — Acme');
        assert.match(emails[0].text, /Details: Need a site/);
    });

    it('rejects missing or whitespace-only required fields', async () => {
        for (const body of [{}, { company: 'Acme' }, { company: '   ', contact: 'x' }, { company: 5, contact: 'x' }]) {
            const res = mockRes();
            await handler(request(body), res);
            assert.equal(res.statusCode, 400);
        }
        assert.equal(emails.length, 0);
    });

    it('silently drops submissions that fill the hidden honeypot field', async () => {
        const res = mockRes();
        await handler(request({ company: 'Spam', contact: 'x', website: 'http://spam.example' }), res);
        assert.equal(res.statusCode, 200);
        assert.equal(emails.length, 0);
    });

    it('collapses newlines in the subject and truncates long input', async () => {
        await handler(request({ company: 'Acme\r\nBcc: evil@example.com', contact: 'a@b.co', details: 'y'.repeat(5000) }), mockRes());
        assert.equal(emails[0].subject, 'Demo Request — Acme Bcc: evil@example.com');
        assert.equal(emails[0].text.split('Details: ')[1].length, 2000);
    });

    it('returns 429 after 3 requests from one IP without affecting other IPs', async () => {
        const codes = [];
        for (let i = 0; i < 4; i++) {
            const res = mockRes();
            await handler(request({ company: 'Acme', contact: 'a@b.co' }, '198.51.100.7'), res);
            codes.push(res.statusCode);
        }
        assert.deepEqual(codes, [200, 200, 200, 429]);

        const other = mockRes();
        await handler(request({ company: 'Acme', contact: 'a@b.co' }, '198.51.100.8'), other);
        assert.equal(other.statusCode, 200);
    });

    it('returns 500 when the email cannot be sent', async t => {
        silenceConsole(t);
        const failing = createContactHandler({
            notify: async () => { throw new Error('smtp down'); },
            isRateLimited: () => false,
        });
        const res = mockRes();
        await failing(request({ company: 'Acme', contact: 'a@b.co' }), res);
        assert.equal(res.statusCode, 500);
    });
});

describe('createRateLimiter', () => {
    it('allows requests again once the window has passed', () => {
        let clock = 0;
        const isLimited = createRateLimiter({ windowMs: 1000, max: 2, now: () => clock });
        assert.equal(isLimited('ip'), false);
        assert.equal(isLimited('ip'), false);
        assert.equal(isLimited('ip'), true);
        clock = 1000;
        assert.equal(isLimited('ip'), false);
    });

    it('evicts idle keys once the key limit is exceeded', () => {
        let clock = 0;
        const isLimited = createRateLimiter({ windowMs: 10, max: 1, maxKeys: 2, now: () => clock });
        isLimited('a');
        isLimited('b');
        clock = 20;
        isLimited('c');
        assert.equal(isLimited('a'), false, 'a was evicted, so it starts fresh');
    });
});

describe('clientIp', () => {
    it('uses the first X-Forwarded-For entry, then falls back', () => {
        assert.equal(clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }), '1.2.3.4');
        assert.equal(clientIp({ headers: { 'x-real-ip': '5.6.7.8' } }), '5.6.7.8');
        assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '::1' } }), '::1');
    });
});
