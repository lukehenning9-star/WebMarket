import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const catalog = JSON.parse(readFileSync(new URL('../../public/previews/manifest.json', import.meta.url)));
const vercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url)));
const ADMIN_URL = 'http://localhost:4174/tools/admin.html';

/** The response headers Vercel would add for this path, per vercel.json. */
function productionHeaders(pathname) {
    const headers = {};
    for (const rule of vercelConfig.headers) {
        if (new RegExp(`^${rule.source}$`).test(pathname)) {
            for (const { key, value } of rule.headers) headers[key.toLowerCase()] = value;
        }
    }
    return headers;
}

test.beforeEach(async ({ page, baseURL }) => {
    // Keep runs deterministic and offline: block fonts, stock photos and maps.
    await page.context().route(url => !['localhost', '127.0.0.1'].includes(url.hostname), route => route.abort());

    // Serve the site with the production security headers so CSP regressions fail here.
    await page.context().route(url => url.href.startsWith(baseURL), async route => {
        try {
            const response = await route.fetch();
            const pathname = new URL(route.request().url()).pathname;
            await route.fulfill({ response, headers: { ...response.headers(), ...productionHeaders(pathname) } });
        } catch (err) {
            // A request still in flight when the test ends; nothing is waiting for it.
            if (!/has been closed/.test(err.message)) throw err;
        }
    });

    page.errors = [];
    page.on('pageerror', err => page.errors.push(err.message));
    page.on('console', msg => {
        if (/Content Security Policy|Refused to (load|execute|apply|frame|connect)/i.test(msg.text())) {
            page.errors.push(`CSP: ${msg.text()}`);
        }
    });
});

test.afterEach(async ({ page }) => {
    await page.context().unrouteAll({ behavior: 'ignoreErrors' });
    expect(page.errors, 'uncaught page errors').toEqual([]);
});

async function search(page, query) {
    await page.getByLabel('Search for your business').fill(query);
}

test('search finds a business by a query with no apostrophe and previews it in a sandboxed iframe', async ({ page }) => {
    await page.goto('/');
    await search(page, 'mamas kitchen');

    const cards = page.locator('#resultsGrid .business-card');
    await expect(cards).toHaveCount(1);
    await expect(page.locator('#resultsTitle')).toHaveText('Results for "mamas kitchen"');

    await cards.first().click();
    const iframe = page.locator('#modalIframe');
    await expect(page.locator('#modal-overlay')).toHaveClass(/open/);
    await expect(iframe).toHaveAttribute('src', 'previews/just-like-mamas-kitchen/index.html');

    const sandbox = await iframe.getAttribute('sandbox');
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
    expect(await iframe.evaluate(el => el.contentDocument)).toBeNull();

    await expect(page.frameLocator('#modalIframe').locator('h1').first()).toBeVisible();
});

test('multi-word queries match across name and city', async ({ page }) => {
    await page.goto('/');
    await search(page, 'bbq waco');
    await expect(page.locator('#resultsGrid .business-card')).toHaveCount(1);
    await expect(page.locator('#resultsGrid .card-name')).toHaveText("Papa Jack's BBQ");
});

test('an unmatched query shows the request-a-site message, escaped', async ({ page }) => {
    await page.goto('/');
    await search(page, '<b>sushi</b>');
    await expect(page.locator('.no-results-title')).toContainText('<b>sushi</b>');
    await expect(page.locator('.no-results-title b')).toHaveCount(0);
});

test('keyboard users can open a result and Escape returns focus to it', async ({ page }) => {
    await page.goto('/');
    await search(page, 'the eatery');
    const card = page.locator('#resultsGrid .business-card').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#modal-overlay')).toHaveClass(/open/);
    await expect(page.locator('#modalClose')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay')).not.toHaveClass(/open/);
    await expect(card).toBeFocused();
});

test('choosing a plan posts the business and plan to checkout and reports failures', async ({ page }) => {
    let sent = null;
    await page.route('**/api/checkout', async route => {
        sent = route.request().postDataJSON();
        await route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"Unknown business"}' });
    });

    await page.goto('/');
    await search(page, 'eatery');
    await page.locator('#resultsGrid .business-card').first().click();
    await page.locator('#modalPurchaseBtn').click();
    await expect(page.locator('#modalPricing .plan-card')).toHaveCount(2);

    let alertMessage = null;
    page.once('dialog', dialog => {
        alertMessage = dialog.message();
        return dialog.dismiss();
    });
    await page.locator('#modalPricing [data-plan="yearly"]').click();
    await expect.poll(() => alertMessage).toContain('Something went wrong');

    expect(sent).toEqual({ plan: 'yearly', businessId: 'the-eatery' });
    await expect(page).toHaveURL(/\/$/);

    await page.locator('#modalPurchaseBtn').click();
    await expect(page.locator('#modalIframe')).toBeVisible();
});

