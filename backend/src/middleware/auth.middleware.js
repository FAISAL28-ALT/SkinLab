import { prisma } from '../config/database.js';
import { verifyAccessToken } from '../services/auth-security.js';
import { getOfficialShopCached } from './tenant.middleware.js';

// These endpoints are necessary to complete or abandon the first-login flow.
const passwordChangeAllowedPaths = new Set([
    '/api/auth/me',
    '/api/auth/change-password',
    '/api/auth/logout',
    '/api/auth/logout-all',
]);

export async function requireAuth(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    const match = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
    }
    try {
        const { userId, sessionId } = await verifyAccessToken(match[1]);
        const [session, profile] = await Promise.all([
            prisma.authSession.findFirst({
                where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
                select: { id: true },
            }),
            prisma.profile.findUnique({
                where: { id: userId },
                include: {
                    shop: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
                    credential: { select: { loginId: true, mustChangePassword: true } },
                },
            }),
        ]);
        if (!session) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session is invalid or expired' } });
            return;
        }
        if (!profile || !profile.isActive) {
            res.status(403).json({ success: false, error: { code: 'ACCOUNT_UNAVAILABLE', message: 'This account is not authorized to access the application' } });
            return;
        }
        let userShop = profile.shop;
        let userShopId = profile.shopId;
        if (!userShopId && profile.role === 'SHOP_ADMIN') {
            const defaultShop = await getOfficialShopCached();
            if (defaultShop?.isActive) {
                userShopId = defaultShop.id;
                userShop = defaultShop;
            }
        }
        if (profile.role === 'SHOP_ADMIN' && (!userShopId || !userShop?.isActive)) {
            res.status(403).json({ success: false, error: { code: 'ACCOUNT_UNAVAILABLE', message: 'This account is not authorized to access the application' } });
            return;
        }
        req.user = {
            id: profile.id, userId: profile.credential?.loginId ?? '', email: profile.email, fullName: profile.fullName, role: profile.role, mustChangePassword: profile.credential?.mustChangePassword ?? false,
            shopId: userShopId,
            shop: userShop ? { id: userShop.id, name: userShop.name, slug: userShop.slug, logoUrl: userShop.logoUrl } : null,
        };
        req.shopId = userShopId ?? undefined;
        req.sessionId = sessionId;
        const requestPath = (req.originalUrl ?? req.url ?? '').split('?')[0];
        if (req.user.mustChangePassword && !passwordChangeAllowedPaths.has(requestPath)) {
            res.status(403).json({ success: false, error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Password change is required before accessing this resource' } });
            return;
        }
        next();
    }
    catch (error) {
        if (error instanceof Error && /JWT|token|signature|claim|exp|issuer|audience/i.test(error.message)) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session is invalid or expired' } });
            return;
        }
        next(error);
    }
}

/**
 * Optional authentication for public endpoints (catalogue, categories, shops/info).
 * Extracts claims from JWT and resolves profile/role without blocking if unauthenticated.
 */
export async function optionalAuth(req, _res, next) {
    const match = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
        req.user = null;
        return next();
    }
    try {
        const { userId, sessionId } = await verifyAccessToken(match[1]);
        const [session, profile] = await Promise.all([
            prisma.authSession.findFirst({
                where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
                select: { id: true },
            }),
            prisma.profile.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    role: true,
                    shopId: true,
                    isActive: true,
                },
            }),
        ]);
        if (session && profile && profile.isActive) {
            let userShopId = profile.shopId;
            if (!userShopId && profile.role === 'SHOP_ADMIN') {
                const defaultShop = await getOfficialShopCached();
                if (defaultShop?.isActive) {
                    userShopId = defaultShop.id;
                }
            }
            req.user = {
                id: profile.id,
                role: profile.role,
                shopId: userShopId,
            };
        } else {
            req.user = null;
        }
    } catch {
        req.user = null;
    }
    next();
}
