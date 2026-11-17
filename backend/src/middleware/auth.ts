import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
    shopId?: string;
  };
}

/**
 * Requires a valid JWT in the Authorization: Bearer header.
 * Verifies the token with Supabase Auth — implementation pending.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing token' });
    return;
  }

  // TODO: Verify JWT with Supabase Auth in Phase 2
  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: invalid token' });
    return;
  }

  next();
}

/**
 * Requires the authenticated user to have the ADMIN role.
 * Must be used after requireAuth.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: admin access required' });
    return;
  }
  next();
}
