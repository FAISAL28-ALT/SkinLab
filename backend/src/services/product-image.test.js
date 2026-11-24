import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteProductImage, deleteProductWithImages, MAX_PRODUCT_IMAGE_BYTES, ProductImageError, reorderProductImages, uploadProductImages } from './product-image.js';

const productId = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
const secondImageId = '33333333-3333-4333-8333-333333333333';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL3RQAAAABJRU5ErkJggg==', 'base64');

function file(name = 'design.png') { return { buffer: png, mimetype: 'image/png', originalname: name }; }
function storage({ failDelete = false } = {}) {
    const uploaded = []; const deleted = [];
    return {
        uploaded, deleted,
        async uploadObject() { const key = `products/${productId}/generated-${uploaded.length}.png`; uploaded.push(key); return { key }; },
        async deleteObject(key) { deleted.push(key); if (failDelete) throw new Error('unavailable'); },
    };
}
function database({ images = [], exists = true, failTransaction = false, conflictOnce = false } = {}) {
    const state = { images: images.map((image) => ({ ...image })), exists, cleanupTasks: [], deletedProduct: false };
    let transactionCalls = 0;
    const db = {
        state,
        product: {
            async findFirst() { return state.exists ? { id: productId, _count: { images: state.images.length } } : null; },
            async delete() { state.deletedProduct = true; state.images = []; },
        },
        productImage: {
            async count() { return state.images.length; },
            async create({ data }) { const image = { id: `created-${state.images.length}`, ...data }; state.images.push(image); return image; },
            async findMany() { return state.images.map((image) => ({ ...image })); },
            async updateMany({ data }) { state.images.forEach((image) => Object.assign(image, data)); },
            async update({ where, data }) { const image = state.images.find((item) => item.id === where.id); Object.assign(image, data); return image; },
            async findFirst({ where }) {
                const image = state.images.find((item) => item.id === where.id);
                return image ? { ...image, product: { images: state.images.filter((item) => item.id !== image.id).sort((a, b) => a.sortOrder - b.sortOrder) } } : null;
            },
            async delete({ where }) { state.images = state.images.filter((image) => image.id !== where.id); },
        },
        storageCleanupTask: {
            async upsert({ where, create }) { const existing = state.cleanupTasks.find((task) => task.objectKey === where.operation_objectKey.objectKey); if (existing) return existing; state.cleanupTasks.push({ id: `cleanup-${state.cleanupTasks.length}`, ...create }); return state.cleanupTasks.at(-1); },
        },
        async $queryRaw() { return state.exists ? [{ id: productId }] : []; },
        async $transaction(callback) { transactionCalls += 1; if (failTransaction) throw new Error('database unavailable'); if (conflictOnce && transactionCalls === 1) { const error = new Error('serialization conflict'); error.code = 'P2034'; throw error; } return callback(db); },
    };
    return db;
}

test('uploads one image, records dimensions, and automatically selects it as primary', async () => {
    const db = database(); const r2 = storage();
    const result = await uploadProductImages({ prisma: db, storage: r2, shopId: 'shop', productId, files: [file()] });
    assert.equal(result.length, 1);
    assert.equal(result[0].isPrimary, true);
    assert.equal(result[0].width, 1);
    assert.match(result[0].url, /products\/11111111-1111-4111-8111-111111111111\/generated-0.png$/);
});

test('uploads four images with stable gallery ordering and one primary', async () => {
    const db = database(); const r2 = storage();
    const result = await uploadProductImages({ prisma: db, storage: r2, shopId: 'shop', productId, files: [file(), file(), file(), file()] });
    assert.deepEqual(result.map((image) => image.sortOrder), [0, 1, 2, 3]);
    assert.equal(result.filter((image) => image.isPrimary).length, 1);
});

test('rejects a fifth image before uploading it', async () => {
    const db = database({ images: Array.from({ length: 4 }, (_, index) => ({ id: `existing-${index}`, sortOrder: index, isPrimary: index === 0 })) }); const r2 = storage();
    await assert.rejects(uploadProductImages({ prisma: db, storage: r2, shopId: 'shop', productId, files: [file()] }), (error) => error instanceof ProductImageError && error.code === 'IMAGE_LIMIT_REACHED');
    assert.equal(r2.uploaded.length, 0);
});

