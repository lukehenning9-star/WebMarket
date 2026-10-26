import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeHtml } from '../../public/js/lib/escape.js';
import { businessCardHtml } from '../../public/js/lib/cards.js';

describe('escapeHtml', () => {
    it('escapes every character that is special in content or quoted attributes', () => {
        assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`),
            '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    });

    it('stringifies non-strings and treats null/undefined as empty', () => {
        assert.equal(escapeHtml(42), '42');
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
    });
});

describe('businessCardHtml', () => {
    it('escapes catalog data and carries the id in a data attribute, not inline script', () => {
        const html = businessCardHtml({
            id: `x" onmouseover="alert(1)`,
            name: '<img src=x onerror=alert(1)>',
            category: 'Café & Bar',
            city: 'Waco, TX',
            features: ['<b>Menu</b>'],
        }, 'Preview Site');

        assert.ok(!html.includes('<img'));
        assert.ok(!html.includes('<b>'));
        assert.ok(!/\sonclick=|\sonkeydown=|\sonmouseover="alert/.test(html));
        assert.ok(html.includes('data-business-id="x&quot; onmouseover=&quot;alert(1)"'));
        assert.ok(html.includes('Café &amp; Bar'));
    });
});
