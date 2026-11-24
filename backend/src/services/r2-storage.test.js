import assert from 'node:assert/strict';
import test from 'node:test';
import { createObjectKey, createPublicObjectUrl, createR2Storage, R2StorageError } from './r2-storage.js';

test('creates UUID image keys and ignores filename paths', () => {
    const key = createObjectKey({ mimeType: 'image/png', originalFilename: '../../private.png', prefix: '../development-test' });
    assert.match(key, /^development-test\/[0-9a-f-]{36}\.png$/);
});

test('uploads an image with the fixed bucket and declared Content-Type', async () => {
    let command;
    const storage = createR2Storage({
        bucket: 'skinlab-product-images', publicBaseUrl: 'https://pub-example.r2.dev',
        client: { send: async (value) => { command = value; } },
    });
    const result = await storage.uploadObject({ body: Buffer.from([1]), mimeType: 'image/webp', originalFilename: 'sample.webp', prefix: 'development-test' });
    assert.match(result.key, /^development-test\/[0-9a-f-]{36}\.webp$/);
    assert.equal(result.url, `https://pub-example.r2.dev/${result.key}`);
    assert.equal(command.input.Bucket, 'skinlab-product-images');
    assert.equal(command.input.ContentType, 'image/webp');
});

test('creates safe public URLs from object keys containing special characters', () => {
    const url = createPublicObjectUrl('uploads/a folder/image #1?.png', 'https://pub-example.r2.dev/');
    assert.equal(url, 'https://pub-example.r2.dev/uploads/a%20folder/image%20%231%3F.png');
    assert.throws(() => createPublicObjectUrl('../private.png', 'https://pub-example.r2.dev'), /relative path/);
});

test('safely wraps an R2 connection failure', async () => {
    const storage = createR2Storage({
        client: { send: async () => { throw new Error('network unreachable'); } },
        bucket: 'skinlab-product-images',
    });
    await assert.rejects(
        storage.uploadObject({ body: Buffer.from([1]), mimeType: 'image/jpeg', prefix: 'development-test' }),
        (error) => error instanceof R2StorageError && error.status === 502 && error.message === 'Object upload failed',
    );
});
