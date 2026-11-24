import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateProductSchema, UpdateProductSchema } from '../../utils/validation.js';
import { prisma } from '../../config/database.js';

test('CreateProductSchema accepts collection field', () => {
    const validData = {
        title: 'Cyber Samurai Skin',
        categoryId: '4cf7bd6b-08f8-4fc4-86f3-12537a3a3f1d',
        designNumber: '901',
        description: 'Futuristic anime design',
        collection: 'Anime',
    };
    const parsed = CreateProductSchema.parse(validData);
    assert.equal(parsed.collection, 'Anime');
    assert.equal(parsed.title, 'Cyber Samurai Skin');
});

test('UpdateProductSchema accepts collection field independently', () => {
    const validUpdate = {
        collection: 'Cars',
    };
    const parsed = UpdateProductSchema.parse(validUpdate);
    assert.equal(parsed.collection, 'Cars');
});

test('Existing laptop designs retain their collection assignments', async () => {
    const products = await prisma.product.findMany({
        where: {
            category: { slug: 'laptop-skins' },
        },
        select: {
            id: true,
            title: true,
            designNumber: true,
            designStyle: true,
            category: { select: { slug: true, name: true } },
        },
    });

    assert.ok(products.length >= 12, 'Expected at least 12 seeded laptop products');

    const expectedCollections = ['Anime', 'Cars', 'Travel', 'Gaming', 'Aesthetic', 'Abstract'];
    for (const p of products) {
        assert.ok(p.designStyle, `Product ${p.title} has a designStyle assigned`);
        assert.ok(
            expectedCollections.includes(p.designStyle),
            `Product ${p.title} has designStyle ${p.designStyle} which is in the 6 Collections`
        );
        assert.equal(p.category.slug, 'laptop-skins');
    }
});

test('Prisma query filters by both Device Category and Design Collection', async () => {
    // 1. Filter Laptop Skins + Anime
    const laptopAnime = await prisma.product.findMany({
        where: {
            category: { slug: 'laptop-skins' },
            designStyle: { equals: 'Anime', mode: 'insensitive' },
            status: 'PUBLISHED',
        },
        select: { id: true, title: true, designStyle: true, category: { select: { name: true } } },
    });
    assert.ok(laptopAnime.length > 0, 'Found anime laptop skins');
    for (const p of laptopAnime) {
        assert.equal(p.designStyle?.toLowerCase(), 'anime');
        assert.equal(p.category.name, 'Laptop Skins');
    }

    // 2. Filter Laptop Skins + Cars
    const laptopCars = await prisma.product.findMany({
        where: {
            category: { slug: 'laptop-skins' },
            designStyle: { equals: 'Cars', mode: 'insensitive' },
            status: 'PUBLISHED',
        },
        select: { id: true, title: true, designStyle: true, category: { select: { name: true } } },
    });
    assert.ok(laptopCars.length > 0, 'Found cars laptop skins');
    for (const p of laptopCars) {
        assert.equal(p.designStyle?.toLowerCase(), 'cars');
        assert.equal(p.category.name, 'Laptop Skins');
    }

    // 3. Filter Mobile Skin + Cars (currently 0 until created)
    const mobileCars = await prisma.product.findMany({
        where: {
            category: { slug: 'mobile-skin' },
            designStyle: { equals: 'Cars', mode: 'insensitive' },
            status: 'PUBLISHED',
        },
    });
    // Expected to run without error and correctly filter
    assert.ok(Array.isArray(mobileCars));
});

test('Can create, edit collection, and delete test product with collection', async () => {
    // Find a shop and category
    const shop = await prisma.shop.findFirst();
    assert.ok(shop, 'Found a shop');
    const mobileCategory = await prisma.category.findFirst({
        where: { shopId: shop.id, slug: 'mobile-skin' },
    });
    assert.ok(mobileCategory, 'Found Mobile Skin category');

    // Create test product with category = Mobile Skin and collection = Cars
    const testProduct = await prisma.product.create({
        data: {
            shopId: shop.id,
            categoryId: mobileCategory.id,
            title: 'Test Porsche Mobile Wrap',
            slug: `test-porsche-mobile-wrap-${Date.now()}`,
            designNumber: `T${Date.now().toString().slice(-4)}`,
            description: 'Test product for collection verification',
            designStyle: 'Cars',
            status: 'PUBLISHED',
        },
        include: {
            category: true,
        },
    });

    assert.equal(testProduct.category.name, 'Mobile Skin');
    assert.equal(testProduct.designStyle, 'Cars');

    // Verify filter finds it
    const foundMobileCars = await prisma.product.findFirst({
        where: {
            category: { slug: 'mobile-skin' },
            designStyle: { equals: 'Cars', mode: 'insensitive' },
            id: testProduct.id,
        },
    });
    assert.ok(foundMobileCars, 'Found newly created Mobile Skin in Cars collection');

    // Update collection to Anime
    const updatedProduct = await prisma.product.update({
        where: { id: testProduct.id },
        data: { designStyle: 'Anime' },
    });
    assert.equal(updatedProduct.designStyle, 'Anime');

    // Verify filter finds it under Anime and not Cars
    const notUnderCars = await prisma.product.findFirst({
        where: {
            category: { slug: 'mobile-skin' },
            designStyle: { equals: 'Cars', mode: 'insensitive' },
            id: testProduct.id,
        },
    });
    assert.equal(notUnderCars, null);

    const underAnime = await prisma.product.findFirst({
        where: {
            category: { slug: 'mobile-skin' },
            designStyle: { equals: 'Anime', mode: 'insensitive' },
            id: testProduct.id,
        },
    });
    assert.ok(underAnime, 'Found updated product under Anime collection');

    // Clean up test product
    await prisma.product.delete({ where: { id: testProduct.id } });
});
