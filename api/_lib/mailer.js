import nodemailer from 'nodemailer';

export const NOTIFY_EMAIL = 'lukewebsitemarket@gmail.com';

/**
 * Emails the business inbox. Without GMAIL_APP_PASSWORD (local dev, previews)
 * it logs and returns instead of failing the request.
 */
export async function sendNotification(subject, text) {
    if (!process.env.GMAIL_APP_PASSWORD) {
        console.log('GMAIL_APP_PASSWORD not set — skipping email:', subject);
        return;
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({ from: NOTIFY_EMAIL, to: NOTIFY_EMAIL, subject, text });
}
