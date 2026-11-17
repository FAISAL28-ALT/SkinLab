import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

/**
 * POST /api/images/upload
 * Uploads an image to Cloudflare R2.
 * - Max 8 images per product
 * - Max 15 MB per file
 * - Formats: JPG, JPEG, PNG, WebP
 * - Generates optimized thumbnail and preview using Sharp
 * - Stores R2 object key in PostgreSQL (never binary)
 * Admin only.
 */
router.post('/upload', async (_req, res) => {
  sendSuccess(res, { message: 'Image upload — Cloudflare R2 + Sharp integration pending Phase 3' }, 201);
});

/**
 * DELETE /api/images/:id
 * Deletes an image from R2 and removes the DB record.
 * Admin only.
 */
router.delete('/:id', async (req, res) => {
  sendSuccess(res, { id: req.params.id, message: 'Image delete — pending Phase 3' });
});

export default router;
