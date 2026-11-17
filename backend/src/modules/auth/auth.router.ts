import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates a user via Supabase Auth.
 * Implementation pending Phase 2.
 */
router.post('/login', async (req, res) => {
  // TODO: Delegate to Supabase Auth
  sendSuccess(res, { message: 'Auth endpoint — implementation pending Phase 2' });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (_req, res) => {
  sendSuccess(res, { message: 'Logged out' });
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
router.get('/me', async (_req, res) => {
  sendSuccess(res, { message: 'Auth/me — implementation pending Phase 2' });
});

export default router;
