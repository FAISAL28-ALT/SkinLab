import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

/**
 * GET /api/categories
 * Returns all categories for the current shop.
 */
router.get('/', async (_req, res) => {
  sendSuccess(res, { categories: [], message: 'Categories — connect to Prisma in Phase 2' });
});

/**
 * POST /api/categories
 * Creates a category. Admin only.
 */
router.post('/', async (_req, res) => {
  sendSuccess(res, { message: 'Create category — pending Phase 2' }, 201);
});

/**
 * PATCH /api/categories/:id
 */
router.patch('/:id', async (req, res) => {
  sendSuccess(res, { id: req.params.id, message: 'Update category — pending Phase 2' });
});

/**
 * DELETE /api/categories/:id
 */
router.delete('/:id', async (req, res) => {
  sendSuccess(res, { message: 'Delete category — pending Phase 2' });
});

export default router;
