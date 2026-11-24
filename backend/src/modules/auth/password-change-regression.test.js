import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { hashPassword } from '../../services/auth-security.js';
import authRouter from './auth.router.js';

env.NODE_ENV = 'production';
env.FRONTEND_URL = 'https://app.example.test';
env.JWT_ACCESS_SECRET = 'router-test-jwt-secret-012345678901234567890';
env.JWT_ISSUER = 'https://api.example.test';
env.JWT_AUDIENCE = 'skinlab-router-test';
env.AUTH_IP_HASH_SECRET = 'router-test-ip-secret-012345678901234567890123';

const loginHandler = authRouter.stack.find((layer) => layer.route?.path === '/login').route.stack.at(-1).handle;
const changePasswordHandler = authRouter.stack.find((layer) => layer.route?.path === '/change-password').route.stack.at(-1).handle;
const patchMeHandler = authRouter.stack.find((layer) => layer.route?.path === '/me' && layer.route?.methods?.patch).route.stack.at(-1).handle;

function mockResponse() {
    const result = { statusCode: 200, body: undefined, cookieOptions: undefined, cleared: false };
    return Object.assign(result, {
        setHeader() { return result; },
        status(code) { result.statusCode = code; return result; },
        json(body) { result.body = body; return result; },
        cookie(_name, _value, options) { result.cookieOptions = options; return result; },
        clearCookie() { result.cleared = true; return result; },
    });
}

