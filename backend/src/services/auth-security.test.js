import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { decodeJwt, SignJWT } from 'jose';
import { hashPassword, newRefreshToken, refreshHash, sessionLifetimeMs, validPassword, verifyAccessToken, verifyPassword } from './auth-security.js';
env.JWT_ACCESS_SECRET = 'test-secret-'.padEnd(48, 'x');
env.JWT_ISSUER = 'skinlab-test';
env.JWT_AUDIENCE = 'skinlab-tests';
test('enforces password strength rules', () => {
    assert.equal(validPassword('StrongPass1!'), true);
    for (const weak of ['Short1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumber!!', 'NoSpecial1'])
        assert.equal(validPassword(weak), false);
});
test('hashes and verifies passwords with Argon2id', async () => {
    const encoded = await hashPassword('StrongPass1!');
    assert.match(encoded, /^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    assert.equal(await verifyPassword(encoded, 'StrongPass1!'), true);
    assert.equal(await verifyPassword(encoded, 'WrongPass1!'), false);
    assert.match(2 /* Algorithm.Argon2id */.toString(), /2/i);
});
test('creates cryptographic refresh values and an absolute 48-hour lifetime', () => {
    const token = newRefreshToken();
    assert.equal(Buffer.from(token, 'base64url').byteLength, 32);
    assert.equal(refreshHash(token), refreshHash(token));
    assert.notEqual(refreshHash(token), token);
    assert.equal(sessionLifetimeMs, 172_800_000);
});
test('JWT verification rejects expired tokens and wrong claims', async () => {
    const key = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
    const expired = await new SignJWT({ sid: 'session-1' }).setProtectedHeader({ alg: 'HS256' }).setSubject('user-1').setIssuer(env.JWT_ISSUER).setAudience(env.JWT_AUDIENCE).setIssuedAt(Math.floor(Date.now() / 1000) - 1000).setExpirationTime(Math.floor(Date.now() / 1000) - 1).sign(key);
    await assert.rejects(verifyAccessToken(expired));
    const wrongAudience = await new SignJWT({ sid: 'session-1' }).setProtectedHeader({ alg: 'HS256' }).setSubject('user-1').setIssuer(env.JWT_ISSUER).setAudience('other-app').setIssuedAt().setExpirationTime('15m').sign(key);
    await assert.rejects(verifyAccessToken(wrongAudience));
    const forged = await new SignJWT({ sid: 'session-1' }).setProtectedHeader({ alg: 'HS256' }).setSubject('user-1').setIssuer(env.JWT_ISSUER).setAudience(env.JWT_AUDIENCE).setIssuedAt().setExpirationTime('15m').sign(new TextEncoder().encode('wrong-key'.padEnd(48, 'y')));
    await assert.rejects(verifyAccessToken(forged));
});
test('issues 15-minute access tokens with issuer, audience, subject, and session claims', async () => {
    const token = await (await import('./auth-security.js')).issueAccessToken('user-1', 'session-1');
    const payload = decodeJwt(token);
    assert.equal(payload.sub, 'user-1');
    assert.equal(payload.sid, 'session-1');
    assert.equal(payload.iss, env.JWT_ISSUER);
    assert.equal(payload.aud, env.JWT_AUDIENCE);
    assert.equal((payload.exp ?? 0) - (payload.iat ?? 0), 900);
});
//# sourceMappingURL=auth-security.test.js.map
