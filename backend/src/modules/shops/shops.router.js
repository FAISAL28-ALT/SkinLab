import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireShopOwnerScope, resolvePublicShop } from '../../middleware/tenant.middleware.js';
import { UpdateShopSchema } from '../../utils/validation.js';
import { apiCache } from '../../utils/cache.js';
const router = Router();
/**
 * GET /api/shops/info
 * Public shop profile & branding.
 */
router.get('/info', resolvePublicShop, async (req, res) => {
    try {
        const cacheKey = `shop:info:${req.shopId}`;
        const cached = apiCache.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached);
            return;
        }

        const shop = await prisma.shop.findUnique({
            where: { id: req.shopId },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                logoUrl: true,
                contactEmail: true,
                contactPhone: true,
                isActive: true,
            },
        });
        if (!shop) {
            res.status(404).json({ success: false, error: 'Shop not found' });
            return;
        }
        apiCache.set(cacheKey, shop, 60_000, 'shops');
        sendSuccess(res, shop);
    }
    catch (error) {
        sendError(res, error.message);
    }
});
/**
 * PATCH /api/shops/current
 * Shop owner updates shop details for their own shop.
 * Restricted to SHOP_ADMIN only — PLATFORM_ADMIN may manage designs but not shop settings.
 */
router.patch('/current', requireAuth, requireShopOwnerScope, async (req, res) => {
    try {
        const shopId = req.shopId;
        const data = UpdateShopSchema.parse(req.body);
        const updated = await prisma.shop.update({
            where: { id: shopId },
            data,
        });
        apiCache.invalidateNamespace('shops');
        sendSuccess(res, updated);
    }
    catch (error) {
        sendError(res, error.message);
    }
});
export default router;
//# sourceMappingURL=shops.router.js.map