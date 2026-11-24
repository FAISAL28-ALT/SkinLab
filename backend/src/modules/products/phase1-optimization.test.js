import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadProductImages, ProductImageError } from '../../services/product-image.js';
import { invalidateAuthCache } from '../../middleware/auth.middleware.js';
import { apiCache } from '../../utils/cache.js';

const productId = '11111111-1111-4111-8111-111111111111';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL3RQAAAABJRU5ErkJggg==', 'base64');
function file(name = 'design.png') { return { buffer: png, mimetype: 'image/png', originalname: name }; }

function mockStorage({ failIndex = -1 } = {}) {
    const uploaded = [];
    const deleted = [];
    return {
        uploaded,
        deleted,
        async uploadObject({ prefix }) {
            const index = uploaded.length;
            if (failIndex === index) {
                throw new Error('Simulated R2 network failure');
            }
            const key = `${prefix}/generated-${index}.png`;
            uploaded.push(key);
            return { key, url: `https://cdn.skinlab.test/${key}` };
        },
        async deleteObject(key) {
            deleted.push(key);
        },
    };
}

function mockDatabase() {
    const images = [];
    const db = {
        product: {
            async findFirst() { return { id: productId, _count: { images: images.length } }; },
        },
        productImage: {
            async count() { return images.length; },
            async create({ data }) {
                const img = { id: `img-${images.length}`, ...data };
                images.push(img);
                return img;
            },
            async createManyAndReturn({ data }) {
                const created = data.map((d, i) => ({ id: `img-${images.length + i}`, ...d }));
                images.push(...created);
                return created;
            },
        },
        async $queryRaw() { return [{ id: productId }]; },
        async $transaction(callback) { return callback(db); },
    };
    return { db, images };
}

test('Phase 1: uploadProductImages supports parallel upload and custom primaryIndex', async () => {
    const { db, images } = mockDatabase();
    const r2 = mockStorage();

    const result = await uploadProductImages({
        prisma: db,
        storage: r2,
        shopId: 'shop-test',
        productId,
        files: [file('one.png'), file('two.png'), file('three.png')],
        primaryIndex: 1, // Second image is designated primary
    });

    assert.equal(result.length, 3);
    assert.equal(r2.uploaded.length, 3);
    // Index 1 must be primary, index 0 and 2 must not
    assert.equal(result[0].isPrimary, false);
    assert.equal(result[1].isPrimary, true);
    assert.equal(result[2].isPrimary, false);
    assert.equal(result[0].sortOrder, 0);
    assert.equal(result[1].sortOrder, 1);
    assert.equal(result[2].sortOrder, 2);
});

test('Phase 1: uploadProductImages cleans up fulfilled uploads on partial failure', async () => {
    const { db } = mockDatabase();
    const r2 = mockStorage({ failIndex: 2 }); // Third upload fails

    await assert.rejects(
        uploadProductImages({
            prisma: db,
            storage: r2,
            shopId: 'shop-test',
            productId,
            files: [file('one.png'), file('two.png'), file('three.png')],
        }),
        /Simulated R2 network failure/
    );

    // Any files uploaded before failure must be deleted
    assert.equal(r2.uploaded.length, 2);
    assert.deepEqual(r2.deleted, r2.uploaded);
});

test('Phase 1: invalidateAuthCache purges cached auth sessions correctly', () => {
    const sessionId = 'session-test-uuid';
    const userId = 'user-test-uuid';
    const cacheKey = `auth:session:${sessionId}:${userId}`;

    apiCache.set(cacheKey, { user: { id: userId }, shopId: 'shop-1' }, 15_000, 'auth');
    assert.ok(apiCache.get(cacheKey));

    invalidateAuthCache(sessionId, userId);
    assert.equal(apiCache.get(cacheKey), null);
});
