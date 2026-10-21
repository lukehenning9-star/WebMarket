const nav            = document.getElementById('nav');
const searchInput    = document.getElementById('searchInput');
const searchBtn      = document.getElementById('searchBtn');
const resultsSection = document.getElementById('results-section');
const resultsGrid    = document.getElementById('resultsGrid');
const resultsTitle   = document.getElementById('resultsTitle');
const resultsCount   = document.getElementById('resultsCount');
const modalOverlay   = document.getElementById('modal-overlay');
const modalPricing   = document.getElementById('modalPricing');
const modalName      = document.getElementById('modalBusinessName');
const modalClose     = document.getElementById('modalClose');

let businesses = [];

async function loadBusinesses() {
    try {
        const res = await fetch('previews/manifest.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        businesses = await res.json();
    } catch (err) {
        businesses = null;
    }
}

loadBusinesses();

searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (q.length >= 2) runSearch(q);
    else hideResults();
});

searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q.length >= 2) {
            runSearch(q);
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});

searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q.length < 2) return;
    runSearch(q);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function runSearch(query) {
    if (businesses === null) {
        resultsSection.classList.add('visible');
        resultsTitle.textContent = 'Setup required';
        resultsCount.textContent = '';
        resultsGrid.innerHTML = `<div class="load-error"><strong>Could not load business data.</strong></div>`;
        return;
    }
    const q = query.toLowerCase();
    const matches = businesses.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q)
    );
    renderResults(matches, query);
}

function renderResults(list, query) {
    resultsSection.classList.add('visible');
    if (list.length > 0) {
        resultsTitle.textContent = `Results for "${query}"`;
        resultsCount.textContent = `${list.length} website${list.length !== 1 ? 's' : ''} available`;
        resultsGrid.innerHTML = list.map(b => purchaseCard(b)).join('');
    } else {
        resultsTitle.textContent = `No results for "${query}"`;
        resultsCount.textContent = '';
        resultsGrid.innerHTML = `
            <div class="no-results">
                <p class="no-results-title">We haven't built a site for "${escHtml(query)}" yet.</p>
                <p class="no-results-sub">
                    Want one?
                    <a href="mailto:lukewebsitemarket@gmail.com?subject=New%20Website%20Request&body=Hi%2C%20I%27d%20like%20a%20website%20for%20my%20business.">
                        Reach out and we'll get started →
                    </a>
                </p>
            </div>`;
    }
}

function hideResults() {
    resultsSection.classList.remove('visible');
}

function purchaseCard(b) {
    const tags = (b.features || [])
        .map(f => `<span class="feature-tag">${escHtml(f)}</span>`)
        .join('');
    return `
        <div class="business-card" onclick="openPurchase('${escAttr(b.id)}')" role="button" tabindex="0"
             aria-label="Purchase website for ${escAttr(b.name)}"
             onkeydown="if(event.key==='Enter'||event.key===' ')openPurchase('${escAttr(b.id)}')">
            <p class="card-category">${escHtml(b.category)}</p>
            <h3 class="card-name">${escHtml(b.name)}</h3>
            <p class="card-city">${escHtml(b.city)}</p>
            <div class="card-features">${tags}</div>
            <div class="card-footer">
                <span class="card-btn">Purchase →</span>
            </div>
        </div>`;
}

function openPurchase(businessId) {
    const biz = businesses && businesses.find(b => b.id === businessId);
    if (!biz) return;

    modalName.textContent = biz.name;
    modalPricing.innerHTML = `
        <div class="pricing-wrap">
            <h2 class="pricing-title">Get your website live</h2>
            <p class="pricing-sub">$500 one-time setup fee included with your first payment.</p>
            <div class="pricing-plans">
                <button class="plan-card" onclick="startCheckout('${escAttr(biz.id)}','monthly')">
                    <span class="plan-name">Monthly</span>
                    <span class="plan-price">$100<em>/mo</em></span>
                    <span class="plan-note">Cancel anytime</span>
                </button>
                <button class="plan-card plan-card--featured" onclick="startCheckout('${escAttr(biz.id)}','yearly')">
                    <span class="plan-name">Yearly</span>
                    <span class="plan-price">$1,000<em>/yr</em></span>
                    <span class="plan-note">Save $200 vs monthly</span>
                </button>
            </div>
            <p class="pricing-legal">$500 setup + your chosen plan charged today. Renews automatically.</p>
        </div>`;

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

async function startCheckout(businessId, plan) {
    try {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, businessId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        window.location.href = data.url;
    } catch (err) {
        console.error('Checkout failed:', err.message);
        alert('Something went wrong starting checkout. Please try again.');
    }
}

modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
});

modalClose.addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

window.openPurchase = openPurchase;
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
