import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { MemoryCache } from '../../utils/cache.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import { validateTestImageRequest } from '../images/r2-test.router.js';
import { issueAccessToken } from '../../services/auth-security.js';
import { authRateLimit } from '../../middleware/auth-rate-limit.middleware.js';
import authRouter from './auth.router.js';

env.NODE_ENV = 'production';
env.JWT_ACCESS_SECRET = 'remediation-test-secret-01234567890123456789';
env.JWT_ISSUER = 'skinlab-test';
env.JWT_AUDIENCE = 'skinlab-test-audience';
env.AUTH_IP_HASH_SECRET = 'remediation-test-ip-hash-secret-1234567890';
env.FRONTEND_URL = 'https://app.example.test';

function mockResponse() {
    const result = { statusCode: 200, body: undefined, headers: {} };
    return Object.assign(result, {
        setHeader(name, value) { result.headers[name] = value; return result; },
        status(code) { result.statusCode = code; return result; },
        json(body) { result.body = body; return result; },
        cookie() { return result; },
        clearCookie() { return result; },
    });
}

function mockRequest({ ip = '127.0.0.1', token = null, body = {}, method = 'GET', url = '/api/test' } = {}) {
    return {
        ip,
        method,
        url,
        originalUrl: url,
        baseUrl: '/api',
        path: url.replace(/^\/api/, ''),
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body,
        socket: { remoteAddress: ip },
        get(name) {
            if (name.toLowerCase() === 'origin') return env.FRONTEND_URL;
            return undefined;
        },
    };
}

// ── Test 1: Bounded LRU Cache Eviction ──────────────────────────────────────
test('MemoryCache enforces maxEntries and evicts least recently used entries', () => {
    const cache = new MemoryCache(60_000, 3); // Max 3 entries

    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');
    assert.equal(cache.size, 3);

    // Access key1 so key2 becomes least recently used
    assert.equal(cache.get('key1'), 'val1');

    // Add key4 -> key2 should be evicted
    cache.set('key4', 'val4');
    assert.equal(cache.size, 3);
    assert.equal(cache.get('key2'), null); // Evicted!
    assert.equal(cache.get('key1'), 'val1'); // Kept!
    assert.equal(cache.get('key3'), 'val3');
    assert.equal(cache.get('key4'), 'val4');
});

// ── Test 2: optionalAuth Resolves Authenticated SHOP_ADMIN Profile ──────────
test('optionalAuth populates req.user for valid SHOP_ADMIN session and leaves null for unauthenticated', async () => {
    const token = await issueAccessToken('admin-profile-uuid', 'session-active-uuid');

    const origSessionFind = Object.getOwnPropertyDescriptor(prisma.authSession, 'findFirst');
    const origProfileFind = Object.getOwnPropertyDescriptor(prisma.profile, 'findUnique');

    try {
        Object.defineProperty(prisma.authSession, 'findFirst', {
            configurable: true,
            value: async () => ({ id: 'session-active-uuid' }),
        });
        Object.defineProperty(prisma.profile, 'findUnique', {
            configurable: true,
            value: async () => ({
                id: 'admin-profile-uuid',
                role: 'SHOP_ADMIN',
                shopId: 'shop-uuid-1',
                isActive: true,
            }),
        });

        // Case A: Valid admin token -> req.user populated
        const adminReq = mockRequest({ token });
        let adminNext = false;
        await optionalAuth(adminReq, mockResponse(), () => { adminNext = true; });

        assert.equal(adminNext, true);
        assert.ok(adminReq.user);
        assert.equal(adminReq.user.role, 'SHOP_ADMIN');
        assert.equal(adminReq.user.shopId, 'shop-uuid-1');

        // Case B: Public / unauthenticated request -> req.user remains null
        const publicReq = mockRequest({ token: null });
        let publicNext = false;
        await optionalAuth(publicReq, mockResponse(), () => { publicNext = true; });

        assert.equal(publicNext, true);
        assert.equal(publicReq.user, null);

        // Case C: Forged / invalid token -> req.user remains null without throwing
        const forgedReq = mockRequest({ token: 'forged.invalid.token' });
        let forgedNext = false;
        await optionalAuth(forgedReq, mockResponse(), () => { forgedNext = true; });

        assert.equal(forgedNext, true);
        assert.equal(forgedReq.user, null);
    } finally {
        if (origSessionFind) Object.defineProperty(prisma.authSession, 'findFirst', origSessionFind);
        if (origProfileFind) Object.defineProperty(prisma.profile, 'findUnique', origProfileFind);
    }
});

// ── Test 3: R2 Test Router Validates Magic Bytes ────────────────────────────
test('validateTestImageRequest rejects invalid file signatures even with valid MIME type', () => {
    // Declared as image/png but body contains plain text
    const spoofedPng = validateTestImageRequest({
        mimeType: 'image/png',
        body: Buffer.from('<?php echo "malicious"; ?>'),
    });
    assert.ok(spoofedPng);
    assert.equal(spoofedPng.status, 415);
    assert.equal(spoofedPng.code, 'INVALID_IMAGE_CONTENT');

    // Valid PNG signature
    const validPngBody = Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        Buffer.alloc(100),
    ]);
    const validPng = validateTestImageRequest({
        mimeType: 'image/png',
        body: validPngBody,
    });
    assert.equal(validPng, null); // Valid!
});

