import { escapeHtml } from './escape.js';

/** Markup for one result card. Clicks are handled by `onCardActivate`, not inline handlers. */
export function businessCardHtml(business, actionLabel) {
    const tags = (business.features || [])
        .map(feature => `<span class="feature-tag">${escapeHtml(feature)}</span>`)
        .join('');

    return `
        <div class="business-card" data-business-id="${escapeHtml(business.id)}" role="button" tabindex="0"
             aria-label="${escapeHtml(`${actionLabel}: ${business.name}`)}">
            <p class="card-category">${escapeHtml(business.category)}</p>
            <h3 class="card-name">${escapeHtml(business.name)}</h3>
            <p class="card-city">${escapeHtml(business.city)}</p>
            <div class="card-features">${tags}</div>
            <div class="card-footer">
                <span class="card-btn">${escapeHtml(actionLabel)} →</span>
            </div>
        </div>`;
}

/** Calls `handler(businessId)` when a card inside `container` is clicked or activated by keyboard. */
export function onCardActivate(container, handler) {
    const activate = event => {
        const card = event.target.closest('.business-card[data-business-id]');
        if (card && container.contains(card)) handler(card.dataset.businessId);
    };
    container.addEventListener('click', activate);
    container.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            if (event.target.matches('.business-card')) event.preventDefault();
            activate(event);
        }
    });
}
