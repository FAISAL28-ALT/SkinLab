import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import authRouter from './auth.router.js';
import { hashPassword } from '../../services/auth-security.js';

env.NODE_ENV = 'production';
env.FRONTEND_URL = 'https://app.example.test';
env.JWT_ACCESS_SECRET = 'router-test-jwt-secret-012345678901234567890';
env.JWT_ISSUER = 'https://api.example.test';
env.JWT_AUDIENCE = 'skinlab-router-test';

const patchMeHandler = authRouter.stack.find((l) => l.route?.path === '/me' && l.route?.methods?.patch).route.stack.at(-1).handle;
const checkEmailHandler = authRouter.stack.find((l) => l.route?.path === '/check-email').route.stack.at(-1).handle;
const changeEmailHandler = authRouter.stack.find((l) => l.route?.path === '/change-email' && l.route?.methods?.post).route.stack.at(-1).handle;
const loginHandler = authRouter.stack.find((l) => l.route?.path === '/login').route.stack.at(-1).handle;

function mockRes() {
    const res = { statusCode: 200, body: undefined, headers: {}, cookieOptions: undefined };
    return Object.assign(res, {
        setHeader(name, value) { res.headers[name] = value; return res; },
        status(code) { res.statusCode = code; return res; },
        json(body) { res.body = body; return res; },
        cookie(_name, _value, options) { res.cookieOptions = options; return res; },
    });
}

function mockReq(user, body = {}, query = {}) {
    return {
        user,
        body,
        query,
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {},
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
}

test('disallows direct email modification through PATCH /api/auth/me', async (t) => {
    const origFindUnique = prisma.profile.findUnique;
    t.after(() => { prisma.profile.findUnique = origFindUnique; });

    prisma.profile.findUnique = async () => ({
        id: 'user-1',
        email: 'current@example.com',
        fullName: 'Test User',
    });

    const req = mockReq({ id: 'user-1', email: 'current@example.com' }, { email: 'new@example.com' });
    const res = mockRes();
    await patchMeHandler(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'EMAIL_UPDATE_NOT_SUPPORTED');
});

test('check-email identifies current email, existing profile/credential, and available email', async (t) => {
    const origProfileFind = prisma.profile.findFirst;
    const origCredFind = prisma.authCredential.findFirst;
    t.after(() => {
        prisma.profile.findFirst = origProfileFind;
        prisma.authCredential.findFirst = origCredFind;
    });

    // 1. Current user email
    const req1 = mockReq({ id: 'user-1', email: 'current@example.com' }, {}, { email: 'current@example.com' });
    const res1 = mockRes();
    await checkEmailHandler(req1, res1, () => {});
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.data.available, false);
    assert.equal(res1.body.data.reason, 'CURRENT_EMAIL');

    // 2. Already registered email
    prisma.profile.findFirst = async () => ({ id: 'other-user' });
    prisma.authCredential.findFirst = async () => null;

    const req2 = mockReq({ id: 'user-1', email: 'current@example.com' }, {}, { email: 'taken@example.com' });
    const res2 = mockRes();
    await checkEmailHandler(req2, res2, () => {});
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.data.available, false);
    assert.equal(res2.body.data.reason, 'ALREADY_REGISTERED');

    // 3. Available email
    prisma.profile.findFirst = async () => null;
    prisma.authCredential.findFirst = async () => null;

    const req3 = mockReq({ id: 'user-1', email: 'current@example.com' }, {}, { email: 'available@example.com' });
    const res3 = mockRes();
    await checkEmailHandler(req3, res3, () => {});
    assert.equal(res3.statusCode, 200);
    assert.equal(res3.body.data.available, true);
});

test('POST /change-email validates email format and rejects same email as current', async (t) => {
    const origProfileFindUnique = prisma.profile.findUnique;
    const origCredFindUnique = prisma.authCredential.findUnique;
    t.after(() => {
        prisma.profile.findUnique = origProfileFindUnique;
        prisma.authCredential.findUnique = origCredFindUnique;
    });

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    prisma.authCredential.findUnique = async () => ({
        userId: 'user-1',
        loginId: 'current@example.com',
        passwordHash,
    });
    prisma.profile.findUnique = async () => ({
        id: 'user-1',
        email: 'current@example.com',
    });

    // 1. Invalid email format
    const req1 = mockReq({ id: 'user-1', email: 'current@example.com' }, { newEmail: 'not-an-email', currentPassword: testPassword });
    const res1 = mockRes();
    await changeEmailHandler(req1, res1, () => {});
    assert.equal(res1.statusCode, 400);
    assert.equal(res1.body.error.code, 'INVALID_REQUEST');

    // 2. Same email as current
    const req2 = mockReq({ id: 'user-1', email: 'current@example.com' }, { newEmail: 'current@example.com', currentPassword: testPassword });
    const res2 = mockRes();
    await changeEmailHandler(req2, res2, () => {});
    assert.equal(res2.statusCode, 400);
    assert.equal(res2.body.error.code, 'SAME_EMAIL');
});

