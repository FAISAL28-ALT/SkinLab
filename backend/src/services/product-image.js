import { createPublicObjectUrl } from './r2-storage.js';
import { enqueueR2Deletion } from './storage-cleanup.js';

export const MAX_PRODUCT_IMAGES = 4;
export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

export class ProductImageError extends Error {
    constructor(message, status = 400, code = 'IMAGE_ERROR', details) {
        super(message);
        this.name = 'ProductImageError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function readJpegDimensions(buffer) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) return null;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (length < 2 || offset + 2 + length > buffer.length) return null;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += length + 2;
    }
    return null;
}

function readWebpDimensions(buffer) {
    const type = buffer.subarray(12, 16).toString('ascii');
    if (type === 'VP8X' && buffer.length >= 30) {
        return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    }
    if (type === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (type === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    return null;
}

export function inspectProductImage(file) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        throw new ProductImageError('A non-empty image file is required', 400, 'INVALID_IMAGE');
    }
    if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        throw new ProductImageError('Only JPEG, PNG, and WebP images are accepted', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }
    if (file.buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
        throw new ProductImageError('Each image must not exceed 2 MB', 413, 'FILE_TOO_LARGE');
    }
    let dimensions;
    if (file.mimetype === 'image/png' && file.buffer.length >= 24 && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        dimensions = { width: file.buffer.readUInt32BE(16), height: file.buffer.readUInt32BE(20) };
    }
    else if (file.mimetype === 'image/jpeg' && file.buffer.length >= 4 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff) {
        dimensions = readJpegDimensions(file.buffer);
    }
    else if (file.mimetype === 'image/webp' && file.buffer.length >= 16 && file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' && file.buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        dimensions = readWebpDimensions(file.buffer);
    }
    if (!dimensions || !dimensions.width || !dimensions.height) {
        throw new ProductImageError('File content does not match its declared image type', 415, 'INVALID_IMAGE_CONTENT');
    }
    return { mimeType: file.mimetype, fileSize: file.buffer.length, ...dimensions };
}

function imageResponse(image) {
    return { ...image, url: createPublicObjectUrl(image.originalKey) };
}

async function cleanupUploadedObjects(prisma, storage, keys) {
    const results = await Promise.allSettled(keys.map((key) => storage.deleteObject(key)));
    const failedKeys = results.flatMap((result, index) => result.status === 'rejected' ? [keys[index]] : []);
    for (const key of failedKeys) {
        try {
            await enqueueR2Deletion(prisma, key);
        }
        catch {
            // Do not hide a lost durable-cleanup task; callers receive a 5xx.
            throw new ProductImageError('Storage cleanup could not be recorded safely', 502, 'CLEANUP_QUEUE_FAILED');
        }
    }
    if (failedKeys.length) console.error('[Product image cleanup queued]', { count: failedKeys.length });
}

export async function uploadProductImages({ prisma, storage, shopId, productId, files, altText, primaryIndex = 0 }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(productId))) {
        throw new ProductImageError('A valid product ID is required', 400, 'INVALID_PRODUCT_ID');
    }
    if (!Array.isArray(files) || files.length === 0) throw new ProductImageError('At least one image is required');
    if (files.length > MAX_PRODUCT_IMAGES) throw new ProductImageError('A product can receive at most 4 images per upload', 400, 'IMAGE_LIMIT_REACHED');
    const altTextValues = Array.isArray(altText) ? altText : [altText];
    if (altTextValues.some((value) => value !== undefined && (typeof value !== 'string' || value.trim().length > 255))) {
        throw new ProductImageError('Image alt text must be 255 characters or fewer', 400, 'INVALID_ALT_TEXT');
    }
    const product = await prisma.product.findFirst({ where: { id: productId, shopId }, select: { id: true, _count: { select: { images: true } } } });
    if (!product) throw new ProductImageError('Product not found in this shop', 404, 'NOT_FOUND');
    if (product._count.images + files.length > MAX_PRODUCT_IMAGES) throw new ProductImageError('Image limit reached: a product can have at most 4 images', 400, 'IMAGE_LIMIT_REACHED');
    const inspected = files.map(inspectProductImage);

    // Controlled parallel upload to Cloudflare R2
    const uploadResults = await Promise.allSettled(
        files.map((file, index) =>
            storage.uploadObject({
                body: file.buffer,
                mimeType: inspected[index].mimeType,
                originalFilename: file.originalname,
                prefix: `products/${productId}`,
            })
        )
    );

    const uploaded = [];
    const uploadErrors = [];
    for (let index = 0; index < uploadResults.length; index += 1) {
        const result = uploadResults[index];
        if (result.status === 'fulfilled') {
            uploaded.push({ key: result.value.key, url: result.value.url, index });
        } else {
            uploadErrors.push({ index, error: result.reason });
        }
    }

    if (uploadErrors.length > 0) {
        // Partial upload failure: clean up any fulfilled files before failing
        await cleanupUploadedObjects(prisma, storage, uploaded.map((item) => item.key));
        throw uploadErrors[0].error;
    }

    const targetPrimaryIdx = typeof primaryIndex === 'number' && primaryIndex >= 0 && primaryIndex < files.length
        ? primaryIndex
        : 0;

    try {
        const images = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
            const existingCount = await tx.productImage.count({ where: { productId } });
            if (existingCount + uploaded.length > MAX_PRODUCT_IMAGES) throw new ProductImageError('Image limit reached: a product can have at most 4 images', 400, 'IMAGE_LIMIT_REACHED');

            const itemsToInsert = uploaded.map((item, index) => ({
                productId,
                originalKey: item.key,
                altText: altTextValues[index]?.trim() || undefined,
                fileSize: inspected[index].fileSize,
                mimeType: inspected[index].mimeType,
                width: inspected[index].width,
                height: inspected[index].height,
                isPrimary: existingCount === 0 && index === targetPrimaryIdx,
                sortOrder: existingCount + index,
            }));

            if (typeof tx.productImage.createManyAndReturn === 'function') {
                return await tx.productImage.createManyAndReturn({ data: itemsToInsert });
            }

            // Fallback for environments / test mocks that do not define createManyAndReturn
            const created = [];
            for (const item of itemsToInsert) {
                created.push(await tx.productImage.create({ data: item }));
            }
            return created;
        });
        return images.map(imageResponse);
    }
    catch (error) {
        await cleanupUploadedObjects(prisma, storage, uploaded.map((item) => item.key));
        if (error instanceof ProductImageError) throw error;
        throw new ProductImageError('Image metadata registration failed; uploaded objects were cleaned up', 502, 'IMAGE_REGISTRATION_FAILED');
    }
}

