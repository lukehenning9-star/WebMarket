/** Adds the `scrolled` class to #nav once the page is scrolled past the hero edge. */
export function initNavScroll(threshold = 80) {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const update = () => nav.classList.toggle('scrolled', window.scrollY > threshold);
    window.addEventListener('scroll', update, { passive: true });
    update();
}
