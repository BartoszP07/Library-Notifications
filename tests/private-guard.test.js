const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makePrivateGuard, isAuthenticationEnabled } = require('../server/private-guard');
const password = 'a sufficiently long test password';
const guard = makePrivateGuard(password);
function request({ auth, origin, site, method = 'POST', authentication = true } = {}) {
    const headers = { authorization: auth, origin, 'sec-fetch-site': site, host: 'localhost:3001' };
    const req = { method, get: name => headers[name.toLowerCase()] };
    const res = { statusCode: 200, set() { return this; }, status(n) { this.statusCode = n; return this; }, send() { return this; }, sendStatus(n) { this.statusCode = n; return this; } };
    let passed = false;
    (authentication ? guard : makePrivateGuard(undefined, false))(req, res, () => { passed = true; });
    return { status: res.statusCode, passed };
}
const valid = 'Basic ' + Buffer.from(`admin:${password}`).toString('base64');
test('configuration fails closed', () => { assert.throws(() => makePrivateGuard('short')); });
test('authentication is required', () => {
    assert.equal(request().status, 401);
    assert.equal(request({auth:'Basic ' + Buffer.from('admin:wrong').toString('base64')}).status, 401);
    assert.equal(request({auth:valid, method:'GET'}).passed, true);
});
test('cross-site state changes are rejected even with credentials', () => {
    assert.equal(request({auth:valid, origin:'https://evil.example', site:'cross-site'}).status, 403);
    assert.equal(request({auth:valid, origin:'null'}).status, 403);
    assert.equal(request({auth:valid, site:'same-site', origin:'http://localhost:3001'}).status, 403);
    assert.equal(request({auth:valid, origin:'http://localhost:3001', site:'same-origin'}).passed, true);
    assert.equal(request({auth:valid}).passed, true);
});

test('authentication is optional but cross-site protection remains active', () => {
    assert.equal(isAuthenticationEnabled(undefined), false);
    assert.equal(isAuthenticationEnabled('false'), false);
    assert.equal(isAuthenticationEnabled('true'), true);
    assert.throws(() => isAuthenticationEnabled('yes'));
    assert.equal(request({authentication:false, method:'GET'}).passed, true);
    assert.equal(request({authentication:false, origin:'https://evil.example', site:'cross-site'}).status, 403);
    assert.equal(request({authentication:false, origin:'http://localhost:3001', site:'same-origin'}).passed, true);
});
