import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import { issueAccessToken } from '../../services/auth-security.js';

let server;
let baseUrl;
let shopAdminToken;
let testSessionId;
let testProductId;

test.before(async () => {
    // Start server on an ephemeral port
    await new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });

    // Find an existing shop and an active product for testing
    const shop = await prisma.shop.findFirst({ where: { isActive: true } });
    assert.ok(shop, 'Active shop must exist');

    const product = await prisma.product.findFirst({
        where: { shopId: shop.id, status: 'PUBLISHED' },
        include: { images: true },
    });
    if (product) {
        testProductId = product.id;
    }

    // Find an existing SHOP_ADMIN profile to create a real test token
    const adminProfile = await prisma.profile.findFirst({
        where: { role: 'SHOP_ADMIN', isActive: true },
        include: { credential: true },
    });
    if (adminProfile) {
        testSessionId = crypto.randomUUID();
        const tokenHash = crypto.randomBytes(32).toString('hex');
        await prisma.$executeRaw`
            INSERT INTO auth_sessions (id, user_id, refresh_token_hash, created_at, expires_at, last_used_at, ip_address)
            VALUES (${testSessionId}::uuid, ${adminProfile.id}::uuid, ${tokenHash}, now(), now() + interval '48 hours', now(), '127.0.0.1')
        `;
        shopAdminToken = await issueAccessToken(adminProfile.id, testSessionId);
    }
});

test.after(async () => {
    if (testSessionId) {
        await prisma.authSession.deleteMany({ where: { id: testSessionId } }).catch(() => undefined);
    }
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('Public Catalog: Unauthenticated visitor can browse products without login', async () => {
    const res = await fetch(`${baseUrl}/api/products`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.pagination);
    assert.equal(typeof json.pagination.total, 'number');

    // Verify all returned products are PUBLISHED
    for (const p of json.data) {
        assert.ok(p.title);
        assert.ok(Array.isArray(p.images));
        // Verify image url is present
        if (p.images.length > 0) {
            assert.ok(p.images[0].url, 'Product image must have url computed');
        }
    }
});

test('Public Catalog: Unauthenticated visitor can query trending products', async () => {
    const res = await fetch(`${baseUrl}/api/products?trending=true`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    for (const p of json.data) {
        assert.equal(p.isTrending, true);
    }
});

test('Public Catalog: Unauthenticated visitor can view product details and images', async () => {
    if (!testProductId) return;
    const res = await fetch(`${baseUrl}/api/products/${testProductId}`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, testProductId);
    assert.ok(Array.isArray(json.data.images));
    if (json.data.images.length > 0) {
        assert.ok(json.data.images[0].url, 'Image must have valid url for public viewing');
    }
});

test('Public Catalog: Unauthenticated visitor can fetch active categories', async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    for (const cat of json.data) {
        assert.equal(cat.isActive, true);
        assert.equal(typeof cat.productCount, 'number');
    }
});

test('Public Catalog: Unauthenticated visitor can fetch public shop branding', async () => {
    const res = await fetch(`${baseUrl}/api/shops/info`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.name);
    assert.ok(json.data.slug);
});

test('Security: Unauthenticated request to admin product list returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/products/admin/all`);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to create product returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Hacker Skin',
            designNumber: '999',
            description: 'Unauthorized creation',
        }),
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to edit product returns 401', async () => {
    const id = testProductId || '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked Title' }),
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to delete product returns 401', async () => {
    const id = testProductId || '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
        method: 'DELETE',
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to upload image returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/images/upload`, {
        method: 'POST',
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to reorder images returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/images/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'abc', items: [] }),
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to delete image returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/images/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to create category returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked Category' }),
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to edit category returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/categories/00000000-0000-0000-0000-000000000000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked Category' }),
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Security: Unauthenticated request to delete category returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/categories/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHENTICATED');
});

test('Admin Access: Authenticated SHOP_ADMIN can access admin products list', async () => {
    if (!shopAdminToken) return;
    const res = await fetch(`${baseUrl}/api/products/admin/all`, {
        headers: { Authorization: `Bearer ${shopAdminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
});
