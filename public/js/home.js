import { initNavScroll } from './lib/nav.js';
import { createPreviewModal } from './lib/preview-modal.js';
import { initSearchPage } from './lib/search-page.js';

initNavScroll();

const previewModal = createPreviewModal();
initSearchPage({
    actionLabel: 'Preview Site',
    countLabel: 'ready to preview',
    onSelect: business => previewModal.openPreview(business),
});

const searchInput = document.getElementById('searchInput');
function updatePlaceholder() {
    searchInput.placeholder = window.innerWidth < 640
        ? 'Search your business…'
        : 'Search your business name…';
}
updatePlaceholder();
window.addEventListener('resize', updatePlaceholder, { passive: true });


/* Demo request modal */
const demoOverlay = document.getElementById('demo-modal-overlay');
const demoForm    = document.getElementById('demoForm');
const demoSuccess = document.getElementById('demoSuccess');

function openDemoModal() {
    demoOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('demoCompany').focus();
}

function closeDemoModal() {
    demoOverlay.classList.remove('open');
    document.body.style.overflow = '';
    demoForm.hidden = false;
    demoForm.reset();
    demoSuccess.hidden = true;
}

async function submitDemo(event) {
    event.preventDefault();
    const field = id => document.getElementById(id).value;
    const payload = {
        company: field('demoCompany').trim(),
        contact: field('demoContact').trim(),
        details: field('demoDetails').trim(),
        website: field('demoWebsite'),
    };
    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            demoForm.hidden = true;
            demoSuccess.hidden = false;
        } else if (res.status === 429) {
            alert("You've sent a few requests already. Please try again in a few minutes.");
        } else {
            alert('Something went wrong. Please try again.');
        }
    } catch {
        alert('Something went wrong. Please try again.');
    }
}

document.getElementById('demoOpenBtn').addEventListener('click', openDemoModal);
document.getElementById('demoCloseBtn').addEventListener('click', closeDemoModal);
demoForm.addEventListener('submit', submitDemo);
demoOverlay.addEventListener('click', event => { if (event.target === demoOverlay) closeDemoModal(); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && demoOverlay.classList.contains('open')) closeDemoModal();
});


/* Scroll-reveal fallback for browsers without CSS scroll-driven animations */
if (!CSS.supports('animation-timeline: view()')) {
    const steps = document.querySelectorAll('.step');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.style.opacity = '';
            entry.target.style.transform = '';
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.15 });

    steps.forEach((step, i) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(12px)';
        step.style.transition = `opacity 0.65s ${i * 0.1}s cubic-bezier(0.22,1,0.36,1), transform 0.65s ${i * 0.1}s cubic-bezier(0.22,1,0.36,1)`;
        observer.observe(step);
    });
}
