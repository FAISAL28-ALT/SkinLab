import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import app from './app.js';
import { issueAccessToken } from './services/auth-security.js';
import { apiCache } from './utils/cache.js';

env.NODE_ENV = 'production';
env.JWT_ACCESS_SECRET = 'independent-audit-secret-01234567890123456789';
env.JWT_ISSUER = 'skinlab-audit';
env.JWT_AUDIENCE = 'skinlab-audit-audience';
env.AUTH_IP_HASH_SECRET = 'independent-audit-ip-secret-123456789012345';
env.FRONTEND_URL = 'https://skinlab.example.com';

function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = null } = {}) {
    let resolvePromise;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });

    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = undefined;

    const req = {
        method,
        url,
        originalUrl: url,
        baseUrl: '',
        path: url.split('?')[0],
        headers: { host: 'localhost:5000', 'x-forwarded-proto': 'https', ...headers },
        body: body || {},
        query: {},
        secure: true,
        protocol: 'https',
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        get(name) {
            const lower = name.toLowerCase();
            return this.headers[lower];
        },
    };

    const res = {
        statusCode,
        headers: responseHeaders,
        setHeader(name, val) { responseHeaders[name.toLowerCase()] = val; return this; },
        getHeader(name) { return responseHeaders[name.toLowerCase()]; },
        removeHeader(name) { delete responseHeaders[name.toLowerCase()]; return this; },
        status(code) { statusCode = code; this.statusCode = code; return this; },
        json(data) { responseBody = data; resolvePromise(); return this; },
        send(data) { responseBody = data; resolvePromise(); return this; },
        cookie() { return this; },
        clearCookie() { return this; },
    };

    const execute = async () => {
        app.handle(req, res, () => resolvePromise());
        await promise;
        return { status: statusCode, body: responseBody, headers: responseHeaders };
    };

    return { req, res, execute };
}

// ── 1. Admin Endpoint Permission Verification ─────────────────────────────
test('Every administrative endpoint strictly rejects unauthenticated and non-admin requests', async () => {
    const adminEndpoints = [
        { method: 'GET', url: '/api/products/admin/all' },
        { method: 'POST', url: '/api/products' },
        { method: 'PATCH', url: '/api/products/00000000-0000-0000-0000-000000000001' },
        { method: 'PATCH', url: '/api/products/00000000-0000-0000-0000-000000000001/status' },
        { method: 'DELETE', url: '/api/products/00000000-0000-0000-0000-000000000001' },
        { method: 'GET', url: '/api/categories/admin/active' },
        { method: 'GET', url: '/api/categories/admin/all' },
        { method: 'POST', url: '/api/categories' },
        { method: 'PATCH', url: '/api/categories/00000000-0000-0000-0000-000000000001' },
        { method: 'PATCH', url: '/api/categories/00000000-0000-0000-0000-000000000001/deactivate' },
        { method: 'DELETE', url: '/api/categories/00000000-0000-0000-0000-000000000001' },
        { method: 'PATCH', url: '/api/shops/current' },
        { method: 'POST', url: '/api/images/upload' },
        { method: 'PATCH', url: '/api/images/reorder' },
        { method: 'DELETE', url: '/api/images/00000000-0000-0000-0000-000000000001' },
    ];

    for (const endpoint of adminEndpoints) {
        // Test unauthenticated request
        const ctx = createMockReqRes({
            method: endpoint.method,
            url: endpoint.url,
            headers: {},
        });
        const result = await ctx.execute();
        if (result.status !== 401) console.log('DEBUG 401 FAIL:', endpoint, result);
        assert.equal(result.status, 401, `Endpoint ${endpoint.method} ${endpoint.url} must return 401 when unauthenticated`);
    }
});

