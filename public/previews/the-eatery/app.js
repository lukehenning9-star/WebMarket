/* THE EATERY — app.js */

// Make tel: links work when page is loaded inside a preview iframe
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="tel:"]');
  if (a && window !== window.top) {
    e.preventDefault();
    window.top.location.href = a.href;
  }
});

// Sticky nav shadow on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 24);
}, { passive: true });

// Scroll-reveal for sections
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// Menu tab switching
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.menu-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('tab-active'));
    btn.classList.add('tab-active');
    tabPanels.forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `tab-${target}`);
    });
  });
});
