const nodemailer = require('nodemailer');
const NOTIFY_EMAIL = 'lukewebsitemarket@gmail.com';

const LIMITS = { company: 120, contact: 120, details: 2000 };

// Per-instance sliding window. Serverless instances don't share memory, so this
// slows down a single abusive client rather than enforcing a global quota.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 3;
const requestLog = new Map();

function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
    const now = Date.now();
    const recent = (requestLog.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX_REQUESTS) {
        requestLog.set(ip, recent);
        return true;
    }
    recent.push(now);
    requestLog.set(ip, recent);

    if (requestLog.size > 1000) {
        for (const [key, times] of requestLog) {
            if (times.every(t => now - t >= RATE_WINDOW_MS)) requestLog.delete(key);
        }
    }
    return false;
}

function clean(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

module.exports = async function handler(req, res) {
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

    const subject = `Demo Request — ${company}`;
    const text = [
        `Company: ${company}`,
        `Contact: ${contact}`,
        `Details: ${details || '(not provided)'}`,
    ].join('\n');

    try {
        if (process.env.GMAIL_APP_PASSWORD) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
            });
            await transporter.sendMail({ from: NOTIFY_EMAIL, to: NOTIFY_EMAIL, subject, text });
        }
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[contact] Failed to send email:', err.message);
        res.status(500).json({ error: 'Failed to send' });
    }
};