test('a successful checkout redirects to Stripe', async ({ page }) => {
    const stripeUrl = 'https://checkout.stripe.com/c/pay/cs_test_123';
    await page.route('**/api/checkout', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ url: stripeUrl }),
    }));
    await page.goto('/purchase.html');
    await search(page, 'dapper');
    await page.locator('#resultsGrid .business-card').first().click();
    const navigation = page.waitForRequest(req => req.url() === stripeUrl && req.isNavigationRequest());
    await page.locator('#modalPricing [data-plan="monthly"]').click();
    await navigation;
});

test('checkout refuses to redirect anywhere except Stripe', async ({ page }) => {
    await page.route('**/api/checkout', route => route.fulfill({
        status: 200, contentType: 'application/json', body: '{"url":"https://evil.example/phish"}',
    }));
    let navigatedAway = false;
    page.on('request', req => { if (req.isNavigationRequest() && req.url().includes('evil.example')) navigatedAway = true; });
    let alertMessage = null;
    page.once('dialog', dialog => { alertMessage = dialog.message(); return dialog.dismiss(); });

    await page.goto('/purchase.html');
    await search(page, 'dapper');
    await page.locator('#resultsGrid .business-card').first().click();
    await page.locator('#modalPricing [data-plan="monthly"]').click();

    await expect.poll(() => alertMessage).toContain('Something went wrong');
    expect(navigatedAway).toBe(false);
});

test('the demo form submits with an empty honeypot and shows confirmation', async ({ page }) => {
    let sent = null;
    await page.route('**/api/contact', async route => {
        sent = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });

    await page.goto('/');
    await page.locator('#demoOpenBtn').click();
    await expect(page.locator('#demoCompany')).toBeFocused();
    await page.locator('#demoCompany').fill('Test Co');
    await page.locator('#demoContact').fill('test@example.com');
    await expect(page.locator('#demoWebsite')).not.toBeInViewport();
    await page.locator('.demo-submit-btn').click();

    await expect(page.locator('#demoSuccess')).toBeVisible();
    expect(sent).toEqual({ company: 'Test Co', contact: 'test@example.com', details: '', website: '' });
});

test('all-builds lists every site in the catalog', async ({ page }) => {
    await page.goto('/all-builds.html');
    await expect(page.locator('#buildsGrid .business-card')).toHaveCount(catalog.length);
});

test('the admin tool is not deployed, and reads the manifest when run locally', async ({ page, request }) => {
    expect((await request.get('/admin.html')).status()).toBe(404);
    await page.goto(ADMIN_URL);
    await expect(page.locator('#bizCount')).toHaveText(`${catalog.length} registered`);
});

for (const path of ['/', '/purchase.html', '/all-builds.html', '/success.html']) {
    test(`${path} renders under the production CSP`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
        await expect(page.locator('#nav')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
    });
}

test('production security headers are applied to pages and previews', async ({ page }) => {
    const pageResponse = await page.goto('/');
    const csp = pageResponse.headers()['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(pageResponse.headers()['x-content-type-options']).toBe('nosniff');

    const previewResponse = await page.request.get('/previews/the-eatery/index.html');
    expect(productionHeaders('/previews/the-eatery/index.html')['content-security-policy']).toBe("frame-ancestors 'self'");
    expect(previewResponse.ok()).toBe(true);
});

test('every preview site renders inside the sandbox without script errors', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/all-builds.html');

    for (const business of catalog) {
        await page.locator(`.business-card[data-business-id="${business.id}"]`).click();
        const frame = page.frameLocator('#modalIframe');
        await expect(frame.locator('body')).not.toBeEmpty();
        const height = await frame.locator('body').evaluate(body => body.scrollHeight);
        expect(height, `${business.id} rendered content`).toBeGreaterThan(1000);
        await page.locator('#modalClose').click();
    }
});
