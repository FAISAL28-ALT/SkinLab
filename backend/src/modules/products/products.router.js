import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response.js';
import { CreateProductSchema, UpdateProductSchema } from '../../utils/validation.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdminTenantScope, requireCatalogEditorScope, resolvePublicShop } from '../../middleware/tenant.middleware.js';
import { r2Storage, createPublicObjectUrl } from '../../services/r2-storage.js';
import { deleteProductWithImages } from '../../services/product-image.js';
import { apiCache } from '../../utils/cache.js';

/**
 * Resolves an image URL in a backward-compatible manner.
 *
 * Legacy seeded products store a local relative path (e.g. /assets/skins/anime/skin-028.webp)
 * in `originalKey`. These are served directly by the static file server and must be returned
 * as-is so the browser can request them from the same origin.
 *
 * New R2-backed products store a proper object key (e.g. products/{id}/{uuid}.png).
 * These need to be turned into a full public CDN URL.
 *
 * Detection heuristic: a key that starts with "/" or "assets/" is a legacy local path.
 */
function resolveImageUrl(originalKey) {
    if (!originalKey) return null;
    // Legacy local path — return as-is; the frontend static server handles it.
    if (originalKey.startsWith('/') || originalKey.startsWith('assets/')) {
        return originalKey;
    }
    // R2 object key — generate the public CDN URL.
    try {
        return createPublicObjectUrl(originalKey);
    } catch {
        // If key is somehow malformed, fall back to the raw key so the frontend
        // can at least try rather than receiving null.
        return originalKey;
    }
}

/** Attach a computed `url` field and `collection` field to every image in a product array. */
function attachImageUrls(products) {
    return products.map((product) => ({
        ...product,
        collection: product.designStyle,
        images: product.images.map((img) => ({
            ...img,
            url: resolveImageUrl(img.originalKey),
        })),
    }));
}

/** Same as attachImageUrls but for a single product object. */
function attachImageUrlsSingle(product) {
    if (!product) return product;
    return {
        ...product,
        collection: product.designStyle,
        images: product.images.map((img) => ({
            ...img,
            url: resolveImageUrl(img.originalKey),
        })),
    };
}

const router = Router();
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC APIS
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * GET /api/products
 * Public catalogue product listing.
 * Supports: ?category=slug, ?search=query, ?laptop=model, ?sort=newest|featured, ?page=1, ?limit=12
 */
