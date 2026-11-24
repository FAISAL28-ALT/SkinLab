import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { CategoryStatusSchema, CreateCategorySchema, UpdateCategorySchema } from '../../utils/validation.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireCatalogEditorScope, requireShopOwnerScope, resolvePublicShop } from '../../middleware/tenant.middleware.js';
import { apiCache } from '../../utils/cache.js';
const router = Router();
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC APIS
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * GET /api/categories
 * Returns active categories with published product count for the shop.
 */
router.get('/', resolvePublicShop, async (req, res) => {
    try {
        const shopId = req.shopId;
        const cacheKey = `categories:list:${shopId}`;
        const cached = apiCache.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached);
            return;
        }

        const categories = await prisma.category.findMany({
            where: {
                shopId,
                isActive: true,
            },
            include: {
                _count: {
                    select: {
                        products: {
                            where: { status: 'PUBLISHED' },
                        },
                    },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        const formatted = categories.map((c) => ({
            ...c,
            productCount: c._count.products,
            _count: undefined,
        }));
        apiCache.set(cacheKey, formatted, 60_000, 'categories');
        sendSuccess(res, formatted);
    }
    catch (error) {
        sendError(res, error.message);
    }
});

/**
 * GET /api/categories/admin/active
 * Returns active categories for the authenticated catalogue editor's tenant.
 * This is used by product creation, where the category must belong to the
 * same server-resolved shop as the product being created.
 */
router.get('/admin/active', requireAuth, requireCatalogEditorScope, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { shopId: req.shopId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        sendSuccess(res, categories);
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
 * GET /api/categories/admin/all
 * Lists all categories (active and inactive) for shop admin management.
 * Restricted to SHOP_ADMIN — PLATFORM_ADMIN does not manage shop category taxonomy.
 */
router.get('/admin/all', requireAuth, requireShopOwnerScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const categories = await prisma.category.findMany({
            where: { shopId },
            include: {
                _count: {
                    select: { products: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        sendSuccess(res, categories);
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * POST /api/categories
 * Creates a new category within the authenticated shop.
 * Restricted to SHOP_ADMIN — PLATFORM_ADMIN does not manage shop category taxonomy.
 */
router.post('/', requireAuth, requireShopOwnerScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const data = CreateCategorySchema.parse(req.body);
        const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const category = await prisma.category.create({
            data: {
                ...data,
                slug,
                shopId,
            },
        });
        sendSuccess(res, category, 201);
    }
    catch (error) {
        sendError(res, error.message, 400);
    }
});
/**
 * PATCH /api/categories/:id
 * Updates category details.
 * Restricted to SHOP_ADMIN — PLATFORM_ADMIN does not manage shop category taxonomy.
 */
router.patch('/:id', requireAuth, requireShopOwnerScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;
        const data = UpdateCategorySchema.parse(req.body);
        const existing = await prisma.category.findFirst({
            where: { id, shopId },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Category not found in this shop' });
            return;
        }
        const updated = await prisma.category.update({
            where: { id },
            data,
        });
        sendSuccess(res, updated);
    }
    catch (error) {
        sendError(res, error.message, 400);
    }
});
/**
 * PATCH /api/categories/:id/deactivate
 * Safely deactivates a category without deleting it.
 * Restricted to SHOP_ADMIN — PLATFORM_ADMIN does not manage shop category taxonomy.
 */
router.patch('/:id/deactivate', requireAuth, requireShopOwnerScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;
        const { isActive } = CategoryStatusSchema.parse(req.body);
        const updated = await prisma.category.updateMany({
            where: { id, shopId },
            data: { isActive },
        });
        if (updated.count === 0) {
            res.status(404).json({ success: false, error: 'Category not found in this shop' });
            return;
        }
        sendSuccess(res, { id, isActive, message: 'Category status updated' });
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * DELETE /api/categories/:id
 * Prevents accidental deletion if products still exist in the category!
 * Restricted to SHOP_ADMIN — PLATFORM_ADMIN does not manage shop category taxonomy.
 */
router.delete('/:id', requireAuth, requireShopOwnerScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const id = req.params.id;
        // Check if products exist in this category
        const productCount = await prisma.product.count({
            where: { categoryId: id, shopId },
        });
        if (productCount > 0) {
            res.status(409).json({
                success: false,
                error: `Cannot delete category: contains ${productCount} design(s). Reassign or archive designs before deleting.`,
                productCount,
            });
            return;
        }
        const deleted = await prisma.category.deleteMany({
            where: { id, shopId },
        });
        if (deleted.count === 0) {
            res.status(404).json({ success: false, error: 'Category not found in this shop' });
            return;
        }
        sendSuccess(res, { id, message: 'Category deleted successfully' });
    }
    catch (error) {
        sendError(res, error.message);
    }
});
export default router;
//# sourceMappingURL=categories.router.js.map