test('rejects invalid MIME types and oversized files', async () => {
    const db = database(); const r2 = storage();
    await assert.rejects(uploadProductImages({ prisma: db, storage: r2, shopId: 'shop', productId, files: [{ ...file(), mimetype: 'text/plain' }] }), /Only JPEG/);
    await assert.rejects(uploadProductImages({ prisma: db, storage: r2, shopId: 'shop', productId, files: [{ ...file(), buffer: Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1) }] }), /2 MB/);
});

test('rejects cross-shop product access', async () => {
    await assert.rejects(uploadProductImages({ prisma: database({ exists: false }), storage: storage(), shopId: 'other-shop', productId, files: [file()] }), (error) => error instanceof ProductImageError && error.status === 404);
});

test('cleans up R2 objects when metadata registration fails', async () => {
    const db = database({ failTransaction: true }); const r2 = storage();
    await assert.rejects(uploadProductImages({ prisma: db, storage: r2, shopId: 'shop', productId, files: [file()] }), (error) => error.code === 'IMAGE_REGISTRATION_FAILED');
    assert.deepEqual(r2.deleted, r2.uploaded);
});

test('deletes from R2 before metadata and promotes the next primary image', async () => {
    const db = database({ images: [{ id: imageId, originalKey: 'products/a.png', isPrimary: true, sortOrder: 0 }, { id: secondImageId, originalKey: 'products/b.png', isPrimary: false, sortOrder: 1 }] }); const r2 = storage();
    await deleteProductImage({ prisma: db, storage: r2, shopId: 'shop', imageId });
    assert.deepEqual(r2.deleted, ['products/a.png']);
    assert.equal(db.state.images[0].id, secondImageId);
    assert.equal(db.state.images[0].isPrimary, true);
});

test('queues failed R2 deletion durably before removing metadata', async () => {
    const db = database({ images: [{ id: imageId, originalKey: 'products/a.png', isPrimary: true, sortOrder: 0 }] });
    await deleteProductImage({ prisma: db, storage: storage({ failDelete: true }), shopId: 'shop', imageId });
    assert.equal(db.state.images.length, 0);
    assert.deepEqual(db.state.cleanupTasks.map((task) => task.objectKey), ['products/a.png']);
});

test('permanent product deletion deletes R2 objects and queues only failures before cascade deletion', async () => {
    const db = database({ images: [{ id: imageId, originalKey: 'products/a.png', isPrimary: true, sortOrder: 0 }, { id: secondImageId, originalKey: 'products/b.png', isPrimary: false, sortOrder: 1 }] });
    const r2 = storage({ failDelete: true });
    const result = await deleteProductWithImages({ prisma: db, storage: r2, shopId: 'shop', productId });
    assert.equal(result.queuedCleanupCount, 2);
    assert.equal(db.state.deletedProduct, true);
    assert.deepEqual(db.state.cleanupTasks.map((task) => task.objectKey), ['products/a.png', 'products/b.png']);
});

test('reorders a complete gallery and changes its primary image', async () => {
    const db = database({ images: [{ id: imageId, isPrimary: true, sortOrder: 0 }, { id: secondImageId, isPrimary: false, sortOrder: 1 }] });
    await reorderProductImages({ prisma: db, shopId: 'shop', productId, images: [{ id: imageId, sortOrder: 1 }, { id: secondImageId, sortOrder: 0, isPrimary: true }] });
    assert.deepEqual(db.state.images.map((image) => ({ id: image.id, sortOrder: image.sortOrder, isPrimary: image.isPrimary })), [{ id: imageId, sortOrder: 1, isPrimary: false }, { id: secondImageId, sortOrder: 0, isPrimary: true }]);
});

test('retries a serialization conflict while reordering the complete locked gallery', async () => {
    const db = database({ conflictOnce: true, images: [{ id: imageId, isPrimary: true, sortOrder: 0 }, { id: secondImageId, isPrimary: false, sortOrder: 1 }] });
    await reorderProductImages({ prisma: db, shopId: 'shop', productId, images: [{ id: imageId, sortOrder: 0, isPrimary: true }, { id: secondImageId, sortOrder: 1 }] });
    assert.equal(db.state.images.filter((image) => image.isPrimary).length, 1);
});
