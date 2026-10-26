import { loadCatalog, findBusiness } from './catalog.js';
import { businessCardHtml, onCardActivate } from './cards.js';
import { escapeHtml } from './escape.js';
import { MIN_QUERY_LENGTH, searchBusinesses } from './search.js';

const CONTACT_MAILTO = 'mailto:lukewebsitemarket@gmail.com?subject=New%20Website%20Request&body=Hi%2C%20I%27d%20like%20a%20website%20for%20my%20business.';

/**
 * Connects the search box, results grid and catalog on a page.
 * `onSelect(business)` runs when a result card is chosen.
 */
export function initSearchPage({ actionLabel, countLabel, onSelect }) {
    const input   = document.getElementById('searchInput');
    const button  = document.getElementById('searchBtn');
    const section = document.getElementById('results-section');
    const grid    = document.getElementById('resultsGrid');
    const title   = document.getElementById('resultsTitle');
    const count   = document.getElementById('resultsCount');

    let catalog = [];
    let loadError = null;
    const ready = loadCatalog()
        .then(data => { catalog = data; })
        .catch(err => {
            loadError = err;
            console.warn(err.message);
        });

    function render(query) {
        section.classList.add('visible');

        if (loadError) {
            title.textContent = 'Search is unavailable';
            count.textContent = '';
            grid.innerHTML = `
                <div class="load-error">
                    <strong>Could not load business data.</strong><br><br>
                    Please refresh the page. If you're running locally, serve the site over HTTP:
                    <code>npm run dev</code>
                </div>`;
            return;
        }

        const matches = searchBusinesses(catalog, query);
        if (matches.length > 0) {
            title.textContent = `Results for "${query}"`;
            count.textContent = `${matches.length} website${matches.length !== 1 ? 's' : ''} ${countLabel}`;
            grid.innerHTML = matches.map(business => businessCardHtml(business, actionLabel)).join('');
        } else {
            title.textContent = `No results for "${query}"`;
            count.textContent = '';
            grid.innerHTML = `
                <div class="no-results">
                    <p class="no-results-title">We haven't built a site for "${escapeHtml(query)}" yet.</p>
                    <p class="no-results-sub">
                        Want one? <a href="${CONTACT_MAILTO}">Reach out and we'll get started →</a>
                    </p>
                </div>`;
        }
    }

    async function search({ scroll }) {
        const query = input.value.trim();
        if (query.length < MIN_QUERY_LENGTH) {
            section.classList.remove('visible');
            return;
        }
        await ready;
        if (input.value.trim() !== query) return;
        render(query);
        if (scroll) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    input.addEventListener('input', () => search({ scroll: false }));
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') search({ scroll: true });
    });
    button.addEventListener('click', () => search({ scroll: true }));

    onCardActivate(grid, id => {
        const business = findBusiness(catalog, id);
        if (business) onSelect(business);
    });
}