export async function reorderProductImages({ prisma, shopId, productId, images }) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await prisma.$transaction(async (tx) => {
                const locked = await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid AND shop_id = ${shopId}::uuid FOR UPDATE`;
                if (!locked.length) throw new ProductImageError('Product not found in this shop', 404, 'NOT_FOUND');
                const current = await tx.productImage.findMany({ where: { productId }, select: { id: true, isPrimary: true } });
                if (images.length !== current.length || new Set(images.map((image) => image.id)).size !== current.length || images.some((image) => !current.some((existing) => existing.id === image.id))) throw new ProductImageError('Reordering must include every image in the product gallery', 400, 'INVALID_GALLERY');
                const orders = images.map((image) => image.sortOrder).sort((a, b) => a - b);
                if (new Set(orders).size !== orders.length || !orders.every((order, index) => order === index)) throw new ProductImageError('Gallery sort order must be unique and start at zero', 400, 'INVALID_GALLERY');
                const primary = images.filter((image) => image.isPrimary === true);
                if (primary.length > 1) throw new ProductImageError('Only one image can be primary', 400, 'INVALID_GALLERY');
                if (primary.length === 1) await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
                for (const image of images) await tx.productImage.update({ where: { id: image.id }, data: { sortOrder: image.sortOrder, ...(image.isPrimary === true ? { isPrimary: true } : {}) } });
            }, { isolationLevel: 'Serializable' });
            return;
        }
        catch (error) {
            if (error?.code !== 'P2034' || attempt === 2) throw error;
        }
    }
}

export async function deleteProductImage({ prisma, storage, shopId, imageId }) {
    const image = await prisma.productImage.findFirst({ where: { id: imageId, product: { shopId } }, include: { product: { include: { images: { where: { id: { not: imageId } }, orderBy: { sortOrder: 'asc' } } } } } });
    if (!image) throw new ProductImageError('Image not found', 404, 'NOT_FOUND');
    // Keep the database row if R2 cannot be reached: it contains the key needed for a retry.
    try {
        await storage.deleteObject(image.originalKey);
    }
    catch {
        try {
            await enqueueR2Deletion(prisma, image.originalKey);
        }
        catch {
            throw new ProductImageError('Image storage deletion failed and cleanup could not be recorded safely', 502, 'CLEANUP_QUEUE_FAILED');
        }
        // A durable task now retains the key, so metadata can be removed safely.
    }
    try {
        await prisma.$transaction(async (tx) => {
            await tx.productImage.delete({ where: { id: imageId } });
            if (image.isPrimary && image.product.images.length) await tx.productImage.update({ where: { id: image.product.images[0].id }, data: { isPrimary: true } });
        });
    }
    catch (error) {
        console.error('[Product image metadata cleanup required]', { imageId, key: image.originalKey });
        throw new ProductImageError('Image was removed from storage but metadata cleanup requires repair', 502, 'IMAGE_METADATA_CLEANUP_REQUIRED');
    }
}

/** Permanently deletes a product only after every image key is deleted or durably queued. */
export async function deleteProductWithImages({ prisma, storage, shopId, productId }) {
    try {
        return await prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid AND shop_id = ${shopId}::uuid FOR UPDATE`;
            if (!locked.length) throw new ProductImageError('Product not found in this shop', 404, 'NOT_FOUND');
            const images = await tx.productImage.findMany({ where: { productId }, select: { originalKey: true } });
            // Parallelize external storage deletions to minimize transaction hold time
            const deleteResults = await Promise.allSettled(
                images.map((image) => storage.deleteObject(image.originalKey))
            );
            let queuedCleanupCount = 0;
            for (let i = 0; i < deleteResults.length; i += 1) {
                if (deleteResults[i].status === 'rejected') {
                    try {
                        await enqueueR2Deletion(tx, images[i].originalKey);
                        queuedCleanupCount += 1;
                    }
                    catch {
                        throw new ProductImageError('Product deletion stopped because storage cleanup could not be recorded safely', 502, 'CLEANUP_QUEUE_FAILED');
                    }
                }
            }
            await tx.product.delete({ where: { id: productId } });
            return { queuedCleanupCount };
        }, { isolationLevel: 'Serializable', timeout: 20_000 });
    }
    catch (error) {
        if (error instanceof ProductImageError) throw error;
        throw error;
    }
}
