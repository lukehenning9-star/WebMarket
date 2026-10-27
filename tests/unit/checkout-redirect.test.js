import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isStripeCheckoutUrl } from '../../public/js/lib/checkout.js';

describe('isStripeCheckoutUrl', () => {
    it('accepts Stripe-hosted checkout pages', () => {
        assert.ok(isStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_live_abc123'));
    });

    it('rejects every other destination', () => {
        for (const url of [
            'http://checkout.stripe.com/c/pay/x',
            'https://checkout.stripe.com.evil.example/c/pay/x',
            'https://evil.example/?next=https://checkout.stripe.com',
            'https://user@evil.example',
            'javascript:alert(1)',
            '/success.html',
            '',
            undefined,
        ]) {
            assert.equal(isStripeCheckoutUrl(url), false, String(url));
        }
    });
});