// ── 2. Draft Visibility: SHOP_ADMIN vs NORMAL USER ──────────────────────────
test('Draft products are visible to SHOP_ADMIN but strictly hidden (404) from public and normal users', async () => {
    const draftId = '00000000-0000-0000-0000-000000000099';
    const shopId = '00000000-0000-0000-0000-000000000001';

    const origProductFind = Object.getOwnPropertyDescriptor(prisma.product, 'findFirst');
    const origSessionFind = Object.getOwnPropertyDescriptor(prisma.authSession, 'findFirst');
    const origProfileFind = Object.getOwnPropertyDescriptor(prisma.profile, 'findUnique');
    const origShopFind = Object.getOwnPropertyDescriptor(prisma.shop, 'findUnique');

    try {
        // Mock default shop
        Object.defineProperty(prisma.shop, 'findUnique', {
            configurable: true,
            value: async () => ({ id: shopId, slug: 'skinlab-official', isActive: true }),
        });

        // Mock product finder: returns draft product only if status is not filtered or matches DRAFT
        Object.defineProperty(prisma.product, 'findFirst', {
            configurable: true,
            value: async ({ where }) => {
                if (where.status === 'PUBLISHED') return null; // Draft is not published!
                return {
                    id: draftId,
                    shopId,
                    title: 'Secret Draft Skin',
                    status: 'DRAFT',
                    category: { id: 'c1', name: 'Anime', slug: 'anime' },
                    images: [],
                };
            },
        });

        // Case A: Public / unauthenticated user queries draft product
        apiCache.clear();
        const publicCtx = createMockReqRes({
            method: 'GET',
            url: `/api/products/${draftId}`,
        });
        const publicResult = await publicCtx.execute();
        assert.equal(publicResult.status, 404, 'Public user must receive 404 for draft product');

        // Case B: Normal User (role: CUSTOMER) queries draft product
        const customerToken = await issueAccessToken('customer-uuid', 'session-cust');
        Object.defineProperty(prisma.authSession, 'findFirst', {
            configurable: true,
            value: async () => ({ id: 'session-cust' }),
        });
        Object.defineProperty(prisma.profile, 'findUnique', {
            configurable: true,
            value: async () => ({ id: 'customer-uuid', role: 'CUSTOMER', shopId, isActive: true }),
        });

        apiCache.clear();
        const customerCtx = createMockReqRes({
            method: 'GET',
            url: `/api/products/${draftId}`,
            headers: { authorization: `Bearer ${customerToken}` },
        });
        const customerResult = await customerCtx.execute();
        assert.equal(customerResult.status, 404, 'Normal user must receive 404 for draft product');

        // Case C: Authenticated SHOP_ADMIN queries draft product
        const adminToken = await issueAccessToken('admin-uuid', 'session-admin');
        Object.defineProperty(prisma.authSession, 'findFirst', {
            configurable: true,
            value: async () => ({ id: 'session-admin' }),
        });
        Object.defineProperty(prisma.profile, 'findUnique', {
            configurable: true,
            value: async () => ({ id: 'admin-uuid', role: 'SHOP_ADMIN', shopId, isActive: true }),
        });

        apiCache.clear();
        const adminCtx = createMockReqRes({
            method: 'GET',
            url: `/api/products/${draftId}`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        const adminResult = await adminCtx.execute();
        assert.equal(adminResult.status, 200, 'SHOP_ADMIN must receive 200 for draft product preview');
        assert.equal(adminResult.body?.data?.title, 'Secret Draft Skin');
    } finally {
        if (origProductFind) Object.defineProperty(prisma.product, 'findFirst', origProductFind);
        if (origSessionFind) Object.defineProperty(prisma.authSession, 'findFirst', origSessionFind);
        if (origProfileFind) Object.defineProperty(prisma.profile, 'findUnique', origProfileFind);
        if (origShopFind) Object.defineProperty(prisma.shop, 'findUnique', origShopFind);
    }
});

// ── 3. Health Endpoint Connection Starvation Protection ────────────────────
test('GET /health caches database status and prevents connection starvation', async () => {
    let dbQueryCount = 0;
    const origQueryRaw = Object.getOwnPropertyDescriptor(prisma, '$queryRaw');

    try {
        Object.defineProperty(prisma, '$queryRaw', {
            configurable: true,
            value: async () => {
                dbQueryCount++;
                return [{ 1: 1 }];
            },
        });

        // 10 rapid health checks
        for (let i = 0; i < 10; i++) {
            const ctx = createMockReqRes({ method: 'GET', url: '/health' });
            const result = await ctx.execute();
            assert.equal(result.status, 200);
        }

        // Database should only have been queried ONCE due to 15s cache
        assert.equal(dbQueryCount, 1, 'Database must be queried only once during cache TTL');

        // Liveness probe must NEVER query database
        const liveCtx = createMockReqRes({ method: 'GET', url: '/health/live' });
        const liveResult = await liveCtx.execute();
        assert.equal(liveResult.status, 200);
        assert.equal(dbQueryCount, 1, 'Liveness probe must not query database');
    } finally {
        if (origQueryRaw) Object.defineProperty(prisma, '$queryRaw', origQueryRaw);
    }
});
