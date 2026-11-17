import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

/**
 * GET /api/shops/:id
 * Returns shop details. Scoped by authenticated user.
 */
router.get('/:id', async (req, res) => {
  sendSuccess(res, {
    id: req.params.id,
    message: 'Shops endpoint — implementation pending Phase 2',
  });
});

export default router;
