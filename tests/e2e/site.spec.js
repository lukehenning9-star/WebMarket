import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const catalog = JSON.parse(readFileSync(new URL('../../public/previews/manifest.json', import.meta.url)));

test.beforeEach(async ({ page, baseURL }) => {
    // Keep runs deterministic and offline: block fonts, stock photos and maps.
    await page.context().route(url => !url.href.startsWith(baseURL), route => route.abort());

    page.errors = [];
    page.on('pageerror', err => page.errors.push(err.message));
});

test.afterEach(async ({ page }) => {
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

test('a successful checkout redirects to the Stripe URL', async ({ page }) => {
    await page.route('**/api/checkout', route => route.fulfill({
        status: 200, contentType: 'application/json', body: '{"url":"/success.html"}',
    }));
    await page.goto('/purchase.html');
    await search(page, 'dapper');
    await page.locator('#resultsGrid .business-card').first().click();
    await page.locator('#modalPricing [data-plan="monthly"]').click();
    await expect(page).toHaveURL(/success\.html$/);
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

test('admin reads the generated manifest', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page.locator('#bizCount')).toHaveText(`${catalog.length} registered`);
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
