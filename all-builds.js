const nav        = document.getElementById('nav');
const modalOverlay = document.getElementById('modal-overlay');
const modalIframe  = document.getElementById('modalIframe');
const modalPricing = document.getElementById('modalPricing');
const modalLoading = document.getElementById('modalLoading');
const modalName    = document.getElementById('modalBusinessName');
const modalBuyBtn  = document.getElementById('modalPurchaseBtn');
const modalClose   = document.getElementById('modalClose');

let businesses = [];

async function init() {
    try {
        const res = await fetch('previews/manifest.json');
        if (!res.ok) throw new Error();
        businesses = await res.json();
    } catch {
        businesses = [];
    }
    renderAll();
}

function renderAll() {
    const grid = document.getElementById('buildsGrid');
    if (!businesses.length) {
        grid.innerHTML = '<p class="builds-empty">No builds yet.</p>';
        return;
    }
    grid.innerHTML = businesses.map(b => card(b)).join('');
}

function card(b) {
    const tags = (b.features || []).map(f => `<span class="feature-tag">${escHtml(f)}</span>`).join('');
    return `
        <div class="business-card" onclick="openPreview('${escAttr(b.id)}')" role="button" tabindex="0"
             aria-label="Preview website for ${escAttr(b.name)}"
             onkeydown="if(event.key==='Enter'||event.key===' ')openPreview('${escAttr(b.id)}')">
            <p class="card-category">${escHtml(b.category)}</p>
            <h3 class="card-name">${escHtml(b.name)}</h3>
            <p class="card-city">${escHtml(b.city)}</p>
            <div class="card-features">${tags}</div>
            <div class="card-footer">
                <span class="card-btn">Preview Site →</span>
            </div>
        </div>`;
}

function openPreview(businessId) {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;

    modalName.textContent = biz.name;
    modalBuyBtn.innerHTML = '<span class="btn-text-full">Purchase This Website</span><span class="btn-text-short">Buy</span>';
    modalBuyBtn.onclick = () => showPricing(biz.id, biz.tier || 3);
    hidePricing();

    modalLoading.style.display = 'flex';
    modalIframe.src = '';
    modalIframe.onload = () => { setTimeout(() => { modalLoading.style.display = 'none'; }, 200); };
    modalIframe.src = `${biz.previewPath}/index.html`;

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function showPricing(businessId, tier) {
    const t3 = tier === 3;
    const setup   = t3 ? '$1,000' : '$750';
    const monthly = t3 ? '$100'   : '$75';
    const yearly  = t3 ? '$1,000' : '$750';
    const savings = t3 ? 'Save $200 vs monthly' : 'Save $150 vs monthly';

    modalIframe.style.display = 'none';
    modalLoading.style.display = 'none';
    modalPricing.style.display = 'block';
    modalPricing.innerHTML = `
        <div class="pricing-wrap">
            <h2 class="pricing-title">Get your website live</h2>
            <p class="pricing-sub">${setup} one-time setup fee included with your first payment.</p>
            <div class="pricing-plans">
                <button class="plan-card" onclick="startCheckout('${escAttr(businessId)}','monthly',${tier || 3})">
                    <span class="plan-name">Monthly</span>
                    <span class="plan-price">${monthly}<em>/mo</em></span>
                    <span class="plan-note">Cancel anytime</span>
                </button>
                <button class="plan-card plan-card--featured" onclick="startCheckout('${escAttr(businessId)}','yearly',${tier || 3})">
                    <span class="plan-name">Yearly</span>
                    <span class="plan-price">${yearly}<em>/yr</em></span>
                    <span class="plan-note">${savings}</span>
                </button>
            </div>
            <p class="pricing-legal">${setup} setup + your chosen plan charged today. Renews automatically.</p>
        </div>`;
    modalBuyBtn.innerHTML = '← Back to preview';
    modalBuyBtn.onclick = () => hidePricing(businessId, tier);
}

async function startCheckout(businessId, plan, tier) {
    try {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, businessId, tier: tier || 3 }),
        });
        const { url } = await res.json();
        window.location.href = url;
    } catch {
        alert('Something went wrong. Please try again.');
    }
}

function hidePricing(businessId, tier) {
    modalPricing.style.display = 'none';
    modalPricing.innerHTML = '';
    modalIframe.style.display = '';
    if (businessId) {
        modalBuyBtn.innerHTML = '<span class="btn-text-full">Purchase This Website</span><span class="btn-text-short">Buy</span>';
        modalBuyBtn.onclick = () => showPricing(businessId, tier);
    }
}

function closeModal() {
    modalOverlay.classList.remove('open');
    modalIframe.src = '';
    hidePricing();
    document.body.style.overflow = '';
}

modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

window.openPreview   = openPreview;
window.startCheckout = startCheckout;

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
}, { passive: true });

function escHtml(str) {
    const el = document.createElement('div');
    el.textContent = String(str);
    return el.innerHTML;
}

function escAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

init();
