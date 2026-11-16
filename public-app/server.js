const express = require('express');
const path = require('path');
const { randomBytes } = require('crypto');
const { isAuthenticationEnabled } = require('../server/private-guard');

require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

const app = express();
const authEnabled = isAuthenticationEnabled(process.env.LIBRARY_AUTH_ENABLED);
const password = process.env.LIBRARY_ADMIN_PASSWORD;

if (authEnabled && (
    !password ||
    Buffer.byteLength(password, 'utf8') < 24 ||
    /[\r\n]/.test(password)
)) {
    throw new Error('Set LIBRARY_ADMIN_PASSWORD to the same value as the private service.');
}

const headers = authEnabled
    ? { Authorization: 'Basic ' + Buffer.from(`admin:${password}`).toString('base64') }
    : {};

const port = Number(process.env.PUBLIC_PORT || 3002);
const privatePort = process.env.PRIVATE_PORT || process.env.SERVER_PORT || '3001';
const upstream = 'http://127.0.0.1:' + privatePort;
const cache = new Map();
const routes = ['/api/get-spaces', '/api/forecast'];

app.disable('x-powered-by');

app.use((req, res, next) => {
    const scriptNonce = randomBytes(18).toString('base64');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    res.set(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'nonce-${scriptNonce}'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'self' 'unsafe-inline'`
    );

    next();
});

async function refresh() {
    await Promise.all(routes.map(async (route) => {
        try {
            const response = await fetch(upstream + route, {
                signal: AbortSignal.timeout(5000),
                redirect: 'error',
                headers
            });

            if (!response.ok) {
                throw new Error('Upstream unavailable');
            }

            const data = await response.json();
            cache.set(route, { data, updated: Date.now() });
        } catch (error) {
            console.error(`Failed to refresh ${route}: ${error.message}`);
        }
    }));
}

for (const route of routes) {
    app.get(route, (req, res) => {
        const entry = cache.get(route);
        const cacheExpired = entry && Date.now() - entry.updated > 30 * 60 * 1000;

        if (!entry || cacheExpired) {
            return res.status(503).json({ error: 'Data temporarily unavailable' });
        }

        res.set('Cache-Control', 'public, max-age=30');
        res.json(entry.data);
    });
}

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.get('/favicon.ico', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.redirect('/favicon.svg');
});

app.use(express.static(path.join(__dirname, 'client'), {
    dotfiles: 'deny',
    index: 'index.html',
    etag: false,
    lastModified: false,
    setHeaders: res => {
        // Frontend releases and per-response CSP nonces must never be stale.
        res.set('Cache-Control', 'no-store');
    }
}));

app.listen(port, () => {
    console.log(`Public dashboard listening on port ${port}`);
});

refresh();
setInterval(refresh, 60 * 1000);
