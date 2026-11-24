import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { issueAccessToken } from '../services/auth-security.js';
import { requireAuth } from './auth.middleware.js';
import { requireAdminTenantScope, requireCatalogEditorScope } from './tenant.middleware.js';
env.JWT_ACCESS_SECRET = 'test-secret-'.padEnd(48, 'x');
env.JWT_ISSUER = 'skinlab-test';
env.JWT_AUDIENCE = 'skinlab-tests';
const originalSessionFind = Object.getOwnPropertyDescriptor(prisma.authSession, 'findFirst');
const originalProfileFind = Object.getOwnPropertyDescriptor(prisma.profile, 'findUnique');
const originalShopFind = Object.getOwnPropertyDescriptor(prisma.shop, 'findUnique');
function response() {
    const result = { statusCode: 200, body: undefined, headers: {} };
    return Object.assign(result, {
        setHeader(name, value) { result.headers[name] = value; return result; },
        status(code) { result.statusCode = code; return result; },
        json(body) { result.body = body; return result; },
    });
}
function request(token, originalUrl = '/api/products') {
    return { headers: token ? { authorization: `Bearer ${token}` } : {}, body: {}, method: 'GET', originalUrl, url: originalUrl, ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } };
}
function setDb(session, profile) {
    Object.defineProperty(prisma.authSession, 'findFirst', { configurable: true, value: async () => session });
    Object.defineProperty(prisma.profile, 'findUnique', { configurable: true, value: async () => profile });
}
function restore() {
    if (originalSessionFind)
        Object.defineProperty(prisma.authSession, 'findFirst', originalSessionFind);
    if (originalProfileFind)
        Object.defineProperty(prisma.profile, 'findUnique', originalProfileFind);
    if (originalShopFind)
        Object.defineProperty(prisma.shop, 'findUnique', originalShopFind);
}
test('requires a signed bearer token and an active database session', async (t) => {
    t.after(restore);
    const res = response();
    let nextCalled = false;
    await requireAuth(request(), res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    const forged = response();
    await requireAuth(request('not.a.jwt'), forged, () => assert.fail('forged token must fail'));
    assert.equal(forged.statusCode, 401);
});
test('loads role and shop from the database after validating JWT and session', async (t) => {
    t.after(restore);
    const token = await issueAccessToken('profile-1', 'session-1');
    setDb({ id: 'session-1' }, {
        id: 'profile-1', email: 'owner@example.test', fullName: 'Owner', role: 'SHOP_ADMIN', shopId: 'shop-1', isActive: true,
        credential: { loginId: 'owner-id' }, shop: { id: 'shop-1', name: 'Shop', slug: 'shop', logoUrl: null, isActive: true },
    });
    const req = request(token);
    req.body = { role: 'ATTACKER', shopId: 'attacker' };
    let nextCalled = false;
    await requireAuth(req, response(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user?.role, 'SHOP_ADMIN');
    assert.equal(req.user?.userId, 'owner-id');
    assert.equal(req.user?.shopId, 'shop-1');
});
test('rejects a revoked or expired database session', async (t) => {
    t.after(restore);
    const token = await issueAccessToken('profile-1', 'session-1');
    setDb(null, null);
    const res = response();
    await requireAuth(request(token), res, () => assert.fail('revoked session must fail'));
    assert.equal(res.statusCode, 401);
});
test('enforces mandatory password changes on backend APIs', async (t) => {
    t.after(restore);
    const token = await issueAccessToken('profile-1', 'session-1');
    setDb({ id: 'session-1' }, {
        id: 'profile-1', email: 'admin@example.test', fullName: 'Admin', role: 'SHOP_ADMIN', shopId: 'shop-1', isActive: true,
        credential: { loginId: 'admin@example.test', mustChangePassword: true }, shop: { id: 'shop-1', isActive: true },
    });
    const protectedResponse = response();
    await requireAuth(request(token, '/api/products/admin/all'), protectedResponse, () => assert.fail('password-change flag must block protected APIs'));
    assert.equal(protectedResponse.statusCode, 403);
    assert.equal(protectedResponse.body.error.code, 'PASSWORD_CHANGE_REQUIRED');
    let meAllowed = false;
    await requireAuth(request(token, '/api/auth/me'), response(), () => { meAllowed = true; });
    assert.equal(meAllowed, true);
});
test('shop scope comes only from the authenticated profile', async () => {
    const req = request();
    req.user = { id: 'u1', userId: 'owner', email: 'owner@example.test', fullName: null, role: 'SHOP_ADMIN', shopId: 'trusted-shop', shop: null };
    req.body = { shopId: 'attacker-shop' };
    await requireAdminTenantScope(req, response(), () => undefined);
    assert.equal(req.shopId, 'trusted-shop');
});
test('catalog editing rejects roles outside shop administration', async () => {
    const req = request();
    req.user = { id: 'user-1', role: 'CUSTOMER' };
    const res = response();
    await requireCatalogEditorScope(req, res, () => assert.fail('unauthorized role must not continue'));
    assert.equal(res.statusCode, 403);
});
//# sourceMappingURL=auth.middleware.test.js.map
