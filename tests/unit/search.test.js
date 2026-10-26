import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { normalize, scoreBusiness, searchBusinesses, tokenize } from '../../public/js/lib/search.js';

const catalog = JSON.parse(readFileSync(new URL('../../public/previews/manifest.json', import.meta.url)));
const ids = results => results.map(b => b.id);

describe('normalize', () => {
    it('lowercases and drops apostrophes so possessives match', () => {
        assert.equal(normalize("Just Like Mama's Kitchen"), 'just like mamas kitchen');
        assert.equal(normalize('Bonjour’s'), 'bonjours');
    });

    it('turns punctuation runs into single spaces', () => {
        assert.equal(normalize('Barks-An-Bubbles'), 'barks an bubbles');
        assert.equal(normalize('  Tanker BBQ Co.  '), 'tanker bbq co');
        assert.equal(normalize('Waco, TX'), 'waco tx');
    });

    it('strips accents', () => {
        assert.equal(normalize('Café Crème'), 'cafe creme');
    });

    it('handles empty and missing values', () => {
        assert.equal(normalize(undefined), '');
        assert.deepEqual(tokenize('  -- '), []);
    });
});

describe('scoreBusiness', () => {
    const biz = { name: 'Papa Jack’s BBQ', category: 'BBQ Restaurant', city: 'Waco, TX' };

    it('returns 0 when any token matches no field', () => {
        assert.equal(scoreBusiness(biz, ['bbq', 'wichita']), 0);
    });

    it('weights a name match above a city match', () => {
        const nameHit = scoreBusiness({ name: 'Waco Grill', category: '', city: 'Austin' }, ['waco']);
        const cityHit = scoreBusiness({ name: 'Grill', category: '', city: 'Waco' }, ['waco']);
        assert.ok(nameHit > cityHit);
    });

    it('scores a word-prefix match above a mid-word match', () => {
        const prefix = scoreBusiness({ name: 'Groom Room', category: '', city: '' }, ['groom']);
        const infix = scoreBusiness({ name: 'Bridegroomers', category: '', city: '' }, ['groom']);
        assert.ok(prefix > infix && infix > 0);
    });
});

describe('searchBusinesses (against the real catalog)', () => {
    it('finds a business whose name has an apostrophe when the query has none', () => {
        assert.deepEqual(ids(searchBusinesses(catalog, 'mamas kitchen')), ['just-like-mamas-kitchen']);
    });

    it('matches multi-word queries across fields (name + city)', () => {
        assert.deepEqual(ids(searchBusinesses(catalog, 'bbq waco')), ['papa-jacks-bbq']);
    });

    it('requires every token to match', () => {
        assert.deepEqual(searchBusinesses(catalog, 'bbq andover'), []);
    });

    it('puts the exact business first when its full name is typed', () => {
        assert.equal(searchBusinesses(catalog, 'The Eatery')[0].id, 'the-eatery');
        assert.equal(searchBusinesses(catalog, "papa jack's bbq")[0].id, 'papa-jacks-bbq');
    });

    it('ranks name matches above category-only matches', () => {
        const results = ids(searchBusinesses(catalog, 'grooming'));
        assert.ok(results.length >= 4);
        const nameMatches = catalog
            .filter(b => normalize(b.name).split(' ').some(w => w.startsWith('grooming')))
            .map(b => b.id);
        assert.deepEqual(results.slice(0, nameMatches.length).sort(), nameMatches.sort());
    });

    it('matches hyphenated names typed with spaces', () => {
        assert.equal(searchBusinesses(catalog, 'barks an bubbles')[0].id, 'barks-an-bubbles');
    });

    it('returns every business in a city', () => {
        const wacoIds = catalog.filter(b => b.city.startsWith('Waco')).map(b => b.id).sort();
        assert.deepEqual(ids(searchBusinesses(catalog, 'waco')).sort(), wacoIds);
    });

    it('breaks score ties alphabetically so results are stable', () => {
        const results = searchBusinesses(catalog, 'wichita');
        const names = results.map(b => b.name);
        assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
    });

    it('returns nothing for blank or unmatched queries', () => {
        assert.deepEqual(searchBusinesses(catalog, '   '), []);
        assert.deepEqual(searchBusinesses(catalog, 'sushi'), []);
    });
});
