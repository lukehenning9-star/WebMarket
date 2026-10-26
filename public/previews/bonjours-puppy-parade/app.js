'use strict';

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

reveals.forEach(el => revealObserver.observe(el));

// Hours status badge
const badge = document.getElementById('statusBadge');
if (badge) {
  const now  = new Date();
  const day  = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const mins = now.getHours() * 60 + now.getMinutes();

  const schedule = {
    2: { open: 8  * 60, close: 17 * 60 }, // Tue
    3: { open: 8  * 60, close: 17 * 60 }, // Wed
    4: { open: 7  * 60, close: 17 * 60 }, // Thu
    5: { open: 8  * 60, close: 17 * 60 }, // Fri
    6: { open: 8  * 60, close: 12 * 60 }, // Sat
  };

  const today = schedule[day];
  const isOpen = today && mins >= today.open && mins < today.close;

  badge.textContent = isOpen ? 'Open Now' : 'Closed Now';
  badge.classList.add(isOpen ? 'open' : 'closed');
  badge.style.display = 'inline-flex';
}
