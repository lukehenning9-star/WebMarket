import { sendNotification } from './_lib/mailer.js';
import { clientIp, createRateLimiter } from './_lib/rate-limit.js';

export const LIMITS = { company: 120, contact: 120, details: 2000 };

function clean(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

export function createContactHandler({ notify, isRateLimited }) {
    return async function handler(req, res) {
        if (req.method !== 'POST') return res.status(405).end();

        const body = req.body || {};

        // Hidden field that people never see; bots that fill every input trip it.
        if (body.website) {
            return res.status(200).json({ ok: true });
        }

        const company = clean(body.company, LIMITS.company).replace(/\s+/g, ' ');
        const contact = clean(body.contact, LIMITS.contact).replace(/\s+/g, ' ');
        const details = clean(body.details, LIMITS.details);

        if (!company || !contact) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (isRateLimited(clientIp(req))) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        const text = [
            `Company: ${company}`,
            `Contact: ${contact}`,
            `Details: ${details || '(not provided)'}`,
        ].join('\n');

        try {
            await notify(`Demo Request — ${company}`, text);
            return res.status(200).json({ ok: true });
        } catch (err) {
            console.error('[contact] Failed to send email:', err.message);
            return res.status(500).json({ error: 'Failed to send' });
        }
    };
}

export default createContactHandler({
    notify: sendNotification,
    isRateLimited: createRateLimiter({ windowMs: 10 * 60 * 1000, max: 3 }),
});
