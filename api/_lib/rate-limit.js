/**
 * Sliding-window limiter kept in memory. Serverless instances don't share
 * memory, so this slows down a single abusive client rather than enforcing a
 * global quota; a shared store (e.g. Redis) would be needed for that.
 */
export function createRateLimiter({ windowMs, max, maxKeys = 1000, now = Date.now }) {
    const hits = new Map();

    function prune(time) {
        for (const [key, times] of hits) {
            if (times.every(t => time - t >= windowMs)) hits.delete(key);
        }
    }

    /** Records a request for `key` and returns true if it is over the limit. */
    return function isLimited(key) {
        const time = now();
        const recent = (hits.get(key) || []).filter(t => time - t < windowMs);
        const limited = recent.length >= max;
        if (!limited) recent.push(time);
        hits.set(key, recent);
        if (hits.size > maxKeys) prune(time);
        return limited;
    };
}

export function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}
