import express, { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireShopAdmin } from '../../middleware/role.middleware.js';
import { r2Storage } from '../../services/r2-storage.js';
import { env } from '../../config/env.js';

const router = Router();
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maximumImageBytes = 2 * 1024 * 1024;

// Guard against registering or running in production runtime
router.use((_req, res, next) => {
    if (env.NODE_ENV === 'production') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
        return;
    }
    next();
});

export function validateTestImageRequest({ mimeType, body }) {
    if (!allowedMimeTypes.has(mimeType)) {
        return { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Only JPEG, PNG, and WebP images are accepted' };
    }
    if (!Buffer.isBuffer(body) || body.length === 0) {
        return { status: 400, code: 'INVALID_UPLOAD', message: 'A non-empty image body is required' };
    }
    if (body.length > maximumImageBytes) {
        return { status: 413, code: 'FILE_TOO_LARGE', message: 'Image must not exceed 2 MB' };
    }
    // Verify magic bytes / file signatures to prevent disguised payload uploads
    const isPng = mimeType === 'image/png' && body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = mimeType === 'image/jpeg' && body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    const isWebp = mimeType === 'image/webp' && body.length >= 12 && body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isPng && !isJpeg && !isWebp) {
        return { status: 415, code: 'INVALID_IMAGE_CONTENT', message: 'File signature does not match declared image type' };
    }
    return null;
}

// Raw image data with mandatory authentication, role checks, and signature inspection
router.post('/upload', requireAuth, requireShopAdmin, express.raw({ type: [...allowedMimeTypes], limit: maximumImageBytes }), async (req, res, next) => {
    const mimeType = req.get('content-type')?.split(';', 1)[0].toLowerCase();
    const validationError = validateTestImageRequest({ mimeType, body: req.body });
    if (validationError) {
        res.status(validationError.status).json({ success: false, error: validationError });
        return;
    }
    try {
        const { key, url } = await r2Storage.uploadObject({
            body: req.body,
            mimeType,
            originalFilename: req.get('x-filename'),
            prefix: 'development-test',
        });
        res.status(201).json({ success: true, data: { key, url, uploaded: true } });
    }
    catch (error) {
        next(error);
    }
});

export default router;
