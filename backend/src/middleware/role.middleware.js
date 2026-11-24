/**
 * Role-Based Access Control Middleware:
 * Verifies that the authenticated user possesses one of the allowed roles.
 */
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized: Authentication required before role verification',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role`,
            });
            return;
        }
        next();
    };
}
export const requireShopAdmin = requireRole(['SHOP_ADMIN']);

//# sourceMappingURL=role.middleware.js.map