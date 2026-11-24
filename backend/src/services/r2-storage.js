import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { env } from '../config/env.js';
import { r2Client } from '../config/r2.js';

const extensionByMimeType = Object.freeze({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
});

export class R2StorageError extends Error {
    constructor(message, cause) {
        super(message, { cause });
        this.name = 'R2StorageError';
        this.status = 502;
    }
}

function normalisePrefix(prefix) {
    return String(prefix ?? 'uploads')
        .replace(/\\/g, '/')
        .split('/')
        .filter((segment) => /^[a-zA-Z0-9_-]+$/.test(segment))
        .join('/') || 'uploads';
}

export function createObjectKey({ mimeType, originalFilename, prefix = 'uploads' } = {}) {
    const mappedExtension = extensionByMimeType[mimeType];
    if (!mappedExtension) {
        throw new Error('Unsupported image MIME type');
    }
    // The filename is never used as a path; its extension is accepted only when it matches the MIME type.
    const requestedExtension = extname(String(originalFilename ?? '')).toLowerCase();
    const extension = requestedExtension === mappedExtension ? requestedExtension : mappedExtension;
    return `${normalisePrefix(prefix)}/${randomUUID()}${extension}`;
}

export function createPublicObjectUrl(key, publicBaseUrl = env.R2_PUBLIC_BASE_URL) {
    const normalisedKey = String(key ?? '').replace(/\\/g, '/');
    if (!normalisedKey || normalisedKey.startsWith('/') || normalisedKey.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
        throw new Error('Object key must be a non-empty relative path');
    }
    const baseUrl = new URL(publicBaseUrl);
    const encodedKey = normalisedKey
        .split('/')
        // Encode each path segment so special characters cannot alter the URL path.
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return new URL(encodedKey, `${baseUrl.origin}/`).toString();
}

export function createR2Storage({ client = r2Client, bucket = env.R2_BUCKET_NAME, publicBaseUrl = env.R2_PUBLIC_BASE_URL } = {}) {
    async function uploadObject({ body, mimeType, originalFilename, prefix }) {
        if (!Buffer.isBuffer(body) || body.length === 0) {
            throw new Error('Upload body must be a non-empty Buffer');
        }
        const key = createObjectKey({ mimeType, originalFilename, prefix });
        try {
            await client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: mimeType,
            }));
            return { key, url: createPublicObjectUrl(key, publicBaseUrl) };
        }
        catch (error) {
            throw new R2StorageError('Object upload failed', error);
        }
    }

    async function deleteObject(key) {
        try {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        }
        catch (error) {
            throw new R2StorageError('Object deletion failed', error);
        }
    }

    async function objectExists(key) {
        try {
            await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
            return true;
        }
        catch (error) {
            if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false;
            throw new R2StorageError('Object existence check failed', error);
        }
    }

    return { uploadObject, deleteObject, objectExists };
}

export const r2Storage = createR2Storage();
