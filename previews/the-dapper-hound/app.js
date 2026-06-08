/* ============================================================
   THE DAPPER HOUND — app.js
   ============================================================ */

(function () {
  'use strict';

  // ── NAV SCROLL BEHAVIOR ──────────────────────────────────
  var nav = document.getElementById('nav');

  function onScroll() {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── MOBILE MENU ──────────────────────────────────────────
  var navToggle = document.getElementById('navToggle');
  var navLinks  = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ── IMAGE LOAD HANDLING ──────────────────────────────────
  document.querySelectorAll('img[data-src], img[src]').forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', function () {
        img.classList.add('loaded');
      });
      img.addEventListener('error', function () {
        img.style.display = 'none';
      });
    }
  });

  // ── SCROLL REVEAL ────────────────────────────────────────
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ── SMOOTH ANCHOR SCROLL ─────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var offset = nav ? nav.offsetHeight + 8 : 0;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  // ── GALLERY CAPTION ON TOUCH ─────────────────────────────
  if ('ontouchstart' in window) {
    document.querySelectorAll('.gallery-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var caption = item.querySelector('.gallery-caption');
        if (!caption) return;
        var visible = caption.style.transform === 'translateY(0px)';
        caption.style.transform = visible ? '' : 'translateY(0px)';
      });
    });
  }
})();
