import multer from 'multer';
import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { sendSuccess } from '../../utils/response.js';
import { ImageReorderSchema } from '../../utils/validation.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdminTenantScope, requireCatalogEditorScope } from '../../middleware/tenant.middleware.js';
import { r2Storage } from '../../services/r2-storage.js';
import { deleteProductImage, MAX_PRODUCT_IMAGE_BYTES, MAX_PRODUCT_IMAGES, ProductImageError, reorderProductImages, uploadProductImages } from '../../services/product-image.js';
import { apiCache } from '../../utils/cache.js';

const router = Router();
const multipartUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: MAX_PRODUCT_IMAGES, fields: MAX_PRODUCT_IMAGES + 2 } });

function parseImageUpload(req, res, next) {
    multipartUpload.array('images', MAX_PRODUCT_IMAGES)(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return next(new ProductImageError('Each image must not exceed 2 MB', 413, 'FILE_TOO_LARGE'));
        if (error instanceof multer.MulterError) return next(new ProductImageError('Upload accepts no more than 4 images in the "images" field', 400, 'INVALID_UPLOAD'));
        return next(error);
    });
}

/** POST /api/images/upload: server-managed R2 upload and ProductImage registration. */
router.post('/upload', requireAuth, requireCatalogEditorScope, parseImageUpload, async (req, res, next) => {
    try {
        const rawPrimaryIndex = req.body.primaryIndex !== undefined ? parseInt(req.body.primaryIndex, 10) : 0;
        const primaryIndex = Number.isInteger(rawPrimaryIndex) ? rawPrimaryIndex : 0;
        const images = await uploadProductImages({ prisma, storage: r2Storage, shopId: req.shopId, productId: req.body.productId, files: req.files, altText: req.body.altText, primaryIndex });
        apiCache.invalidateNamespace('products');
        sendSuccess(res, { images }, 201);
    }
    catch (error) { next(error); }
});

// Client-supplied R2 keys are intentionally no longer accepted. Use /upload.
router.post('/register', requireAuth, requireAdminTenantScope, (_req, res) => {
    res.status(410).json({ success: false, error: { code: 'ENDPOINT_RETIRED', message: 'Upload files through POST /api/images/upload; client-supplied storage keys are not accepted' } });
});

router.patch('/reorder', requireAuth, requireCatalogEditorScope, async (req, res, next) => {
    try {
        const { productId, images } = ImageReorderSchema.parse({ productId: req.body.productId, images: req.body.items });
        await reorderProductImages({ prisma, shopId: req.shopId, productId, images });
        apiCache.invalidateNamespace('products');
        sendSuccess(res, { message: 'Image ordering updated successfully' });
    }
    catch (error) { next(error); }
});

router.delete('/:id', requireAuth, requireCatalogEditorScope, async (req, res, next) => {
    try {
        await deleteProductImage({ prisma, storage: r2Storage, shopId: req.shopId, imageId: req.params.id });
        apiCache.invalidateNamespace('products');
        sendSuccess(res, { id: req.params.id, message: 'Image deleted from catalogue and R2' });
    }
    catch (error) { next(error); }
});

export default router;