router.get('/', resolvePublicShop, async (req, res) => {
    try {
        const shopId = req.shopId;
        let categoryParam = req.query.category?.trim();
        let collectionParam = (req.query.collection || req.query.style)?.trim();
        // Enforce maximum search query length and normalize to prevent unbounded memory growth
        const rawSearch = (req.query.q || '').trim();
        const searchParam = rawSearch ? rawSearch.slice(0, 50) : undefined;
        const normalizedSearch = searchParam ? searchParam.toLowerCase().replace(/\s+/g, ' ') : '';
        const laptopParam = req.query.laptop?.trim();
        const trendingParam = req.query.trending ?? req.query.isTrending;
        const sortBy = req.query.sort || 'featured';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        // Backward compatibility: if an old design style / collection was passed as category
        const legacyStyles = ['anime', 'cars', 'travel', 'gaming', 'aesthetic', 'abstract'];
        if (categoryParam && legacyStyles.includes(categoryParam.toLowerCase()) && !collectionParam) {
            collectionParam = categoryParam;
            categoryParam = undefined;
        }

        // Check in-memory cache first with normalized key
        const cacheKey = `products:list:shop:${shopId}:cat:${(categoryParam || 'all').toLowerCase()}:col:${(collectionParam || 'all').toLowerCase()}:q:${normalizedSearch}:lap:${laptopParam || 'all'}:sort:${sortBy}:trend:${trendingParam ?? 'all'}:p:${page}:l:${limit}:f:${req.query.full === 'true'}`;
        const cached = apiCache.get(cacheKey);
        if (cached) {
            res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
            sendPaginated(res, cached.items, cached.total, page, limit);
            return;
        }

        // Build Prisma query condition
        const where = {
            shopId,
            status: 'PUBLISHED',
        };
        if (trendingParam === 'true') {
            where.isTrending = true;
        } else if (trendingParam === 'false') {
            where.isTrending = false;
        }
        if (categoryParam && categoryParam.toLowerCase() !== 'all') {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryParam);
            where.category = {
                OR: [
                    { slug: categoryParam.toLowerCase() },
                    { name: { equals: categoryParam, mode: 'insensitive' } },
                    ...(isUuid ? [{ id: categoryParam }] : []),
                ],
            };
        }
        if (collectionParam && collectionParam.toLowerCase() !== 'all') {
            where.designStyle = {
                equals: collectionParam,
                mode: 'insensitive',
            };
        }
        if (searchParam) {
            const cleanSearch = searchParam.replace(/^#/, '');
            where.OR = [
                { title: { contains: cleanSearch, mode: 'insensitive' } },
                { designNumber: { contains: cleanSearch, mode: 'insensitive' } },
                { description: { contains: cleanSearch, mode: 'insensitive' } },
            ];
        }
        if (laptopParam && laptopParam !== 'all') {
            where.laptopCompatibility = {
                has: laptopParam,
            };
        }
        // Determine sorting
        let orderBy = { isFeatured: 'desc' };
        if (sortBy === 'newest')
            orderBy = { createdAt: 'desc' };
        if (sortBy === 'price-asc')
            orderBy = { price: 'asc' };
        if (sortBy === 'price-desc')
            orderBy = { price: 'desc' };
        if (sortBy === 'rating')
            orderBy = { rating: 'desc' };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                select: {
                    id: true,
                    shopId: true,
                    title: true,
                    slug: true,
                    designNumber: true,
                    description: true,
                    designStyle: true,
                    price: true,
                    originalPrice: true,
                    rating: true,
                    reviewCount: true,
                    isFeatured: true,
                    isBestseller: true,
                    isTrending: true,
                    isNew: true,
                    badge: true,
                    finish: true,
                    laptopCompatibility: req.query.full === 'true',
                    createdAt: true,
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    images: {
                        select: {
                            id: true,
                            productId: true,
                            originalKey: true,
                            isPrimary: true,
                            sortOrder: true,
                        },
                        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                        take: 1, // Only 1 primary image for catalog cards
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            prisma.product.count({ where }),
        ]);

        const formatted = attachImageUrls(products);
        apiCache.set(cacheKey, { items: formatted, total }, 60_000, 'products');
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        sendPaginated(res, formatted, total, page, limit);
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * GET /api/products/next-design-number
 * Fast, lightweight calculation of the next available design number for the tenant.
 */
router.get('/next-design-number', resolvePublicShop, async (req, res) => {
    try {
        const shopId = req.shopId;
        const rows = await prisma.$queryRaw`
            SELECT MAX(NULLIF(regexp_replace(design_number, '[^0-9]', '', 'g'), '')::int) as max_num
            FROM products
            WHERE shop_id = ${shopId}::uuid
        `;
        const maxNum = rows[0]?.max_num ?? 0;
        const nextDesignNumber = String(maxNum + 1).padStart(3, '0');
        sendSuccess(res, { nextDesignNumber });
    } catch (error) {
        sendError(res, error.message);
    }
});
/**
 * GET /api/products/:id
 * Public product details view with full gallery.
 * Catalogue administrators can also view unpublished drafts.
 */
router.get('/:id', resolvePublicShop, async (req, res) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

        const isEditor = Boolean(req.user && req.user.role === 'SHOP_ADMIN' && (req.user.shopId === shopId || !req.user.shopId));

        const cacheKey = `products:detail:${id}:shop:${shopId}:${isEditor ? 'admin' : 'public'}`;
        const cached = apiCache.get(cacheKey);
        if (cached) {
            if (!isEditor) {
                res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
            } else {
                res.setHeader('Cache-Control', 'no-store');
            }
            sendSuccess(res, cached);
            return;
        }

        const where = {
            shopId,
        };
        if (isUuid) {
            where.id = id;
        } else {
            where.OR = [
                { designNumber: id },
                { designNumber: id.padStart(3, '0') },
                { slug: id.toLowerCase() },
            ];
        }
        if (!isEditor) {
            where.status = 'PUBLISHED';
        }

        const product = await prisma.product.findFirst({
            where,
            include: {
                category: true,
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
            },
        });
        if (!product) {
            res.status(404).json({ success: false, error: 'Product not found or not published' });
            return;
        }
        const formatted = attachImageUrlsSingle(product);
        apiCache.set(cacheKey, formatted, 60_000, 'products');
        if (!isEditor) {
            res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        } else {
            res.setHeader('Cache-Control', 'no-store');
        }
        sendSuccess(res, formatted);
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ADMIN APIS (Requires Authentication & Shop Tenant Context)
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * GET /api/products/admin/all
 * Lists all products for the authenticated shop including DRAFT and ARCHIVED.
 */
router.get('/admin/all', requireAuth, requireCatalogEditorScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const status = req.query.status;
        const categoryParam = req.query.category?.trim();
        const collectionParam = (req.query.collection || req.query.style)?.trim();
        const searchParam = req.query.q?.trim();
        const trendingParam = req.query.trending ?? req.query.isTrending;
        const where = { shopId };
        if (status && status !== 'all') {
            where.status = status;
        }
        if (trendingParam === 'true') {
            where.isTrending = true;
        } else if (trendingParam === 'false') {
            where.isTrending = false;
        }
        if (categoryParam && categoryParam.toLowerCase() !== 'all') {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryParam);
            where.category = {
                OR: [
                    { slug: categoryParam.toLowerCase() },
                    { name: { equals: categoryParam, mode: 'insensitive' } },
                    ...(isUuid ? [{ id: categoryParam }] : []),
                ],
            };
        }
        if (collectionParam && collectionParam.toLowerCase() !== 'all') {
            where.designStyle = {
                equals: collectionParam,
                mode: 'insensitive',
            };
        }
        if (searchParam) {
            const cleanSearch = searchParam.replace(/^#/, '');
            where.OR = [
                { title: { contains: cleanSearch, mode: 'insensitive' } },
                { designNumber: { contains: cleanSearch, mode: 'insensitive' } },
                { description: { contains: cleanSearch, mode: 'insensitive' } },
            ];
        }
        const products = await prisma.product.findMany({
            where,
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        sendSuccess(res, attachImageUrls(products));
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * POST /api/products
 * Creates a new product for the authenticated shop.
 */
router.post('/', requireAuth, requireCatalogEditorScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const data = CreateProductSchema.parse(req.body);
        const designStyle = data.collection || data.designStyle || null;
        const { collection: _col, ...productData } = data;
        productData.designStyle = designStyle;

        // Auto-generate slug
        const baseSlug = productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const slug = `${baseSlug}-${productData.designNumber}`;
        const newProduct = await prisma.product.create({
            data: {
                ...productData,
                shopId,
                slug,
                createdBy: req.user?.id,
            },
            include: {
                category: true,
                images: true,
            },
        });
        apiCache.invalidateNamespace('products');
        sendSuccess(res, attachImageUrlsSingle(newProduct), 201);
    }
    catch (error) {
        sendError(res, error.message, 400);
    }
});
/**
 * PATCH /api/products/:id
 * Updates product details within the authenticated shop.
 */
router.patch('/:id', requireAuth, requireCatalogEditorScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;
        const data = UpdateProductSchema.parse(req.body);
        if (data.collection !== undefined) {
            data.designStyle = data.collection;
            delete data.collection;
        }
        const existing = await prisma.product.findFirst({
            where: { id, shopId },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Product not found in this shop' });
            return;
        }
        if (data.title && data.title !== existing.title) {
            const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const designNum = data.designNumber || existing.designNumber;
            const newSlug = `${baseSlug}-${designNum}`;
            const conflict = await prisma.product.findFirst({
                where: { shopId, slug: newSlug, id: { not: id } },
            });
            data.slug = conflict ? `${newSlug}-${Date.now().toString(36)}` : newSlug;
        }
        const updated = await prisma.product.update({
            where: { id },
            data,
            include: { category: true, images: true },
        });
        apiCache.invalidateNamespace('products');
        sendSuccess(res, attachImageUrlsSingle(updated));
    }
    catch (error) {
        sendError(res, error.message, 400);
    }
});
/**
 * PATCH /api/products/:id/status
 * Publish, unpublish (draft), or archive a product.
 */
router.patch('/:id/status', requireAuth, requireCatalogEditorScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;
        const { status } = req.body;
        if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
            res.status(400).json({ success: false, error: 'Invalid status. Must be DRAFT, PUBLISHED, or ARCHIVED' });
            return;
        }
        const updated = await prisma.product.updateMany({
            where: { id, shopId },
            data: { status },
        });
        if (updated.count === 0) {
            res.status(404).json({ success: false, error: 'Product not found in this shop' });
            return;
        }
        apiCache.invalidateNamespace('products');
        sendSuccess(res, { id, status, message: `Product status updated to ${status}` });
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * DELETE /api/products/:id
 * Deletes or archives a product.
 */
router.delete('/:id', requireAuth, requireCatalogEditorScope, async (req, res, next) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            res.status(404).json({ success: false, error: 'Product not found in this shop' });
            return;
        }

        const archive = req.query.archive === 'true';
        if (archive) {
            await prisma.product.updateMany({
                where: { id, shopId },
                data: { status: 'ARCHIVED' },
            });
            apiCache.invalidateNamespace('products');
            sendSuccess(res, { id, message: 'Product archived successfully' });
            return;
        }
        const result = await deleteProductWithImages({ prisma, storage: r2Storage, shopId, productId: id });
        apiCache.invalidateNamespace('products');
        sendSuccess(res, { id, message: 'Product permanently deleted', ...(result.queuedCleanupCount ? { storageCleanupQueued: result.queuedCleanupCount } : {}) });
    }
    catch (error) { next(error); }
});
export default router;
//# sourceMappingURL=products.router.js.map
