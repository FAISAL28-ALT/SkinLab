import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import authRouter from './auth.router.js';

env.NODE_ENV = 'production';
env.FRONTEND_URL = 'https://app.example.test';
env.JWT_ACCESS_SECRET = 'router-test-jwt-secret-012345678901234567890';
env.JWT_ISSUER = 'https://api.example.test';
env.JWT_AUDIENCE = 'skinlab-router-test';

const refreshHandler = authRouter.stack.find((layer) => layer.route?.path === '/refresh').route.stack.at(-1).handle;
const loginHandler = authRouter.stack.find((layer) => layer.route?.path === '/login').route.stack.at(-1).handle;
const originalTransaction = Object.getOwnPropertyDescriptor(prisma, '$transaction');
const originalRawQuery = Object.getOwnPropertyDescriptor(prisma, '$queryRaw');
const originalCredentialFind = Object.getOwnPropertyDescriptor(prisma.authCredential, 'findUnique');
const originalThrottleFind = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'findUnique');
const originalThrottleUpdate = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'update');
const originalAuditCreate = Object.getOwnPropertyDescriptor(prisma.authAuditEvent, 'create');
const originalProfileFindMany = Object.getOwnPropertyDescriptor(prisma.profile, 'findMany');

function response() {
    const result = { statusCode: 200, body: undefined, cookieOptions: undefined, cleared: false };
    return Object.assign(result, {
        setHeader() { return result; },
        status(code) { result.statusCode = code; return result; },
        json(body) { result.body = body; return result; },
        cookie(_name, _value, options) { result.cookieOptions = options; return result; },
        clearCookie() { result.cleared = true; return result; },
    });
}

function request(refreshToken) {
    return {
        headers: { cookie: `skinlab_refresh=${encodeURIComponent(refreshToken)}` },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
}

function loginRequest() {
    return {
        body: { userId: 'test-admin', password: 'wrong-password' },
        headers: {}, ip: '198.51.100.42', socket: { remoteAddress: '198.51.100.42' },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
}

function setTransaction(implementation) {
    Object.defineProperty(prisma, '$transaction', { configurable: true, value: implementation });
}

function restore() {
    if (originalTransaction) Object.defineProperty(prisma, '$transaction', originalTransaction);
    if (originalRawQuery) Object.defineProperty(prisma, '$queryRaw', originalRawQuery);
    if (originalCredentialFind) Object.defineProperty(prisma.authCredential, 'findUnique', originalCredentialFind);
    if (originalThrottleFind) Object.defineProperty(prisma.authLoginThrottle, 'findUnique', originalThrottleFind);
    if (originalThrottleUpdate) Object.defineProperty(prisma.authLoginThrottle, 'update', originalThrottleUpdate);
    if (originalAuditCreate) Object.defineProperty(prisma.authAuditEvent, 'create', originalAuditCreate);
    if (originalProfileFindMany) Object.defineProperty(prisma.profile, 'findMany', originalProfileFindMany);
}

test('refresh rotates tokens without extending the absolute session expiry and uses production cookie flags', async (t) => {
    t.after(restore);
    const expiresAt = new Date(Date.now() + 47 * 60 * 60 * 1000);
    let persistedExpiry;
    setTransaction(async (callback) => callback({
        authSession: {
            findUnique: async () => ({ id: 'session-1', userId: 'user-1', expiresAt, revokedAt: null }),
            updateMany: async (_args) => ({ count: 1 }),
        },
        authRefreshTokenHistory: { findUnique: async () => null, create: async () => ({}) },
        profile: { findUnique: async () => ({ id: 'user-1', isActive: true, role: 'SHOP_ADMIN', shopId: 'shop-1', shop: { id: 'shop-1', isActive: true } }) },
    }));
    const res = response();
    await refreshHandler(request('old-token'), res);
    persistedExpiry = res.cookieOptions.expires;
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.expires_in, 900);
    assert.equal(persistedExpiry.getTime(), expiresAt.getTime());
    assert.equal(res.cookieOptions.httpOnly, true);
    assert.equal(res.cookieOptions.secure, true);
    assert.equal(res.cookieOptions.sameSite, 'lax');
});

test('refresh-token reuse revokes the remembered session', async (t) => {
    t.after(restore);
    let revoked = false;
    setTransaction(async (callback) => callback({
        authSession: {
            findUnique: async () => null,
            updateMany: async () => { revoked = true; return { count: 1 }; },
        },
        authRefreshTokenHistory: { findUnique: async () => ({ sessionId: 'session-1' }) },
    }));
    const res = response();
    await refreshHandler(request('reused-token'), res);
    assert.equal(res.statusCode, 401);
    assert.equal(revoked, true);
    assert.equal(res.cleared, true);
});

test('five failed logins trigger a one-hour lockout and an expired lockout permits another attempt', async (t) => {
    t.after(restore);
    env.AUTH_IP_HASH_SECRET = 'router-test-ip-secret-012345678901234567890123';
    let rawCalls = 0;
    let lockedUntil = null;
    Object.defineProperty(prisma.authCredential, 'findUnique', { configurable: true, value: async () => null });
    Object.defineProperty(prisma.profile, 'findMany', { configurable: true, value: async () => [] });
    Object.defineProperty(prisma.authLoginThrottle, 'findUnique', { configurable: true, value: async () => lockedUntil ? { lockedUntil } : null });
    Object.defineProperty(prisma.authLoginThrottle, 'update', { configurable: true, value: async ({ data }) => { lockedUntil = data.lockedUntil; return {}; } });
    Object.defineProperty(prisma.authAuditEvent, 'create', { configurable: true, value: async () => ({}) });
    Object.defineProperty(prisma, '$queryRaw', { configurable: true, value: async () => [{ failures: Math.ceil(++rawCalls / 2), locked_until: null }] });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
        const res = response();
        await loginHandler(loginRequest(), res, () => assert.fail('login handler should not call next'));
        assert.equal(res.statusCode, 401);
    }
    const blocked = response();
    await loginHandler(loginRequest(), blocked, () => assert.fail('fifth failure must lock the request'));
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.body.error.retryAfter, 3600);
    assert.ok(lockedUntil instanceof Date);
    lockedUntil = new Date(Date.now() - 1);
    rawCalls = 0;
    const afterExpiry = response();
    await loginHandler(loginRequest(), afterExpiry, () => assert.fail('expired lockout must permit a new credential check'));
    assert.equal(afterExpiry.statusCode, 401);
});
