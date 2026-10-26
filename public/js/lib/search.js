/**
 * Client-side search over the site catalog (previews/manifest.json).
 *
 * Every query token must match at least one field (AND semantics). Each token
 * scores by the best field it hits, weighted name > category > city, and a
 * match at the start of a word beats a match in the middle of one. A name that
 * starts with the whole query gets a bonus so typing a business's name puts it
 * first. Ties sort alphabetically so results are stable.
 */

export const MIN_QUERY_LENGTH = 2;

const FIELD_WEIGHTS = { name: 3, category: 2, city: 1 };
const WORD_PREFIX = 2;
const SUBSTRING = 1;
const NAME_PREFIX_BONUS = 5;
const EXACT_NAME_BONUS = 10;

/**
 * Lowercases, strips accents, drops apostrophes ("Mama's" -> "mamas") and turns
 * every other run of punctuation into a single space ("Barks-An-Bubbles" ->
 * "barks an bubbles").
 */
export function normalize(text) {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['‘’`]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function tokenize(text) {
    const normalized = normalize(text);
    return normalized ? normalized.split(' ') : [];
}

function matchStrength(fieldText, fieldWords, token) {
    if (fieldWords.some(word => word.startsWith(token))) return WORD_PREFIX;
    if (fieldText.includes(token)) return SUBSTRING;
    return 0;
}

/** Returns the relevance score of one business for the given tokens, or 0 if it doesn't match. */
export function scoreBusiness(business, tokens, normalizedQuery = tokens.join(' ')) {
    if (tokens.length === 0) return 0;

    const fields = Object.keys(FIELD_WEIGHTS).map(key => {
        const text = normalize(business[key]);
        return { weight: FIELD_WEIGHTS[key], text, words: text ? text.split(' ') : [] };
    });

    let score = 0;
    for (const token of tokens) {
        let best = 0;
        for (const field of fields) {
            best = Math.max(best, field.weight * matchStrength(field.text, field.words, token));
        }
        if (best === 0) return 0;
        score += best;
    }

    const name = fields[0].text;
    if (name === normalizedQuery) score += EXACT_NAME_BONUS;
    else if (name.startsWith(normalizedQuery)) score += NAME_PREFIX_BONUS;

    return score;
}

/** Returns the businesses matching `query`, best match first. */
export function searchBusinesses(businesses, query) {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const normalizedQuery = tokens.join(' ');

    return businesses
        .map(business => ({ business, score: scoreBusiness(business, tokens, normalizedQuery) }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score || a.business.name.localeCompare(b.business.name))
        .map(result => result.business);
}
