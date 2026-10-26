import { initNavScroll } from './lib/nav.js';
import { createPreviewModal } from './lib/preview-modal.js';
import { initSearchPage } from './lib/search-page.js';

initNavScroll();

const modal = createPreviewModal();
initSearchPage({
    actionLabel: 'Purchase',
    countLabel: 'available',
    onSelect: business => modal.openPricing(business),
});
