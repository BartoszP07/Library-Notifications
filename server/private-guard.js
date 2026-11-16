const crypto = require('crypto');

function isAuthenticationEnabled(value) {
    if (value === undefined || value === '' || value === 'false') return false;
    if (value === 'true') return true;
    throw new Error('LIBRARY_AUTH_ENABLED must be true or false.');
}

function makePrivateGuard(password, enabled = true) {
    if (enabled && (!password || Buffer.byteLength(password, 'utf8') < 24 || /[\r\n]/.test(password))) {
        throw new Error('Set LIBRARY_ADMIN_PASSWORD to a unique random value of at least 24 bytes.');
    }
    const expected = enabled ? crypto.createHash('sha256').update(`admin:${password}`).digest() : null;
    return (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(req.get('Authorization') || '');
        const supplied = match ? Buffer.from(match[1], 'base64') : Buffer.alloc(0);
        const digest = crypto.createHash('sha256').update(supplied).digest();
        if (enabled && (!match || !crypto.timingSafeEqual(expected, digest))) {
            res.set('WWW-Authenticate', 'Basic realm="Library administration", charset="UTF-8"');
            return res.status(401).send('Authentication required');
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            const origin = req.get('Origin');
            const host = req.get('Host');
            const fetchSite = req.get('Sec-Fetch-Site');
            if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return res.sendStatus(403);
            if (origin) {
                try {
                    const parsed = new URL(origin);
                    if (!host || parsed.host !== host || !['http:', 'https:'].includes(parsed.protocol)) return res.sendStatus(403);
                } catch { return res.sendStatus(403); }
            } else if (fetchSite && fetchSite !== 'none') {
                return res.sendStatus(403);
            }
        }
        next();
    };
}
module.exports = { makePrivateGuard, isAuthenticationEnabled };
