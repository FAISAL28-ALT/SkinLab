import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateProductSchema, UpdateProductSchema } from '../../utils/validation.js';
import { prisma } from '../../config/database.js';

test('CreateProductSchema accepts isTrending field and defaults to false', () => {
    const withoutTrending = {
        title: 'Minimal Neon Skin',
        categoryId: '4cf7bd6b-08f8-4fc4-86f3-12537a3a3f1d',
        designNumber: '990',
        description: 'Vibrant neon geometry design',
    };
    const parsedDefault = CreateProductSchema.parse(withoutTrending);
    assert.equal(parsedDefault.isTrending, false);
    assert.equal(parsedDefault.isFeatured, false);
    assert.equal(parsedDefault.isBestseller, false);

    const withTrending = {
        ...withoutTrending,
        isTrending: true,
        isFeatured: false,
        isBestseller: true,
    };
    const parsedCustom = CreateProductSchema.parse(withTrending);
    assert.equal(parsedCustom.isTrending, true);
    assert.equal(parsedCustom.isFeatured, false);
    assert.equal(parsedCustom.isBestseller, true);
});

test('UpdateProductSchema accepts isTrending field independently', () => {
    const updateTrendingOn = { isTrending: true };
    const parsedOn = UpdateProductSchema.parse(updateTrendingOn);
    assert.equal(parsedOn.isTrending, true);

    const updateTrendingOff = { isTrending: false };
    const parsedOff = UpdateProductSchema.parse(updateTrendingOff);
    assert.equal(parsedOff.isTrending, false);
});

test('Trending, Featured, and Bestseller operate independently', () => {
    const permutations = [
        { isTrending: true, isFeatured: false, isBestseller: false },
        { isTrending: false, isFeatured: true, isBestseller: false },
        { isTrending: false, isFeatured: false, isBestseller: true },
        { isTrending: true, isFeatured: true, isBestseller: true },
    ];
    for (const p of permutations) {
        const parsed = UpdateProductSchema.parse(p);
        assert.equal(parsed.isTrending, p.isTrending);
        assert.equal(parsed.isFeatured, p.isFeatured);
        assert.equal(parsed.isBestseller, p.isBestseller);
    }
});

test('Existing 6 homepage designs remain marked as trending in database', async () => {
    const expectedTrendingDesigns = ['013', '021', '024', '009', '028', '007'];

    const trendingProducts = await prisma.product.findMany({
        where: {
            isTrending: true,
            status: 'PUBLISHED',
        },
        select: {
            id: true,
            designNumber: true,
            title: true,
            isTrending: true,
            isFeatured: true,
            isBestseller: true,
            status: true,
        },
    });

    const trendingNumbers = trendingProducts.map((p) => p.designNumber);
    for (const num of expectedTrendingDesigns) {
        assert.ok(
            trendingNumbers.includes(num),
            `Expected design #${num} to be marked as trending in the database`
        );
    }

    // Verify not every product is marked as trending
    const nonTrendingCount = await prisma.product.count({
        where: { isTrending: false },
    });
    assert.ok(nonTrendingCount > 0, 'Expected non-trending products to exist');
});

test('Can create product with Trending ON, update, toggle OFF, and exclude drafts', async () => {
    const shop = await prisma.shop.findFirst();
    assert.ok(shop, 'Found a shop');

    const category = await prisma.category.findFirst({
        where: { shopId: shop.id, slug: 'laptop-skins' },
    });
    assert.ok(category, 'Found category');

    const testDesignNumber = 'TEST_TREND_999';

    // Cleanup previous run if any
    await prisma.product.deleteMany({
        where: { shopId: shop.id, designNumber: testDesignNumber },
    });

    // 1. Create product with Trending ON and status PUBLISHED
    const created = await prisma.product.create({
        data: {
            shopId: shop.id,
            categoryId: category.id,
            title: 'Test Trending Aurora Skin',
            slug: 'test-trending-aurora-skin-999',
            designNumber: testDesignNumber,
            description: 'Test trending aurora design',
            isTrending: true,
            isFeatured: false,
            isBestseller: false,
            status: 'PUBLISHED',
        },
    });

    assert.equal(created.isTrending, true);
    assert.equal(created.isFeatured, false);
    assert.equal(created.isBestseller, false);

    // 2. Query published trending products: created product MUST appear
    const publishedTrending = await prisma.product.findMany({
        where: { shopId: shop.id, status: 'PUBLISHED', isTrending: true },
        select: { id: true, designNumber: true },
    });
    assert.ok(
        publishedTrending.some((p) => p.id === created.id),
        'Product with Trending ON must appear in published trending list'
    );

    // 3. Mark product as DRAFT (unpublished): must NOT appear in published trending list
    await prisma.product.update({
        where: { id: created.id },
        data: { status: 'DRAFT' },
    });
    const draftQuery = await prisma.product.findMany({
        where: { shopId: shop.id, status: 'PUBLISHED', isTrending: true },
        select: { id: true },
    });
    assert.ok(
        !draftQuery.some((p) => p.id === created.id),
        'Unpublished (DRAFT) product must NEVER appear in published trending query'
    );

    // 4. Set back to PUBLISHED and toggle Trending OFF: must NOT appear in trending query
    await prisma.product.update({
        where: { id: created.id },
        data: { status: 'PUBLISHED', isTrending: false },
    });
    const trendingOffQuery = await prisma.product.findMany({
        where: { shopId: shop.id, status: 'PUBLISHED', isTrending: true },
        select: { id: true },
    });
    assert.ok(
        !trendingOffQuery.some((p) => p.id === created.id),
        'Product with Trending OFF must NOT appear in trending query'
    );

    // 5. Cleanup test product
    await prisma.product.delete({
        where: { id: created.id },
    });
});
