import test from 'node:test';
import assert from 'node:assert/strict';
import { requireCatalogEditorScope, requireShopOwnerScope } from '../../middleware/tenant.middleware.js';
import { requireShopAdmin } from '../../middleware/role.middleware.js';

function mockRes() {
    const res = {
        statusCode: 200,
        body: undefined,
        headers: {},
        setHeader(name, value) {
            res.headers[name] = value;
            return res;
        },
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(data) {
            res.body = data;
            return res;
        },
    };
    return res;
}

function mockReq(user, extra = {}) {
    return {
        user,
        headers: {},
        body: {},
        method: 'GET',
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        ...extra,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SHOP_ADMIN FULL CAPABILITIES (DESIGN CRUD + SHOP + TAXONOMY)
// ─────────────────────────────────────────────────────────────────────────────

test('SHOP_ADMIN can manage designs (Create, Read, Edit, Delete, Images)', async () => {
    const req = mockReq({
        id: 'shop-admin-1',
        role: 'SHOP_ADMIN',
        shopId: 'shop-official-1',
    });
    const res = mockRes();
    let nextCalled = false;

    await requireCatalogEditorScope(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true, 'SHOP_ADMIN must pass requireCatalogEditorScope');
    assert.equal(res.statusCode, 200);
    assert.equal(req.shopId, 'shop-official-1');
});

test('SHOP_ADMIN can access GET /api/categories/admin/active for design creation', async () => {
    const req = mockReq({
        id: 'shop-admin-1',
        role: 'SHOP_ADMIN',
        shopId: 'shop-official-1',
    });
    const res = mockRes();
    let nextCalled = false;

    await requireCatalogEditorScope(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true, 'SHOP_ADMIN must be able to load active categories');
});

test('SHOP_ADMIN can manage shop settings and categories via requireShopOwnerScope', async () => {
    const req = mockReq(
        {
            id: 'shop-admin-1',
            role: 'SHOP_ADMIN',
            shopId: 'shop-official-1',
        },
        { method: 'PATCH' }
    );
    const res = mockRes();
    let nextCalled = false;

    await requireShopOwnerScope(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true, 'SHOP_ADMIN must pass requireShopOwnerScope');
    assert.equal(res.statusCode, 200);
    assert.equal(req.shopId, 'shop-official-1');
});

test('SHOP_ADMIN passes requireShopAdmin role middleware', async () => {
    const req = mockReq({
        id: 'shop-admin-1',
        role: 'SHOP_ADMIN',
    });
    const res = mockRes();
    let nextCalled = false;

    requireShopAdmin(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true, 'SHOP_ADMIN must pass requireShopAdmin');
    assert.equal(res.statusCode, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. RETIRED PLATFORM_ADMIN IS STRICTLY BLOCKED FROM ALL ADMIN PRIVILEGES
// ─────────────────────────────────────────────────────────────────────────────

test('Retired PLATFORM_ADMIN role is BLOCKED from catalogue editing', async () => {
    const req = mockReq({
        id: 'plat-admin-1',
        role: 'PLATFORM_ADMIN',
        shopId: 'shop-official-1',
    });
    const res = mockRes();
    let nextCalled = false;

    await requireCatalogEditorScope(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false, 'PLATFORM_ADMIN must NOT pass requireCatalogEditorScope');
    assert.equal(res.statusCode, 403);
});

test('Retired PLATFORM_ADMIN role is BLOCKED from shop owner scope', async () => {
    const req = mockReq({
        id: 'plat-admin-1',
        role: 'PLATFORM_ADMIN',
        shopId: 'shop-official-1',
    });
    const res = mockRes();
    let nextCalled = false;

    await requireShopOwnerScope(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false, 'PLATFORM_ADMIN must NOT pass requireShopOwnerScope');
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('Retired PLATFORM_ADMIN role is BLOCKED from requireShopAdmin middleware', async () => {
    const req = mockReq({
        id: 'plat-admin-1',
        role: 'PLATFORM_ADMIN',
    });
    const res = mockRes();
    let nextCalled = false;

    requireShopAdmin(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false, 'PLATFORM_ADMIN must NOT pass requireShopAdmin');
    assert.equal(res.statusCode, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. USER (CUSTOMER) RESTRICTIONS REMAIN INTACT (NO REGRESSION)
// ─────────────────────────────────────────────────────────────────────────────

test('USER is BLOCKED from Design CRUD and Shop/Category administration', async () => {
    const user = { id: 'cust-1', role: 'USER' };

    const req1 = mockReq(user);
    const res1 = mockRes();
    let next1 = false;
    await requireCatalogEditorScope(req1, res1, () => { next1 = true; });
    assert.equal(next1, false, 'USER must be blocked from catalog editing');
    assert.equal(res1.statusCode, 403);

    const req2 = mockReq(user);
    const res2 = mockRes();
    let next2 = false;
    await requireShopOwnerScope(req2, res2, () => { next2 = true; });
    assert.equal(next2, false, 'USER must be blocked from shop owner scope');
    assert.equal(res2.statusCode, 403);

    const req3 = mockReq(user);
    const res3 = mockRes();
    let next3 = false;
    requireShopAdmin(req3, res3, () => { next3 = true; });
    assert.equal(next3, false, 'USER must be blocked from requireShopAdmin');
    assert.equal(res3.statusCode, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. UNAUTHENTICATED CALLS ARE REJECTED
// ─────────────────────────────────────────────────────────────────────────────

test('Unauthenticated calls are rejected with 401 or 403 on all protected guards', async () => {
    const req1 = mockReq(null);
    const res1 = mockRes();
    let next1 = false;
    await requireCatalogEditorScope(req1, res1, () => { next1 = true; });
    assert.equal(next1, false);
    assert.equal(res1.statusCode, 403);

    const req2 = mockReq(null);
    const res2 = mockRes();
    let next2 = false;
    await requireShopOwnerScope(req2, res2, () => { next2 = true; });
    assert.equal(next2, false);
    assert.equal(res2.statusCode, 401);

    const req3 = mockReq(null);
    const res3 = mockRes();
    let next3 = false;
    requireShopAdmin(req3, res3, () => { next3 = true; });
    assert.equal(next3, false);
    assert.equal(res3.statusCode, 401);
});
