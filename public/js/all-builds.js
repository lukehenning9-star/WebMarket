import { businessCardHtml, onCardActivate } from './lib/cards.js';
import { findBusiness, loadCatalog } from './lib/catalog.js';
import { initNavScroll } from './lib/nav.js';
import { createPreviewModal } from './lib/preview-modal.js';

initNavScroll();

const grid = document.getElementById('buildsGrid');
const modal = createPreviewModal();
let catalog = [];

try {
    catalog = await loadCatalog();
} catch (err) {
    console.warn(err.message);
}

grid.innerHTML = catalog.length
    ? catalog.map(business => businessCardHtml(business, 'Preview Site')).join('')
    : '<p class="builds-empty">No builds yet.</p>';

onCardActivate(grid, id => {
    const business = findBusiness(catalog, id);
    if (business) modal.openPreview(business);
});
