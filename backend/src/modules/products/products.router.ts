import { Router } from 'express';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

/**
 * GET /api/products
 * Returns all products for the current shop.
 * Supports: ?category=, ?search=, ?page=, ?limit=
 */
router.get('/', async (req, res) => {
  // TODO: Query Prisma with shop_id scope
  sendSuccess(res, {
    products: [],
    message: 'Products endpoint — connect to Prisma in Phase 2',
  });
});

/**
 * GET /api/products/:id
 * Returns a single product with its images.
 */
router.get('/:id', async (req, res) => {
  sendSuccess(res, {
    id: req.params.id,
    message: 'Product detail — connect to Prisma in Phase 2',
  });
});

/**
 * POST /api/products
 * Creates a new product. Admin only.
 */
router.post('/', async (req, res) => {
  sendSuccess(res, {
    message: 'Create product — connect to Prisma in Phase 2',
  }, 201);
});

/**
 * PATCH /api/products/:id
 * Updates a product. Admin only.
 */
router.patch('/:id', async (req, res) => {
  sendSuccess(res, {
    id: req.params.id,
    message: 'Update product — connect to Prisma in Phase 2',
  });
});

/**
 * DELETE /api/products/:id
 * Deletes a product. Admin only.
 */
router.delete('/:id', async (req, res) => {
  sendSuccess(res, {
    message: 'Delete product — connect to Prisma in Phase 2',
  });
});

export default router;
