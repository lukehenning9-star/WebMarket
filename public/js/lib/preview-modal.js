import { renderPricing } from './checkout.js';

const BUY_LABEL = '<span class="btn-text-full">Purchase This Website</span><span class="btn-text-short">Buy</span>';

/**
 * Wires up the #modal-overlay dialog. Pages that have an iframe use `openPreview`;
 * the purchase page has no iframe and uses `openPricing` directly.
 */
export function createPreviewModal() {
    const overlay = document.getElementById('modal-overlay');
    const nameEl  = document.getElementById('modalBusinessName');
    const iframe  = document.getElementById('modalIframe');
    const loading = document.getElementById('modalLoading');
    const pricing = document.getElementById('modalPricing');
    const buyBtn  = document.getElementById('modalPurchaseBtn');
    const closeBtn = document.getElementById('modalClose');

    let current = null;
    let returnFocusTo = null;

    function show(business) {
        current = business;
        returnFocusTo = document.activeElement;
        nameEl.textContent = business.name;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }

    function showIframe() {
        pricing.style.display = 'none';
        pricing.innerHTML = '';
        iframe.style.display = '';
        buyBtn.innerHTML = BUY_LABEL;
    }

    function showPricingPanel() {
        if (iframe) iframe.style.display = 'none';
        if (loading) loading.style.display = 'none';
        pricing.style.display = 'block';
        renderPricing(pricing, current.id);
        if (buyBtn) buyBtn.innerHTML = '← Back to preview';
    }

    function openPreview(business) {
        show(business);
        showIframe();
        loading.style.display = 'flex';
        iframe.onload = () => setTimeout(() => { loading.style.display = 'none'; }, 200);
        iframe.src = `${business.previewPath}/index.html`;
    }

    function openPricing(business) {
        show(business);
        showPricingPanel();
    }

    function close() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        if (iframe) {
            iframe.onload = null;
            iframe.removeAttribute('src');
            showIframe();
        }
        current = null;
        if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus();
    }

    buyBtn?.addEventListener('click', () => {
        if (!current) return;
        if (pricing.style.display === 'block') showIframe();
        else showPricingPanel();
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay.classList.contains('open')) close();
    });

    return { openPreview, openPricing, close };
}
