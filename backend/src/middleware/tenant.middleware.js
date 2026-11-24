import { prisma } from '../config/database.js';
import { recordAuthEvent } from '../services/auth-audit.js';
import { apiCache } from '../utils/cache.js';

// Cache helper for shop tenant resolution
async function getShopBySlugCached(slug) {
    const cacheKey = `shop:slug:${slug}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const shop = await prisma.shop.findUnique({
        where: { slug },
        select: { id: true, slug: true, isActive: true },
    });
    if (shop) {
        apiCache.set(cacheKey, shop, 60_000, 'shops');
    }
    return shop;
}

export async function getOfficialShopCached() {
    const cacheKey = 'shop:official';
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const shop = await prisma.shop.findUnique({
        where: { slug: 'skinlab-official' },
        select: { id: true, name: true, slug: true, logoUrl: true, isActive: true },
    });
    if (shop) {
        apiCache.set(cacheKey, shop, 60_000, 'shops');
    }
    return shop;
}

/**
 * Tenant Isolation Middleware (Admin routes):
 * Resolves the shop strictly from the authenticated profile.
 * Rejects or ignores any frontend-supplied shop_id override to prevent tenant spoofing.
 */
export async function requireAdminTenantScope(req, res, next) {
    const isAuthorizedAdmin = req.user?.role === 'SHOP_ADMIN';
    if (!isAuthorizedAdmin) {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'A Shop Admin account is required' },
        });
        return;
    }
    // If administrator has no shop assigned, resolve to the default official shop
    if (!req.user.shopId) {
        const defaultShop = await getOfficialShopCached();
        if (defaultShop?.isActive) {
            req.user.shopId = defaultShop.id;
            req.user.shop = defaultShop;
        }
    }
    if (!req.user.shopId) {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No active shop available for this administrator' },
        });
        return;
    }
    // Enforce server-resolved shopId
    req.shopId = req.user.shopId;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const sendJson = res.json.bind(res);
        res.json = ((body) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                void recordAuthEvent('PRIVILEGED_ACTION', req, req.user?.id).then(() => sendJson(body));
                return res;
            }
            return sendJson(body);
        });
    }
    next();
}

/**
 * Restricts catalogue edits to shop administrators scoped to their assigned shop.
 */
export async function requireCatalogEditorScope(req, res, next) {
    return requireAdminTenantScope(req, res, next);
}

/**
 * Shop-owner-only scope: restricts shop configuration endpoints (shop profile,
 * category management, etc.) to SHOP_ADMIN accounts only.
 */
export async function requireShopOwnerScope(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
        });
        return;
    }
    if (req.user.role !== 'SHOP_ADMIN') {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'This action requires a Shop Admin account' },
        });
        return;
    }
    // Resolve tenant shop for the authenticated SHOP_ADMIN
    if (!req.user.shopId) {
        res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No active shop available for this administrator' },
        });
        return;
    }
    req.shopId = req.user.shopId;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const sendJson = res.json.bind(res);
        res.json = ((body) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                void recordAuthEvent('PRIVILEGED_ACTION', req, req.user?.id).then(() => sendJson(body));
                return res;
            }
            return sendJson(body);
        });
    }
    next();
}

/**
 * Tenant Resolution Middleware (Public Catalogue routes):
 * Resolves shop from:
 * 1. Subdomain / Header (e.g. `X-Shop-Slug` or `?shop=slug`)
 * 2. Defaults to the primary active shop (e.g. 'skinlab-official')
 */
export async function resolvePublicShop(req, res, next) {
    try {
        const shopSlug = req.headers['x-shop-slug'] || req.query.shop || 'skinlab-official';
        const shop = await getShopBySlugCached(shopSlug);
        if (!shop || !shop.isActive) {
            res.status(404).json({
                success: false,
                error: `Shop '${shopSlug}' not found or currently inactive`,
            });
            return;
        }
        if (req.user?.role === 'SHOP_ADMIN' && req.user.shopId !== shop.id) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This account cannot access another shop.' } });
            return;
        }
        req.shopId = shop.id;
        next();
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to resolve catalogue shop context',
        });
    }
}
//# sourceMappingURL=tenant.middleware.js.map