test('POST /change-email requires correct current password', async (t) => {
    const origCredFindUnique = prisma.authCredential.findUnique;
    t.after(() => { prisma.authCredential.findUnique = origCredFindUnique; });

    const passwordHash = await hashPassword('CorrectPassword1!');
    prisma.authCredential.findUnique = async () => ({
        userId: 'user-1',
        loginId: 'current@example.com',
        passwordHash,
    });

    const req = mockReq({ id: 'user-1', email: 'current@example.com' }, { newEmail: 'new@example.com', currentPassword: 'WrongPassword1!' });
    const res = mockRes();
    await changeEmailHandler(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('POST /change-email rejects duplicate emails already registered', async (t) => {
    const origProfileFindUnique = prisma.profile.findUnique;
    const origCredFindUnique = prisma.authCredential.findUnique;
    const origProfileFindFirst = prisma.profile.findFirst;
    const origCredFindFirst = prisma.authCredential.findFirst;
    t.after(() => {
        prisma.profile.findUnique = origProfileFindUnique;
        prisma.authCredential.findUnique = origCredFindUnique;
        prisma.profile.findFirst = origProfileFindFirst;
        prisma.authCredential.findFirst = origCredFindFirst;
    });

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    prisma.authCredential.findUnique = async () => ({
        userId: 'user-1',
        loginId: 'current@example.com',
        passwordHash,
    });
    prisma.profile.findUnique = async () => ({
        id: 'user-1',
        email: 'current@example.com',
    });
    prisma.profile.findFirst = async () => ({ id: 'other-user' });
    prisma.authCredential.findFirst = async () => null;

    const req = mockReq({ id: 'user-1', email: 'current@example.com' }, { newEmail: 'taken@example.com', currentPassword: testPassword });
    const res = mockRes();
    await changeEmailHandler(req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error.code, 'EMAIL_ALREADY_IN_USE');
});

test('POST /change-email updates profile.email and authCredential.loginId in single transaction and preserves password', async (t) => {
    const origProfileFindUnique = prisma.profile.findUnique;
    const origCredFindUnique = prisma.authCredential.findUnique;
    const origProfileFindFirst = prisma.profile.findFirst;
    const origCredFindFirst = prisma.authCredential.findFirst;
    const origTransaction = prisma.$transaction;
    const origAuditEvent = prisma.authAuditEvent;
    t.after(() => {
        prisma.profile.findUnique = origProfileFindUnique;
        prisma.authCredential.findUnique = origCredFindUnique;
        prisma.profile.findFirst = origProfileFindFirst;
        prisma.authCredential.findFirst = origCredFindFirst;
        prisma.$transaction = origTransaction;
        prisma.authAuditEvent = origAuditEvent;
    });

    const testPassword = 'Password123!';
    const existingPasswordHash = await hashPassword(testPassword);

    prisma.authCredential.findUnique = async () => ({
        userId: 'user-1',
        loginId: 'current@example.com',
        passwordHash: existingPasswordHash,
    });
    prisma.profile.findFirst = async () => null;
    prisma.authCredential.findFirst = async () => null;

    let transactionExecuted = false;
    let updatedProfileEmail = null;
    let updatedCredentialLoginId = null;

    prisma.$transaction = async (fn) => {
        transactionExecuted = true;
        return fn({
            profile: {
                findFirst: async () => null,
                update: async ({ data }) => { updatedProfileEmail = data.email; return {}; },
            },
            authCredential: {
                findFirst: async () => null,
                update: async ({ data }) => { updatedCredentialLoginId = data.loginId; return {}; },
            },
        });
    };

    let auditLogged = null;
    prisma.authAuditEvent = {
        create: async ({ data }) => { auditLogged = data; return data; },
    };

    prisma.profile.findUnique = async ({ where }) => {
        if (where.id === 'user-1') {
            return {
                id: 'user-1',
                email: updatedProfileEmail || 'current@example.com',
                fullName: 'Test User',
                role: 'SHOP_ADMIN',
                shopId: 'shop-1',
                shop: { id: 'shop-1', name: 'SkinLab Official', slug: 'skinlab-official', logoUrl: null, isActive: true },
                credential: { loginId: updatedCredentialLoginId || 'current@example.com', mustChangePassword: false },
            };
        }
        return null;
    };

    const req = mockReq({ id: 'user-1', email: 'current@example.com' }, { newEmail: 'newemail@example.com', currentPassword: testPassword });
    const res = mockRes();
    await changeEmailHandler(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(transactionExecuted, true);
    assert.equal(updatedProfileEmail, 'newemail@example.com');
    assert.equal(updatedCredentialLoginId, 'newemail@example.com');
    assert.equal(res.body.data.user.email, 'newemail@example.com');
    assert.equal(res.body.data.user.userId, 'newemail@example.com');
    assert.ok(auditLogged);
    assert.equal(auditLogged.action, 'EMAIL_CHANGED');
});

test('login compatibility: new email logs in successfully with existing password, old email fails', async (t) => {
    const origCredFindUnique = prisma.authCredential.findUnique;
    const origProfileFindMany = prisma.profile.findMany;
    const origSessionCreate = prisma.authSession.create;
    const origThrottleRaw = prisma.$queryRaw;
    const origThrottleFind = prisma.authLoginThrottle.findUnique;
    const origThrottleUpdate = prisma.authLoginThrottle.update;
    const origThrottleUpdateMany = prisma.authLoginThrottle.updateMany;
    const origAuditCreate = prisma.authAuditEvent.create;

    t.after(() => {
        prisma.authCredential.findUnique = origCredFindUnique;
        prisma.profile.findMany = origProfileFindMany;
        prisma.authSession.create = origSessionCreate;
        prisma.$queryRaw = origThrottleRaw;
        prisma.authLoginThrottle.findUnique = origThrottleFind;
        prisma.authLoginThrottle.update = origThrottleUpdate;
        prisma.authLoginThrottle.updateMany = origThrottleUpdateMany;
        prisma.authAuditEvent.create = origAuditCreate;
    });

    const existingPassword = 'MySecretPassword1!';
    const passwordHash = await hashPassword(existingPassword);

    prisma.authLoginThrottle.findUnique = async () => null;
    prisma.authLoginThrottle.updateMany = async () => ({ count: 1 });
    prisma.$queryRaw = async () => [{ failures: 0, locked_until: null }];
    prisma.authSession.create = async () => ({ id: 'session-new' });
    prisma.authAuditEvent.create = async () => ({});

    // Simulated account state after email change:
    // profile.email = 'newemail@example.com', credential.loginId = 'newemail@example.com'
    const accountCredential = {
        userId: 'user-1',
        loginId: 'newemail@example.com',
        passwordHash,
        mustChangePassword: false,
        profile: {
            id: 'user-1',
            email: 'newemail@example.com',
            fullName: 'Test User',
            role: 'SHOP_ADMIN',
            isActive: true,
            shopId: 'shop-1',
            shop: { id: 'shop-1', name: 'Official', slug: 'skinlab-official', logoUrl: null, isActive: true },
        },
    };

    prisma.authCredential.findUnique = async ({ where }) => {
        if (where.loginId === 'newemail@example.com') {
            return accountCredential;
        }
        return null;
    };
    prisma.profile.findMany = async ({ where }) => {
        if (where.email?.equals === 'newemail@example.com') {
            return [accountCredential.profile];
        }
        return [];
    };

    // 1. Login with old email fails
    const reqOld = {
        body: { userId: 'oldemail@example.com', password: existingPassword },
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
    const resOld = mockRes();
    await loginHandler(reqOld, resOld, () => {});
    assert.equal(resOld.statusCode, 401);
    assert.equal(resOld.body.error.code, 'LOGIN_FAILED');

    // 2. Login with new email + existing password succeeds
    const reqNew = {
        body: { userId: 'newemail@example.com', password: existingPassword },
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        get(name) { return name.toLowerCase() === 'origin' ? env.FRONTEND_URL : undefined; },
    };
    const resNew = mockRes();
    await loginHandler(reqNew, resNew, () => {});
    assert.equal(resNew.statusCode, 200);
    assert.equal(resNew.body.success, true);
    assert.equal(resNew.body.data.user.email, 'newemail@example.com');
    assert.equal(resNew.body.data.user.userId, 'newemail@example.com');
});
