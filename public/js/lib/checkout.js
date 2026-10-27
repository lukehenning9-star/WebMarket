export const PRICING_PANEL_HTML = `
    <div class="pricing-wrap">
        <h2 class="pricing-title">Get your website live</h2>
        <p class="pricing-sub">$500 one-time setup fee included with your first payment.</p>
        <div class="pricing-plans">
            <button class="plan-card" type="button" data-plan="monthly">
                <span class="plan-name">Monthly</span>
                <span class="plan-price">$100<em>/mo</em></span>
                <span class="plan-note">Cancel anytime</span>
            </button>
            <button class="plan-card plan-card--featured" type="button" data-plan="yearly">
                <span class="plan-name">Yearly</span>
                <span class="plan-price">$1,000<em>/yr</em></span>
                <span class="plan-note">Save $200 vs monthly</span>
            </button>
        </div>
        <p class="pricing-legal">$500 setup + your chosen plan charged today. Renews automatically.</p>
    </div>`;

const STRIPE_CHECKOUT_ORIGIN = 'https://checkout.stripe.com';

/** True only for Stripe-hosted checkout pages, so a bad API response can't redirect elsewhere. */
export function isStripeCheckoutUrl(url) {
    try {
        return new URL(url).origin === STRIPE_CHECKOUT_ORIGIN;
    } catch {
        return false;
    }
}

/** Creates a Stripe Checkout session for the business and redirects to it. */
export async function startCheckout(businessId, plan) {
    try {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, businessId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (!isStripeCheckoutUrl(data.url)) {
            throw new Error('Refusing to redirect to a non-Stripe URL');
        }
        window.location.href = data.url;
    } catch (err) {
        console.error('Checkout failed:', err.message);
        alert('Something went wrong starting checkout. Please try again.');
    }
}

/** Renders the plan picker into `container` and starts checkout when a plan is chosen. */
export function renderPricing(container, businessId) {
    container.innerHTML = PRICING_PANEL_HTML;
    container.querySelectorAll('[data-plan]').forEach(button => {
        button.addEventListener('click', () => startCheckout(businessId, button.dataset.plan));
    });
}
