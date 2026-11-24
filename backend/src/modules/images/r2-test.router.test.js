import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTestImageRequest } from './r2-test.router.js';
import imagesRouter from './images.router.js';

test('rejects a non-image upload', () => {
    const result = validateTestImageRequest({ mimeType: 'text/plain', body: Buffer.from('not an image') });
    assert.equal(result.status, 415);
    assert.equal(result.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('rejects an image over 2 MB before contacting R2', () => {
    const result = validateTestImageRequest({ mimeType: 'image/png', body: Buffer.alloc(2 * 1024 * 1024 + 1) });
    assert.equal(result.status, 413);
    assert.equal(result.code, 'FILE_TOO_LARGE');
});

test('production image upload is protected by authentication before multipart parsing', () => {
    const uploadRoute = imagesRouter.stack.find((layer) => layer.route?.path === '/upload')?.route;
    assert.ok(uploadRoute);
    assert.equal(uploadRoute.stack[0].handle.name, 'requireAuth');
});
