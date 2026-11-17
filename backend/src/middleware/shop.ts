import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';

/**
 * Shop-scoping middleware.
 * Attaches shopId to all requests and ensures queries are
 * scoped to prevent cross-shop data leakage.
 *
 * Full implementation pending multi-shop Phase.
 */
export async function requireShopScope(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // TODO: Resolve shopId from subdomain, JWT claim, or X-Shop-Id header
  // For now, use user's associated shop from JWT claims
  const shopId = req.user?.shopId;
  if (!shopId) {
    res.status(400).json({ error: 'Shop context required' });
    return;
  }
  next();
}
