/* ============================================================
   Keep it Cute Grooming — app.js
   Vanilla JS only. No frameworks.
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. NAV: transparent → solid white on scroll
  ---------------------------------------------------------- */
  var nav = document.getElementById('nav');

  function updateNav() {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav(); // run on load in case user loads at scroll position


  /* ----------------------------------------------------------
     2. HAMBURGER MENU — mobile nav toggle
  ---------------------------------------------------------- */
  var hamburger  = document.getElementById('hamburger');
  var navLinks   = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when any nav link is tapped
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside nav
    document.addEventListener('click', function (e) {
      if (nav && !nav.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }


  /* ----------------------------------------------------------
     3. SMOOTH SCROLL — offset for fixed nav
  ---------------------------------------------------------- */
  var NAV_HEIGHT = 68;

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      var offsetTop = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    });
  });


  /* ----------------------------------------------------------
     4. HOURS STATUS BADGE
     Business hours: Mon–Sat 9 AM–7 PM, Sunday closed.
     JS day: 0 = Sunday, 1 = Monday ... 6 = Saturday
  ---------------------------------------------------------- */
  function renderStatusBadge() {
    var badge = document.getElementById('status-badge');
    if (!badge) return;

    var now   = new Date();
    var day   = now.getDay();    // 0 (Sun) – 6 (Sat)
    var hour  = now.getHours();  // 0–23
    var min   = now.getMinutes();

    // Decimal time for easy comparison (e.g. 9:30 AM = 9.5)
    var time = hour + (min / 60);

    var isWeekday = day >= 1 && day <= 6;     // Mon–Sat
    var isOpenNow = isWeekday && time >= 9 && time < 19;  // 9 AM to 7 PM

    if (isOpenNow) {
      badge.textContent = 'Open Now';
      badge.className   = 'info__status-badge open';
    } else if (day === 0) {
      // Sunday — closed, say when they open next
      badge.textContent = 'Closed Today — Opens Monday 9 AM';
      badge.className   = 'info__status-badge closed';
    } else if (day === 6 && time >= 19) {
      // Saturday after hours — closed until Monday
      badge.textContent = 'Closed — Opens Monday 9 AM';
      badge.className   = 'info__status-badge closed';
    } else if (time >= 19) {
      // Weekday after 7 PM
      badge.textContent = 'Closed Now — Opens Tomorrow 9 AM';
      badge.className   = 'info__status-badge closed';
    } else {
      // Weekday before 9 AM
      badge.textContent = 'Closed — Opens at 9 AM';
      badge.className   = 'info__status-badge closed';
    }

    badge.style.display = 'inline-flex';
  }

  renderStatusBadge();

})();
