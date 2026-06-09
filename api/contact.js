const nodemailer = require('nodemailer');
const NOTIFY_EMAIL = 'lukewebsitemarket@gmail.com';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { company, contact, details } = req.body;
    if (!company || !contact) {
        return res.status(400).json({ error: 'Missing required fields' });
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
    } catch {
        res.status(500).json({ error: 'Failed to send' });
    }
};