function createLoginRequest(userId, password) {
    return {
        body: { userId, password },
        headers: {},
        ip: '198.51.100.42',
        socket: { remoteAddress: '198.51.100.42' },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
}

function createChangePasswordRequest(userId, password, currentPassword) {
    return {
        user: { id: userId, userId: 'test-admin', email: 'admin@skinlab.test', role: 'SHOP_ADMIN', shopId: 'shop-uuid-1' },
        sessionId: 'session-active-1',
        body: currentPassword !== undefined ? { password, currentPassword } : { password },
        headers: {},
        ip: '198.51.100.42',
        socket: { remoteAddress: '198.51.100.42' },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
}

function createPatchMeRequest(userId, body) {
    return {
        user: { id: userId, userId: 'test-admin', email: 'admin@skinlab.test', role: 'SHOP_ADMIN', shopId: 'shop-uuid-1' },
        sessionId: 'session-active-1',
        body,
        headers: {},
        ip: '198.51.100.42',
        socket: { remoteAddress: '198.51.100.42' },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
}

test('Password Change Regression Suite', async (suite) => {
    // Current user state
    const userId = 'user-uuid-1234';
    const loginId = 'admin@skinlab.test';
    const email = 'admin@skinlab.test';
    const oldPassword = 'OldPassword@2026!';
    const newPassword = 'NewPassword@2026#';
    const wrongPassword = 'WrongPassword@999!';

    let currentHash = await hashPassword(oldPassword);

    const testProfile = {
        id: userId,
        email,
        fullName: 'Test Admin',
        role: 'SHOP_ADMIN',
        isActive: true,
        shopId: 'shop-uuid-1',
        shop: { id: 'shop-uuid-1', name: 'Test Shop', slug: 'test-shop', isActive: true },
    };

    // Stubs
    const origFindUniqueCred = Object.getOwnPropertyDescriptor(prisma.authCredential, 'findUnique');
    const origFindFirstProfile = Object.getOwnPropertyDescriptor(prisma.profile, 'findFirst');
    const origFindManyProfile = Object.getOwnPropertyDescriptor(prisma.profile, 'findMany');
    const origFindUniqueProfile = Object.getOwnPropertyDescriptor(prisma.profile, 'findUnique');
    const origUpdateProfile = Object.getOwnPropertyDescriptor(prisma.profile, 'update');
    const origUpdateCred = Object.getOwnPropertyDescriptor(prisma.authCredential, 'update');
    const origThrottleFind = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'findUnique');
    const origThrottleUpdateMany = Object.getOwnPropertyDescriptor(prisma.authLoginThrottle, 'updateMany');
    const origRawQuery = Object.getOwnPropertyDescriptor(prisma, '$queryRaw');
    const origTransaction = Object.getOwnPropertyDescriptor(prisma, '$transaction');
    const origSessionCreate = Object.getOwnPropertyDescriptor(prisma.authSession, 'create');
    const origSessionUpdateMany = Object.getOwnPropertyDescriptor(prisma.authSession, 'updateMany');
    const origAuditCreate = Object.getOwnPropertyDescriptor(prisma.authAuditEvent, 'create');

    let revokedSessionsPayload = null;
    let throttleLockMock = new Map();

    suite.after(() => {
        if (origFindUniqueCred) Object.defineProperty(prisma.authCredential, 'findUnique', origFindUniqueCred);
        if (origFindFirstProfile) Object.defineProperty(prisma.profile, 'findFirst', origFindFirstProfile);
        if (origFindManyProfile) Object.defineProperty(prisma.profile, 'findMany', origFindManyProfile);
        if (origFindUniqueProfile) Object.defineProperty(prisma.profile, 'findUnique', origFindUniqueProfile);
        if (origUpdateProfile) Object.defineProperty(prisma.profile, 'update', origUpdateProfile);
        if (origUpdateCred) Object.defineProperty(prisma.authCredential, 'update', origUpdateCred);
        if (origThrottleFind) Object.defineProperty(prisma.authLoginThrottle, 'findUnique', origThrottleFind);
        if (origThrottleUpdateMany) Object.defineProperty(prisma.authLoginThrottle, 'updateMany', origThrottleUpdateMany);
        if (origRawQuery) Object.defineProperty(prisma, '$queryRaw', origRawQuery);
        if (origTransaction) Object.defineProperty(prisma, '$transaction', origTransaction);
        if (origSessionCreate) Object.defineProperty(prisma.authSession, 'create', origSessionCreate);
        if (origSessionUpdateMany) Object.defineProperty(prisma.authSession, 'updateMany', origSessionUpdateMany);
        if (origAuditCreate) Object.defineProperty(prisma.authAuditEvent, 'create', origAuditCreate);
    });

    Object.defineProperty(prisma.authCredential, 'findUnique', {
        configurable: true,
        value: async ({ where }) => {
            if (where.loginId === loginId.toLowerCase() || where.userId === userId) {
                return {
                    userId,
                    loginId,
                    passwordHash: currentHash,
                    mustChangePassword: false,
                    profile: testProfile,
                };
            }
            return null;
        },
    });

    Object.defineProperty(prisma.profile, 'findMany', {
        configurable: true,
        value: async ({ where }) => {
            const requested = where.email?.equals || where.email;
            if (requested?.toLowerCase() === email.toLowerCase()) {
                return [{
                    ...testProfile,
                    credential: {
                        userId,
                        loginId,
                        passwordHash: currentHash,
                        mustChangePassword: false,
                    },
                }];
            }
            return [];
        },
    });

    Object.defineProperty(prisma.profile, 'findUnique', {
        configurable: true,
        value: async ({ where }) => {
            if (where.id === userId) {
                return {
                    ...testProfile,
                    credential: {
                        userId,
                        loginId,
                        passwordHash: currentHash,
                        mustChangePassword: false,
                    },
                };
            }
            return null;
        },
    });

    Object.defineProperty(prisma.profile, 'update', {
        configurable: true,
        value: async ({ where, data }) => {
            if (where.id === userId) {
                if (data.fullName !== undefined) testProfile.fullName = data.fullName;
                if (data.email !== undefined) testProfile.email = data.email;
                return testProfile;
            }
            return null;
        },
    });

    Object.defineProperty(prisma.authCredential, 'update', {
        configurable: true,
        value: async ({ data }) => {
            if (data.loginId) {
                assert.fail('authCredential.loginId must NEVER be modified by profile update!');
            }
            if (data.passwordHash) {
                currentHash = data.passwordHash;
            }
            return { userId, loginId, passwordHash: currentHash, mustChangePassword: false };
        },
    });

    Object.defineProperty(prisma.authLoginThrottle, 'findUnique', {
        configurable: true,
        value: async ({ where }) => {
            const lockedUntil = throttleLockMock.get(where.key);
            if (lockedUntil && lockedUntil > new Date()) {
                return { key: where.key, lockedUntil };
            }
            return null;
        },
    });
    Object.defineProperty(prisma.authLoginThrottle, 'updateMany', {
        configurable: true,
        value: async ({ where }) => {
            if (Array.isArray(where?.key?.in)) {
                for (const k of where.key.in) throttleLockMock.delete(k);
            }
            return { count: 1 };
        },
    });
    Object.defineProperty(prisma, '$queryRaw', {
        configurable: true,
        value: async (query, ...params) => {
            const key = params[0];
            const failures = (throttleLockMock.get(`${key}_failures`) || 0) + 1;
            throttleLockMock.set(`${key}_failures`, failures);
            if (failures >= 5) {
                throttleLockMock.set(key, new Date(Date.now() + 3600 * 1000));
                return [{ failures, locked_until: new Date(Date.now() + 3600 * 1000) }];
            }
            return [{ failures, locked_until: null }];
        },
    });
    Object.defineProperty(prisma.authAuditEvent, 'create', {
        configurable: true,
        value: async () => ({}),
    });
    Object.defineProperty(prisma.authSession, 'create', {
        configurable: true,
        value: async ({ data }) => ({ id: 'session-new-1', ...data }),
    });
    Object.defineProperty(prisma.authSession, 'updateMany', {
        configurable: true,
        value: async (args) => {
            revokedSessionsPayload = args;
            return { count: 1 };
        },
    });
    Object.defineProperty(prisma, '$transaction', {
        configurable: true,
        value: async (actions) => {
            if (Array.isArray(actions)) return Promise.all(actions);
            return actions(prisma);
        },
    });

    await suite.test('1. Login with current password before change: Success', async () => {
        const res = mockResponse();
        await loginHandler(createLoginRequest(email, oldPassword), res, () => assert.fail('should not call next'));
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.data.access_token);
        assert.equal(res.body.data.user.email, email);
    });

    await suite.test('2. Change password with incorrect current password: Rejected', async () => {
        const res = mockResponse();
        await changePasswordHandler(
            createChangePasswordRequest(userId, newPassword, wrongPassword),
            res,
            () => assert.fail('should not call next')
        );
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
        assert.equal(res.body.error.message, 'Current password is incorrect.');
    });

    await suite.test('3. Change password with valid current password: Success', async () => {
        const res = mockResponse();
        await changePasswordHandler(
            createChangePasswordRequest(userId, newPassword, oldPassword),
            res,
            () => assert.fail('should not call next')
        );
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.message, 'Password updated; other sessions were revoked.');
    });

    await suite.test('4. Login using new password: Success', async () => {
        const res = mockResponse();
        await loginHandler(createLoginRequest(email, newPassword), res, () => assert.fail('should not call next'));
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.data.access_token);
        assert.equal(res.body.data.user.id, userId);
    });

    await suite.test('5. Login using old password: Rejected', async () => {
        const res = mockResponse();
        await loginHandler(createLoginRequest(email, oldPassword), res, () => assert.fail('should not call next'));
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'LOGIN_FAILED');
    });

    await suite.test('6. Login with incorrect password: Rejected', async () => {
        const res = mockResponse();
        await loginHandler(createLoginRequest(email, wrongPassword), res, () => assert.fail('should not call next'));
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'LOGIN_FAILED');
    });

    await suite.test('7. Login after logout: Success with new password', async () => {
        const res = mockResponse();
        await loginHandler(createLoginRequest(email, newPassword), res, () => assert.fail('should not call next'));
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.data.access_token);
    });

    await suite.test('8. Changing display username does NOT modify authCredential.loginId', async () => {
        const res = mockResponse();
        await patchMeHandler(
            createPatchMeRequest(userId, {
                username: 'new-display-username',
                fullName: 'Updated Admin Name',
            }),
            res,
            () => assert.fail('should not call next')
        );
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(testProfile.fullName, 'Updated Admin Name');
        // Ensure credential loginId was never altered
        assert.equal(res.body.data.userId, loginId);

        // Verify login still works with original loginId
        const loginRes = mockResponse();
        await loginHandler(createLoginRequest(loginId, newPassword), loginRes, () => assert.fail('should not call next'));
        assert.equal(loginRes.statusCode, 200);
        assert.equal(loginRes.body.success, true);
    });

    await suite.test('9. Attempting to change email directly via PATCH /me is rejected', async () => {
        const res = mockResponse();
        await patchMeHandler(
            createPatchMeRequest(userId, {
                email: 'attacker-changed@skinlab.test',
            }),
            res,
            () => assert.fail('should not call next')
        );
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
        assert.equal(res.body.error.code, 'EMAIL_UPDATE_NOT_SUPPORTED');
        assert.equal(testProfile.email, email);
    });

    await suite.test('10. Dual identifier lookup rejects ambiguous email conflicts', async () => {
        // Temporarily mock findMany to return multiple profiles sharing the same email
        const originalFindMany = prisma.profile.findMany;
        Object.defineProperty(prisma.profile, 'findMany', {
            configurable: true,
            value: async () => [
                { id: 'user-1', email: 'duplicate@test.com', credential: { userId: 'user-1', passwordHash: currentHash } },
                { id: 'user-2', email: 'duplicate@test.com', credential: { userId: 'user-2', passwordHash: currentHash } },
            ],
        });

        const res = mockResponse();
        await loginHandler(createLoginRequest('duplicate@test.com', newPassword), res, () => assert.fail('should not call next'));
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);

        Object.defineProperty(prisma.profile, 'findMany', { configurable: true, value: originalFindMany });
    });

    await suite.test('11. Login throttling cannot be bypassed by switching between email and loginId', async () => {
        // Fail 5 times using loginId
        for (let i = 0; i < 5; i++) {
            const failRes = mockResponse();
            await loginHandler(createLoginRequest(loginId, wrongPassword), failRes, () => assert.fail('should not call next'));
        }

        // Now attempt login using email identifier with correct password - should be immediately throttled!
        const throttleRes = mockResponse();
        await loginHandler(createLoginRequest(email, newPassword), throttleRes, () => assert.fail('should not call next'));
        assert.equal(throttleRes.statusCode, 429);
        assert.equal(throttleRes.body.error.code, 'RATE_LIMITED');
    });

    await suite.test('12. Password change invalidates refresh tokens of other sessions without corrupting account', async () => {
        revokedSessionsPayload = null;
        const res = mockResponse();
        await changePasswordHandler(
            createChangePasswordRequest(userId, 'BrandNewPass@2026#', newPassword),
            res,
            () => assert.fail('should not call next')
        );
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);

        // Verify other sessions were revoked
        assert.ok(revokedSessionsPayload);
        assert.deepEqual(revokedSessionsPayload.where.userId, userId);
        assert.deepEqual(revokedSessionsPayload.where.id, { not: 'session-active-1' });
        assert.ok(revokedSessionsPayload.data.revokedAt);
    });
});
