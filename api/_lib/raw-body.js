/** Reads the unparsed request body. Stripe signatures are computed over these exact bytes. */
export async function readRawBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}