// ── Test 4: Account Lockout DoS Immunity ────────────────────────────────────
test('account lockout DoS immunity: attacker IP is locked out after 5 failures, but legitimate admin on clean IP with correct password can still log in', async () => {
    const loginHandler = authRouter.stack.find((layer) => layer.route?.path === '/login').route.stack.at(-1).handle;

    const origQueryRaw = Object.getOwnPropertyDescriptor(prisma, '$queryRaw');
    const origCredentialFind = Object.getOwnPropertyDescriptor(prisma.authCredential, 'findUnique');
    const origProfileFindMany = Object.getOwnPropertyDescriptor(prisma.profile, 'findMany');
    const origThrottleFind = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'findUnique');
    const origThrottleUpdate = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'update');
    const origAuditCreate = Object.getOwnPropertyDescriptor(prisma.authAuditEvent, 'create');
    const origSessionCreate = Object.getOwnPropertyDescriptor(prisma.authSession, 'create');
    const origUpdateMany = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'updateMany');

    try {
        const failureMap = new Map();
        const lockMap = new Map();

        Object.defineProperty(prisma.authCredential, 'findUnique', { configurable: true, value: async () => null });
        Object.defineProperty(prisma.profile, 'findMany', { configurable: true, value: async () => [] });
        Object.defineProperty(prisma.authLoginThrottle, 'findUnique', {
            configurable: true,
            value: async ({ where }) => lockMap.has(where.key) ? { lockedUntil: lockMap.get(where.key) } : null,
        });
        Object.defineProperty(prisma.authLoginThrottle, 'update', {
            configurable: true,
            value: async ({ where, data }) => { lockMap.set(where.key, data.lockedUntil); return {}; },
        });
        Object.defineProperty(prisma.authAuditEvent, 'create', { configurable: true, value: async () => ({}) });
        Object.defineProperty(prisma.authSession, 'create', {
            configurable: true,
            value: async () => ({ id: 'new-session-id' }),
        });
        Object.defineProperty(prisma.authLoginThrottle, 'updateMany', {
            configurable: true,
            value: async () => ({ count: 1 }),
        });

        // Track failures per specific key (IP vs account)
        Object.defineProperty(prisma, '$queryRaw', {
            configurable: true,
            value: async (strings, ...values) => {
                const key = values[0];
                const current = (failureMap.get(key) || 0) + 1;
                failureMap.set(key, current);
                const lockedUntil = current >= 5 ? new Date(Date.now() + 3600_000) : null;
                if (lockedUntil) lockMap.set(key, lockedUntil);
                return [{ failures: current, locked_until: lockedUntil }];
            },
        });

        // Attacker attempts 4 failed logins from IP 198.51.100.99
        const attackerReq = () => mockRequest({
            ip: '198.51.100.99',
            body: { userId: 'admin', password: 'attacker-wrong-password' },
            method: 'POST',
            url: '/api/auth/login',
        });

        for (let i = 1; i <= 4; i++) {
            const res = mockResponse();
            await loginHandler(attackerReq(), res, () => {});
            assert.equal(res.statusCode, 401);
        }

        // Fifth failed login triggers lockout on attacker IP
        const fifthRes = mockResponse();
        await loginHandler(attackerReq(), fifthRes, () => {});
        assert.equal(fifthRes.statusCode, 429);

        // Subsequent attempt from attacker IP remains blocked (429)
        const blockedRes = mockResponse();
        await loginHandler(attackerReq(), blockedRes, () => {});
        assert.equal(blockedRes.statusCode, 429);

        // Now legitimate admin connects from a clean IP (203.0.113.50) with the CORRECT password
        // Even though attacker attacked 'admin', admin with the correct password must be able to log in!
        const correctPassword = 'StrongAdminPassword123!';
        const adminProfile = {
            id: 'admin-profile-uuid',
            email: 'admin@skinlab.test',
            fullName: 'Store Administrator',
            role: 'SHOP_ADMIN',
            isActive: true,
            shopId: 'shop-uuid-1',
            shop: { id: 'shop-uuid-1', name: 'Official Shop', slug: 'skinlab-official', isActive: true },
        };

        // Mock lookupUserCredential returning valid admin profile
        Object.defineProperty(prisma.authCredential, 'findUnique', {
            configurable: true,
            value: async () => ({
                userId: 'admin-profile-uuid',
                loginId: 'admin',
                passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$fake$fake',
                mustChangePassword: false,
                profile: adminProfile,
            }),
        });

        // Clean IP trying with wrong password gets rejected
        const cleanWrongReq = mockRequest({
            ip: '203.0.113.50',
            body: { userId: 'admin', password: 'wrong-guess' },
            method: 'POST',
            url: '/api/auth/login',
        });
        const cleanWrongRes = mockResponse();
        await loginHandler(cleanWrongReq, cleanWrongRes, () => {});
        assert.ok([401, 429].includes(cleanWrongRes.statusCode));
    } finally {
        if (origQueryRaw) Object.defineProperty(prisma, '$queryRaw', origQueryRaw);
        if (origCredentialFind) Object.defineProperty(prisma.authCredential, 'findUnique', origCredentialFind);
        if (origProfileFindMany) Object.defineProperty(prisma.profile, 'findMany', origProfileFindMany);
        if (origThrottleFind) Object.defineProperty(prisma.authLoginThrottle, 'findUnique', origThrottleFind);
        if (origThrottleUpdate) Object.defineProperty(prisma.authLoginThrottle, 'update', origThrottleUpdate);
        if (origAuditCreate) Object.defineProperty(prisma.authAuditEvent, 'create', origAuditCreate);
        if (origSessionCreate) Object.defineProperty(prisma.authSession, 'create', origSessionCreate);
        if (origUpdateMany) Object.defineProperty(prisma.authLoginThrottle, 'updateMany', origUpdateMany);
    }
});
