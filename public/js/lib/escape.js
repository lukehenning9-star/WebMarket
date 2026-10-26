const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Escapes text for use inside HTML element content or a quoted attribute value. */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}
