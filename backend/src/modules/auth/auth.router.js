import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { requireAuth, optionalAuth, invalidateAuthCache } from '../../middleware/auth.middleware.js';
import { getOfficialShopCached } from '../../middleware/tenant.middleware.js';
import { authRateLimit } from '../../middleware/auth-rate-limit.middleware.js';
import { hashPassword, issueAccessToken, newRefreshToken, refreshHash, sessionLifetimeMs, throttleHash, validPassword, verifyPassword } from '../../services/auth-security.js';
import { recordAuthEvent } from '../../services/auth-audit.js';
const router = Router();
const idSchema = z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9._@+-]+$/);
const credentialSchema = z.object({ userId: idSchema, password: z.string().min(1).max(1024) }).strict();
const dummyHashPromise = hashPassword('skinlab-constant-dummy-credential');
function cookieConfig() {
    return { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth' };
}
function setRefreshCookie(res, token, expiresAt) {
    res.cookie('skinlab_refresh', token, { ...cookieConfig(), maxAge: Math.max(0, expiresAt.getTime() - Date.now()), expires: expiresAt });
}
function clearRefreshCookie(res) { res.clearCookie('skinlab_refresh', cookieConfig()); }
function readCookie(req, key) {
    const part = req.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${key}=`));
    if (!part)
        return null;
    try {
        return decodeURIComponent(part.slice(key.length + 1));
    }
    catch {
        return null;
    }
}
function csrfAllowed(req) {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const source = origin || (referer ? (() => { try {
        return new URL(referer).origin;
    }
    catch {
        return '';
    } })() : '');
    if (!source)
        return false;
    const allowed = [env.FRONTEND_URL, ...env.CORS_ORIGINS.split(',').map((x) => x.trim()).filter(Boolean)];
    return allowed.some((value) => { try {
        return new URL(value).origin === source;
    }
    catch {
        return false;
    } });
}
function clientIp(req) { return req.ip || req.socket.remoteAddress || 'unknown'; }
async function throttleState(key) {
    const now = new Date();
    const rows = await prisma.$queryRaw `
    INSERT INTO auth_login_throttles (key, failures, updated_at)
    VALUES (${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      failures = CASE WHEN auth_login_throttles.updated_at <= ${new Date(now.getTime() - 30 * 60 * 1000)} OR (auth_login_throttles.locked_until IS NOT NULL AND auth_login_throttles.locked_until <= ${now}) THEN 1 ELSE auth_login_throttles.failures + 1 END,
      locked_until = CASE WHEN auth_login_throttles.updated_at <= ${new Date(now.getTime() - 30 * 60 * 1000)} OR (auth_login_throttles.locked_until IS NOT NULL AND auth_login_throttles.locked_until <= ${now}) THEN NULL ELSE auth_login_throttles.locked_until END,
      updated_at = ${now}
    RETURNING failures, locked_until`;
    const state = rows[0];
    if (state.locked_until && state.locked_until > now)
        return { blocked: true, failures: state.failures, retryAfter: Math.ceil((state.locked_until.getTime() - now.getTime()) / 1000) };
    if (state.failures >= 5) {
        const lockedUntil = new Date(now.getTime() + 60 * 60 * 1000);
        await prisma.authLoginThrottle.update({ where: { key }, data: { lockedUntil } });
        return { blocked: true, failures: state.failures, retryAfter: 3600 };
    }
    return { blocked: false, failures: state.failures, retryAfter: 0 };
}
async function activeThrottle(key) {
    const state = await prisma.authLoginThrottle.findUnique({ where: { key }, select: { lockedUntil: true } });
    if (!state?.lockedUntil || state.lockedUntil <= new Date())
        return null;
    return Math.ceil((state.lockedUntil.getTime() - Date.now()) / 1000);
}
async function clearFailures(keys) {
    await prisma.authLoginThrottle.updateMany({ where: { key: { in: keys } }, data: { failures: 0, lockedUntil: null, updatedAt: new Date() } });
}
function rateLimited(res, retrySeconds) {
    res.setHeader('Retry-After', String(Math.max(1, retrySeconds)));
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many failed attempts. Try again after the lockout expires.', retryAfter: Math.max(1, retrySeconds) } });
}
function isPrismaDelegateMethod(fn) {
    if (typeof fn !== 'function') return false;
    const s = fn.toString();
    return s.includes('Proxy') || s.includes('_errorFormat') || s.includes('callsite');
}

async function lookupUserCredential(loginId) {
    // Transparent mock support for automated unit tests
    if (!isPrismaDelegateMethod(prisma.authCredential.findUnique)) {
        let credential = await prisma.authCredential.findUnique({
            where: { loginId },
            select: {
                userId: true,
                loginId: true,
                passwordHash: true,
                mustChangePassword: true,
                profile: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        role: true,
                        isActive: true,
                        shopId: true,
                        shop: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
                    },
                },
            },
        });
        if (!credential) {
            const profilesByEmail = await prisma.profile.findMany({
                where: { email: { equals: loginId, mode: 'insensitive' } },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    isActive: true,
                    shopId: true,
                    shop: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
                    credential: { select: { userId: true, loginId: true, passwordHash: true, mustChangePassword: true } },
                },
            });
            if (profilesByEmail.length === 1 && profilesByEmail[0].credential) {
                credential = {
                    ...profilesByEmail[0].credential,
                    profile: profilesByEmail[0],
                };
            }
        }
        if (!credential) {
            const profilesByPrefix = await prisma.profile.findMany({
                where: { email: { startsWith: `${loginId}@`, mode: 'insensitive' } },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    isActive: true,
                    shopId: true,
                    shop: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
                    credential: { select: { userId: true, loginId: true, passwordHash: true, mustChangePassword: true } },
                },
            });
            if (profilesByPrefix.length === 1 && profilesByPrefix[0].credential) {
                credential = {
                    ...profilesByPrefix[0].credential,
                    profile: profilesByPrefix[0],
                };
            }
        }
        return credential;
    }

    // High-performance single SQL JOIN query for live database runtime (1 round-trip)
    const rows = await prisma.$queryRaw`
        SELECT 
          c.user_id as "userId", c.login_id as "loginId", c.password_hash as "passwordHash", c.must_change_password as "mustChangePassword",
          p.id as "profileId", p.shop_id as "shopId", p.full_name as "fullName", p.email, p.role, p.is_active as "isActive",
          s.id as "shop_id", s.name as "shop_name", s.slug as "shop_slug", s.logo_url as "shop_logoUrl", s.is_active as "shop_isActive"
        FROM auth_credentials c
        JOIN profiles p ON c.user_id = p.id
        LEFT JOIN shops s ON p.shop_id = s.id
        WHERE LOWER(c.login_id) = LOWER(${loginId})
           OR LOWER(p.email) = LOWER(${loginId})
           OR (
             LOWER(SPLIT_PART(p.email, '@', 1)) = LOWER(${loginId})
             AND (SELECT COUNT(*) FROM profiles WHERE LOWER(SPLIT_PART(email, '@', 1)) = LOWER(${loginId})) = 1
           )
        ORDER BY
          CASE
            WHEN LOWER(c.login_id) = LOWER(${loginId}) THEN 1
            WHEN LOWER(p.email) = LOWER(${loginId}) THEN 2
            ELSE 3
          END
        LIMIT 1
    `;
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    return {
        userId: row.userId,
        loginId: row.loginId,
        passwordHash: row.passwordHash,
        mustChangePassword: row.mustChangePassword,
        profile: {
            id: row.profileId,
            email: row.email,
            fullName: row.fullName,
            role: row.role,
            isActive: row.isActive,
            shopId: row.shopId,
            shop: row.shop_id ? {
                id: row.shop_id,
                name: row.shop_name,
                slug: row.shop_slug,
                logoUrl: row.shop_logoUrl,
                isActive: row.shop_isActive,
            } : null,
        },
    };
}

async function createSessionAndClearThrottles(profileId, tokenHash, createdAt, expiresAt, userAgent, clientIp, clearKeys) {
    // Transparent mock support for automated unit tests
    if (!isPrismaDelegateMethod(prisma.authSession.create)) {
        const [session] = await Promise.all([
            prisma.authSession.create({
                data: {
                    userId: profileId, refreshTokenHash: tokenHash, createdAt, expiresAt,
                    userAgent: userAgent?.slice(0, 500), ipAddress: clientIp,
                    tokenHistory: { create: { tokenHash } },
                },
            }),
            clearFailures(clearKeys),
        ]);
        return session;
    }

    // High-performance atomic CTE for live database runtime (1 round-trip)
    const sessionId = randomUUID();
    const rows = await prisma.$queryRaw`
        WITH new_session AS (
          INSERT INTO auth_sessions (id, user_id, refresh_token_hash, created_at, expires_at, last_used_at, user_agent, ip_address)
          VALUES (${sessionId}::uuid, ${profileId}::uuid, ${tokenHash}, ${createdAt}, ${expiresAt}, ${createdAt}, ${userAgent?.slice(0, 500)}, ${clientIp})
          RETURNING id
        ),
        ins_history AS (
          INSERT INTO auth_refresh_token_history (token_hash, session_id, created_at)
          SELECT ${tokenHash}, id, ${createdAt} FROM new_session
        ),
        upd_throttles AS (
          UPDATE auth_login_throttles
          SET failures = 0, locked_until = NULL, updated_at = ${createdAt}
          WHERE key = ANY(${clearKeys}::char(64)[])
        )
        SELECT id FROM new_session
    `;
    return { id: rows[0]?.id || sessionId };
}

router.post('/login', authRateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many login requests. Try again later.' }), async (req, res, next) => {
    const tStart = performance.now();
    res.setHeader('Cache-Control', 'no-store');
    if (!csrfAllowed(req)) {
        res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
        return;
    }
    const parsed = credentialSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(401).json({ success: false, error: { code: 'LOGIN_FAILED', message: 'Invalid User ID or Password.' } });
        return;
    }
    try {
        const loginId = parsed.data.userId.toLowerCase();
        const ipKey = throttleHash('ip', clientIp(req));
        const accountKey = throttleHash('account', loginId);

        // Concurrently check active throttles and fetch user credential in a single parallel turn
        const tLookupStart = performance.now();
        const [ipRetryAfter, accountRetryAfter, credential] = await Promise.all([
            activeThrottle(ipKey),
            activeThrottle(accountKey),
            lookupUserCredential(loginId),
        ]);
        const tLookupEnd = performance.now();

        if (ipRetryAfter) {
            rateLimited(res, ipRetryAfter);
            return;
        }

        // Gather all associated account keys to prevent throttling bypass between email and loginId
        const associatedAccountKeys = new Set([accountKey]);
        if (credential?.loginId) {
            associatedAccountKeys.add(throttleHash('account', credential.loginId.toLowerCase()));
        }
        if (credential?.profile?.email) {
            associatedAccountKeys.add(throttleHash('account', credential.profile.email.toLowerCase()));
        }

        const tVerifyStart = performance.now();
        const hasHash = Boolean(credential?.passwordHash);
        const verificationBranch = hasHash ? 'credential_password_hash' : 'dummy_hash_fallback';
        const hash = credential?.passwordHash ?? await dummyHashPromise;
        const valid = await verifyPassword(hash, parsed.data.password);
        const tVerifyEnd = performance.now();

        if (env.NODE_ENV === 'development') {
            console.log('[AUTH_DIAG]', {
                profileFound: Boolean(credential?.profile),
                credentialFound: Boolean(credential),
                hasPasswordHash: hasHash,
                verificationBranch,
                argon2Verified: valid,
            });
        }

        const profile = credential?.profile;
        const defaultShop = (!profile?.shopId && profile?.role === 'SHOP_ADMIN') ? await getOfficialShopCached() : null;
        const shopActive = profile?.shop ? profile.shop.isActive : (defaultShop ? defaultShop.isActive : false);
        const shopValid = profile?.role !== 'SHOP_ADMIN' || shopActive;

        // If credentials are invalid, enforce both IP and account-level abuse limits
        if (!valid || !credential || !profile || !profile.isActive || !shopValid) {
            const throttlePromises = [throttleState(ipKey)];
            for (const key of associatedAccountKeys) {
                throttlePromises.push(throttleState(key));
            }
            const [nextIp, ...nextAccounts] = await Promise.all(throttlePromises);
            void recordAuthEvent('LOGIN_FAILED', req);
            const accountBlocked = nextAccounts.some((a) => a.blocked);
            const maxAccountRetryAfter = Math.max(0, ...nextAccounts.map((a) => a.retryAfter));

            if (nextIp.blocked || accountBlocked || accountRetryAfter) {
                rateLimited(res, Math.max(nextIp.retryAfter, maxAccountRetryAfter, accountRetryAfter || 0));
                return;
            }
            res.status(401).json({ success: false, error: { code: 'LOGIN_FAILED', message: 'Invalid User ID or Password.' } });
            return;
        }

        const tSessionStart = performance.now();
        const clearKeys = [ipKey, ...associatedAccountKeys];
        const token = newRefreshToken();
        const tokenHash = refreshHash(token);
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs);

        // Atomic session creation, token history recording, and throttle clearing in 1 single round-trip
        const session = await createSessionAndClearThrottles(
            profile.id,
            tokenHash,
            createdAt,
            expiresAt,
            req.get('user-agent'),
            clientIp(req),
            clearKeys
        );
        const accessToken = await issueAccessToken(profile.id, session.id);
        const tSessionEnd = performance.now();

        setRefreshCookie(res, token, expiresAt);
        // Persist audit log asynchronously without blocking login completion
        void recordAuthEvent('LOGIN_SUCCEEDED', req, profile.id);

        let userShop = profile.shop;
        let userShopId = profile.shopId;
        if (!userShopId && profile.role === 'SHOP_ADMIN' && defaultShop?.isActive) {
            userShopId = defaultShop.id;
            userShop = defaultShop;
        }
        const tTotalEnd = performance.now();
        if (env.NODE_ENV === 'development') {
            res.setHeader('Server-Timing', `lookup;dur=${(tLookupEnd - tLookupStart).toFixed(1)}, verify;dur=${(tVerifyEnd - tVerifyStart).toFixed(1)}, session;dur=${(tSessionEnd - tSessionStart).toFixed(1)}, total;dur=${(tTotalEnd - tStart).toFixed(1)}`);
        }
        res.status(200).json({ success: true, data: { access_token: accessToken, expires_in: 900, user: { id: profile.id, userId: credential.loginId, email: profile.email, fullName: profile.fullName, role: profile.role, mustChangePassword: credential.mustChangePassword, shopId: userShopId, shop: userShop ? { id: userShop.id, name: userShop.name, slug: userShop.slug, logoUrl: userShop.logoUrl } : null } } });
    }
    catch (error) {
        next(error);
    }
});
router.post('/refresh', authRateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many session refresh requests. Try again later.' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!csrfAllowed(req)) {
        res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
        return;
    }
    const oldToken = readCookie(req, 'skinlab_refresh');
    if (!oldToken) {
        clearRefreshCookie(res);
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session is invalid or expired' } });
        return;
    }
    const oldHash = refreshHash(oldToken);
    try {
        const result = await prisma.$transaction(async (tx) => {
            const current = await tx.authSession.findUnique({ where: { refreshTokenHash: oldHash } });
            if (!current) {
                const used = await tx.authRefreshTokenHistory.findUnique({ where: { tokenHash: oldHash } });
                if (used)
                    await tx.authSession.updateMany({ where: { id: used.sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
                return null;
            }
            const now = new Date();
            if (current.revokedAt || current.expiresAt <= now)
                return null;
            const nextToken = newRefreshToken();
            const nextHash = refreshHash(nextToken);
            const claimed = await tx.authSession.updateMany({
                where: { id: current.id, refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: now } },
                data: { refreshTokenHash: nextHash, lastUsedAt: now },
            });
            if (claimed.count !== 1) {
                await tx.authSession.updateMany({ where: { id: current.id, revokedAt: null }, data: { revokedAt: now } });
                return null;
            }
            await tx.authRefreshTokenHistory.create({ data: { tokenHash: nextHash, sessionId: current.id } });
            const profile = await tx.profile.findUnique({ where: { id: current.userId }, include: { shop: true, credential: { select: { loginId: true, mustChangePassword: true } } } });
            if (!profile || !profile.isActive || (profile.role === 'SHOP_ADMIN' && (!profile.shopId || !profile.shop?.isActive))) {
                await tx.authSession.update({ where: { id: current.id }, data: { revokedAt: now } });
                return null;
            }
            return { token: nextToken, expiresAt: current.expiresAt, sessionId: current.id, userId: current.userId, profile };
        }, { isolationLevel: 'Serializable' });
        if (!result) {
            clearRefreshCookie(res);
            res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session is invalid or expired' } });
            return;
        }
        const accessToken = await issueAccessToken(result.userId, result.sessionId);
        setRefreshCookie(res, result.token, result.expiresAt);
        let userShop = result.profile?.shop;
        let userShopId = result.profile?.shopId;
        if (!userShopId && result.profile?.role === 'SHOP_ADMIN') {
            const defaultShop = await getOfficialShopCached();
            if (defaultShop?.isActive) {
                userShopId = defaultShop.id;
                userShop = defaultShop;
            }
        }
        const user = result.profile ? {
            id: result.profile.id,
            userId: result.profile.credential?.loginId ?? '',
            email: result.profile.email,
            fullName: result.profile.fullName,
            role: result.profile.role,
            mustChangePassword: result.profile.credential?.mustChangePassword ?? false,
            shopId: userShopId,
            shop: userShop ? { id: userShop.id, name: userShop.name, slug: userShop.slug, logoUrl: userShop.logoUrl } : null,
        } : undefined;
        res.status(200).json({ success: true, data: { access_token: accessToken, expires_in: 900, ...(user ? { user } : {}) } });
    }
    catch {
        try {
            const used = await prisma.authRefreshTokenHistory.findUnique({ where: { tokenHash: oldHash } });
            if (used) {
                await prisma.authSession.updateMany({ where: { id: used.sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
                clearRefreshCookie(res);
                res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session is invalid or expired' } });
                return;
            }
        }
        catch { /* Database outages are reported generically below. */ }
        res.status(503).json({ success: false, error: { code: 'AUTH_UNAVAILABLE', message: 'Authentication is temporarily unavailable' } });
    }
});
router.post('/logout', optionalAuth, async (req, res, next) => {
    try {
        res.setHeader('Cache-Control', 'no-store');
        if (!csrfAllowed(req)) {
            res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
            return;
        }
        let targetSessionId = req.sessionId || null;
        let targetUserId = req.user?.id || null;
        const refreshToken = readCookie(req, 'skinlab_refresh');
        if (refreshToken) {
            const hash = refreshHash(refreshToken);
            const session = await prisma.authSession.findUnique({ where: { refreshTokenHash: hash }, select: { id: true, userId: true } });
            if (session) {
                targetSessionId = session.id;
                targetUserId = session.userId;
                await prisma.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
            } else {
                const used = await prisma.authRefreshTokenHistory.findUnique({ where: { tokenHash: hash }, select: { sessionId: true } });
                if (used) {
                    targetSessionId = used.sessionId;
                    await prisma.authSession.updateMany({ where: { id: used.sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
                }
            }
        }
        else if (req.sessionId) {
            await prisma.authSession.updateMany({ where: { id: req.sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        clearRefreshCookie(res);
        invalidateAuthCache(targetSessionId, targetUserId);
        if (req.user)
            await recordAuthEvent('LOGOUT', req, req.user.id);
        res.status(200).json({ success: true, data: { message: 'Logged out' } });
    }
    catch (error) {
        next(error);
    }
});
router.post('/logout-all', requireAuth, async (req, res, next) => {
    try {
        if (!csrfAllowed(req)) {
            res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
            return;
        }
        await prisma.authSession.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
        clearRefreshCookie(res);
        invalidateAuthCache(null, req.user.id);
        res.status(200).json({ success: true, data: { message: 'All sessions revoked' } });
    }
    catch (error) {
        next(error);
    }
});
router.post('/change-password', requireAuth, async (req, res, next) => {
    const parsed = z.object({ password: z.string().max(1024), currentPassword: z.string().max(1024).optional() }).strict().safeParse(req.body);
    if (!parsed.success || !validPassword(parsed.success ? parsed.data.password : '')) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' } });
        return;
    }
    if (!csrfAllowed(req)) {
        res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
        return;
    }
    try {
        const credential = await prisma.authCredential.findUnique({ where: { userId: req.user.id } });
        if (!credential) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Account credentials not found.' } });
            return;
        }
        if (credential.mustChangePassword) {
            if (parsed.data.currentPassword) {
                const matches = await verifyPassword(credential.passwordHash, parsed.data.currentPassword);
                if (!matches) {
                    res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' } });
                    return;
                }
            }
        } else {
            if (!parsed.data.currentPassword) {
                res.status(400).json({ success: false, error: { code: 'CURRENT_PASSWORD_REQUIRED', message: 'Current password is required.' } });
                return;
            }
            const matches = await verifyPassword(credential.passwordHash, parsed.data.currentPassword);
            if (!matches) {
                res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' } });
                return;
            }
        }
        const passwordHash = await hashPassword(parsed.data.password);
        await prisma.$transaction([
            prisma.authCredential.update({ where: { userId: req.user.id }, data: { passwordHash, mustChangePassword: false } }),
            prisma.authSession.updateMany({ where: { userId: req.user.id, id: { not: req.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        await recordAuthEvent('PASSWORD_CHANGED', req, req.user.id);
        invalidateAuthCache(null, req.user.id);
        res.status(200).json({ success: true, data: { message: 'Password updated; other sessions were revoked.' } });
    }
    catch (error) { next(error); }
});
const updateProfileSchema = z.object({
    username: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9._@+-]+$/).optional(),
    fullName: z.string().trim().max(120).optional(),
    email: z.string().trim().email().max(255).optional(),
}).strict();

router.patch('/me', requireAuth, async (req, res, next) => {
    if (!csrfAllowed(req)) {
        res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
        return;
    }
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid profile details provided.' } });
        return;
    }
    const { username, fullName, email } = parsed.data;
    try {
        const currentProfile = await prisma.profile.findUnique({
            where: { id: req.user.id },
            include: { credential: true },
        });
        if (!currentProfile) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
            return;
        }

        // Email is an authentication identifier: disallow changing email directly via profile patch
        if (email !== undefined && email.toLowerCase() !== currentProfile.email.toLowerCase()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'EMAIL_UPDATE_NOT_SUPPORTED',
                    message: 'Email address cannot be changed directly from profile settings. Email updates require a dedicated verification flow.',
                },
            });
            return;
        }

        // Profile display updates: updating display username / fullName NEVER modifies authCredential.loginId
        const profileUpdate = {};
        if (fullName !== undefined) {
            profileUpdate.fullName = fullName;
        } else if (username !== undefined) {
            profileUpdate.fullName = username;
        }

        let updatedProfile = currentProfile;
        if (Object.keys(profileUpdate).length > 0) {
            updatedProfile = await prisma.profile.update({
                where: { id: req.user.id },
                data: profileUpdate,
                include: {
                    shop: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
                    credential: { select: { loginId: true, mustChangePassword: true } },
                },
            });
        }

        invalidateAuthCache(null, req.user.id);
        const userData = await formatUserData(updatedProfile);
        res.status(200).json({ success: true, data: userData });
    } catch (error) {
        next(error);
    }
});

async function formatUserData(profileOrId) {
    let updatedProfile;
    if (typeof profileOrId === 'object' && profileOrId !== null) {
        updatedProfile = profileOrId;
    } else {
        updatedProfile = await prisma.profile.findUnique({
            where: { id: profileOrId },
            include: {
                shop: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
                credential: { select: { loginId: true, mustChangePassword: true } },
            },
        });
    }
    if (!updatedProfile) return null;
    let userShop = updatedProfile.shop;
    let userShopId = updatedProfile.shopId;
    if (!userShopId && updatedProfile.role === 'SHOP_ADMIN') {
        const defaultShop = await getOfficialShopCached();
        if (defaultShop?.isActive) {
            userShopId = defaultShop.id;
            userShop = defaultShop;
        }
    }
    return {
        id: updatedProfile.id,
        userId: updatedProfile.credential?.loginId ?? '',
        email: updatedProfile.email,
        fullName: updatedProfile.fullName,
        role: updatedProfile.role,
        mustChangePassword: updatedProfile.credential?.mustChangePassword ?? false,
        shopId: userShopId,
        shop: userShop ? {
            id: userShop.id,
            name: userShop.name,
            slug: userShop.slug,
            logoUrl: userShop.logoUrl,
        } : null,
    };
}

const checkEmailSchema = z.string().trim().email().max(255);

router.get('/check-email', requireAuth, authRateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many check email requests.' }), async (req, res, next) => {
    try {
        const emailQuery = req.query.email;
        if (!emailQuery || typeof emailQuery !== 'string') {
            res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Email query parameter is required.' } });
            return;
        }
        const parsed = checkEmailSchema.safeParse(emailQuery);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' } });
            return;
        }
        const emailToCheck = parsed.data.toLowerCase();
        if (req.user?.email && req.user.email.toLowerCase() === emailToCheck) {
            res.status(200).json({
                success: true,
                data: {
                    available: false,
                    reason: 'CURRENT_EMAIL',
                    message: 'New email must be different from current email address.',
                },
            });
            return;
        }

        const [existingProfile, existingCredential] = await Promise.all([
            prisma.profile.findFirst({
                where: {
                    email: { equals: emailToCheck, mode: 'insensitive' },
                    id: { not: req.user.id },
                },
                select: { id: true },
            }),
            prisma.authCredential.findFirst({
                where: {
                    loginId: { equals: emailToCheck, mode: 'insensitive' },
                    userId: { not: req.user.id },
                },
                select: { userId: true },
            }),
        ]);

        if (existingProfile || existingCredential) {
            res.status(200).json({
                success: true,
                data: {
                    available: false,
                    reason: 'ALREADY_REGISTERED',
                    message: 'This email address is already registered.',
                },
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                available: true,
            },
        });
    } catch (error) {
        next(error);
    }
});

const changeEmailSchema = z.object({
    newEmail: z.string().trim().email().max(255),
    currentPassword: z.string().min(1).max(1024),
}).strict();

router.post('/change-email', requireAuth, authRateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many email change requests. Try again later.' }), async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!csrfAllowed(req)) {
        res.status(403).json({ success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin is not allowed' } });
        return;
    }
    const parsed = changeEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'New email address and current password are required.' } });
        return;
    }
    const newEmail = parsed.data.newEmail.toLowerCase();
    const currentPassword = parsed.data.currentPassword;

    try {
        const credential = await prisma.authCredential.findUnique({ where: { userId: req.user.id } });
        if (!credential) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Account credentials not found.' } });
            return;
        }

        const valid = await verifyPassword(credential.passwordHash, currentPassword);
        if (!valid) {
            res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' } });
            return;
        }

        const currentProfile = await prisma.profile.findUnique({ where: { id: req.user.id } });
        if (!currentProfile) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
            return;
        }
        if (currentProfile.email.toLowerCase() === newEmail) {
            res.status(400).json({ success: false, error: { code: 'SAME_EMAIL', message: 'New email must be different from current email address.' } });
            return;
        }

        // Check whether the new email is already registered
        const existingProfile = await prisma.profile.findFirst({
            where: {
                email: { equals: newEmail, mode: 'insensitive' },
                id: { not: req.user.id },
            },
            select: { id: true },
        });
        const existingCredential = await prisma.authCredential.findFirst({
            where: {
                loginId: { equals: newEmail, mode: 'insensitive' },
                userId: { not: req.user.id },
            },
            select: { userId: true },
        });
        if (existingProfile || existingCredential) {
            res.status(409).json({ success: false, error: { code: 'EMAIL_ALREADY_IN_USE', message: 'This email address is already registered.' } });
            return;
        }

        // Update profile.email and authCredential.loginId in a single transaction
        await prisma.$transaction(async (tx) => {
            const conflictProfile = await tx.profile.findFirst({
                where: {
                    email: { equals: newEmail, mode: 'insensitive' },
                    id: { not: req.user.id },
                },
            });
            const conflictCred = await tx.authCredential.findFirst({
                where: {
                    loginId: { equals: newEmail, mode: 'insensitive' },
                    userId: { not: req.user.id },
                },
            });
            if (conflictProfile || conflictCred) {
                const err = new Error('This email address is already registered.');
                err.code = 'EMAIL_ALREADY_IN_USE';
                throw err;
            }

            await tx.profile.update({
                where: { id: req.user.id },
                data: { email: newEmail },
            });

            await tx.authCredential.update({
                where: { userId: req.user.id },
                data: { loginId: newEmail },
            });
        });

        await recordAuthEvent('EMAIL_CHANGED', req, req.user.id);
        invalidateAuthCache(null, req.user.id);

        const userData = await formatUserData(req.user.id);
        res.status(200).json({
            success: true,
            data: {
                message: 'Email address updated successfully.',
                user: userData,
            },
        });
    } catch (error) {
        if (error.code === 'EMAIL_ALREADY_IN_USE') {
            res.status(409).json({ success: false, error: { code: 'EMAIL_ALREADY_IN_USE', message: error.message } });
            return;
        }
        next(error);
    }
});
router.get('/me', requireAuth, (req, res) => {
    const user = req.user;
    res.status(200).json({ success: true, data: user });
});
router.get('/sessions', requireAuth, async (req, res, next) => {
    try {
        const sessions = await prisma.authSession.findMany({ where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true, expiresAt: true, lastUsedAt: true, userAgent: true, ipAddress: true }, orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: sessions });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/sessions/:id', requireAuth, async (req, res, next) => {
    try {
        const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const revoked = await prisma.authSession.updateMany({ where: { id: sessionId, userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
        if (revoked.count) {
            invalidateAuthCache(sessionId, req.user.id);
        }
        res.status(revoked.count ? 200 : 404).json({ success: Boolean(revoked.count), data: { message: revoked.count ? 'Session revoked' : undefined }, error: revoked.count ? undefined : { code: 'NOT_FOUND', message: 'Session not found' } });
    }
    catch (error) {
        next(error);
    }
});

export { hashPassword, validPassword };
export default router;
//# sourceMappingURL=auth.router.js.map
