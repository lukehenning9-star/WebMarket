/**
 * True when the request declares a JSON body. Requiring JSON blocks
 * cross-site form posts: a browser only sends application/json cross-origin
 * after a CORS preflight, and these endpoints never grant one.
 */
export function isJsonRequest(req) {
    const type = req.headers?.['content-type'];
    return typeof type === 'string' && type.toLowerCase().split(';')[0].trim() === 'application/json';
}
