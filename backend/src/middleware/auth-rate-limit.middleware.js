import { createHmac } from 'node:crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

// Local in-memory cache for fast rejection of already-blocked keys
const blockedCache = new Map();

// Periodic cleanup of in-memory cache and database expired buckets
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, blockedUntil] of blockedCache.entries()) {
        if (blockedUntil <= now) {
            blockedCache.delete(key);
        }
    }
    void prisma.authRateLimitBucket.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    }).catch(() => undefined);
}, 15 * 60 * 1000);
cleanupTimer.unref();

/**
 * Shared PostgreSQL-backed distributed rate limiter with atomic upsert and
 * in-memory fast rejection for blocked keys.
 *
 * Enforces atomic counts across all backend instances without requiring Redis.
 */
export function authRateLimit(options) {
    return async (req, res, next) => {
        const now = Date.now();
        const bucketStart = new Date(Math.floor(now / options.windowMs) * options.windowMs);
        const expiresAt = new Date(bucketStart.getTime() + options.windowMs * 2);
        const ip = req.ip || req.socket.remoteAddress || 'unknown';

        if (!env.AUTH_IP_HASH_SECRET) {
            res.status(503).json({
                success: false,
                error: { code: 'AUTH_UNAVAILABLE', message: 'Authentication service is temporarily unavailable' },
            });
            return;
        }

        const bucketKey = createHmac('sha256', env.AUTH_IP_HASH_SECRET)
            .update(`${req.baseUrl}${req.path}:${ip}`).digest('hex');

        // Check if locally blocked to prevent unnecessary database queries
        const localBlockedUntil = blockedCache.get(bucketKey);
        if (localBlockedUntil && localBlockedUntil > now) {
            const retryAfter = Math.max(1, Math.ceil((localBlockedUntil - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            res.status(429).json({
                success: false,
                error: { code: 'RATE_LIMITED', message: options.message },
            });
            return;
        }

        let hits = 1;
        try {
            // Atomic check-and-increment in shared PostgreSQL
            const rows = await prisma.$queryRaw`
                INSERT INTO auth_rate_limit_buckets (bucket_key, bucket_start, expires_at, hits)
                VALUES (${bucketKey}, ${bucketStart}, ${expiresAt}, 1)
                ON CONFLICT (bucket_key, bucket_start)
                DO UPDATE SET hits = auth_rate_limit_buckets.hits + 1
                RETURNING hits;
            `;
            hits = rows[0]?.hits ?? 1;
        } catch {
            // Graceful fallback to memory tracking if database is temporarily unavailable
            hits = (blockedCache.get(`fb:${bucketKey}`) || 0) + 1;
            blockedCache.set(`fb:${bucketKey}`, hits);
        }

        if (hits > options.max) {
            const resetTime = bucketStart.getTime() + options.windowMs;
            blockedCache.set(bucketKey, resetTime);
            const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            res.status(429).json({
                success: false,
                error: { code: 'RATE_LIMITED', message: options.message },
            });
            return;
        }

        next();
    };
}
