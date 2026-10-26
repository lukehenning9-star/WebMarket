// Sticky nav scroll shadow
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');

navToggle.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

function closeMobileNav() {
  navMobile.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}

// Scroll reveal with per-sibling stagger
const revealEls = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => {
  const siblings = el.parentElement.querySelectorAll('.reveal');
  const idx = Array.from(siblings).indexOf(el);
  el.style.transitionDelay = `${idx * 0.07}s`;
  revealObserver.observe(el);
});

// Smooth-scroll all hash links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '76', 10);
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      closeMobileNav();
    }
  });
});
