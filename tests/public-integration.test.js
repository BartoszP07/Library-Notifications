const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const password = 'a sufficiently long test password';
for (const enabled of [true, false]) test(`public service reads upstream with authentication ${enabled ? 'enabled' : 'disabled'} and rejects private actions`, async () => {
    const expected = 'Basic ' + Buffer.from(`admin:${password}`).toString('base64');
    const upstream = http.createServer((req, res) => {
        if ((enabled && req.headers.authorization !== expected) || (!enabled && req.headers.authorization)) { res.writeHead(401).end(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: { value: 42 } }));
    });
    upstream.listen(0, '127.0.0.1');
    await once(upstream, 'listening');
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const child = spawn(process.execPath, ['public-app/server.js'], { env: { ...process.env, PUBLIC_PORT: String(port), PRIVATE_PORT: String(upstream.address().port), LIBRARY_ADMIN_PASSWORD: password, LIBRARY_AUTH_ENABLED: String(enabled) }, stdio: ['ignore','pipe','pipe'] });
    try {
        await Promise.race([new Promise(resolve => { child.stdout.on('data', chunk => { if (chunk.toString().includes('Public dashboard listening')) resolve(); }); }), once(child, 'exit').then(() => { throw new Error('Public service exited'); })]);
        let response;
        for (let i = 0; i < 40; i++) {
            response = await fetch(`http://127.0.0.1:${port}/api/get-spaces`);
            if (response.status === 200) break;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.value, 42);
        assert.equal((await fetch(`http://127.0.0.1:${port}/api/send-telegram-noti`, {method:'POST'})).status, 404);
        assert.equal((await fetch(`http://127.0.0.1:${port}/api/get-updated-spaces`, {method:'POST'})).status, 404);
    } finally { child.kill(); await new Promise(resolve => upstream.close(resolve)); }
});
