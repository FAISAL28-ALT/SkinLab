import { createHash, createHmac, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
const ACCESS_TTL_SECONDS = 15 * 60;
// Refreshes rotate the token but never move this absolute deadline.
const SESSION_TTL_MS = 48 * 60 * 60 * 1000;
const jwtKey = () => {
    if (!env.JWT_ACCESS_SECRET || Buffer.byteLength(env.JWT_ACCESS_SECRET) < 32)
        throw new Error('JWT_ACCESS_SECRET must contain at least 32 bytes');
    return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
};
export const sessionLifetimeMs = SESSION_TTL_MS;
export const refreshHash = (token) => createHash('sha256').update(token, 'utf8').digest('hex');
export const throttleHash = (kind, value) => {
    if (!env.AUTH_IP_HASH_SECRET)
        throw new Error('AUTH_IP_HASH_SECRET is required');
    return createHmac('sha256', env.AUTH_IP_HASH_SECRET).update(`${kind}:${value}`).digest('hex');
};
export const newRefreshToken = () => randomBytes(32).toString('base64url');
export function validPassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}
export async function hashPassword(password) {
    return hash(password, { algorithm: 2 /* Algorithm.Argon2id */, memoryCost: 65536, timeCost: 3, parallelism: 1 });
}
export async function verifyPassword(encoded, password) {
    try {
        return await verify(encoded, password);
    }
    catch {
        return false;
    }
}
export async function issueAccessToken(userId, sessionId) {
    return new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(userId).setIssuer(env.JWT_ISSUER).setAudience(env.JWT_AUDIENCE)
        .setIssuedAt().setExpirationTime(`${ACCESS_TTL_SECONDS}s`).sign(jwtKey());
}
export async function verifyAccessToken(token) {
    let payload;
    try {
        ({ payload } = await jwtVerify(token, jwtKey(), {
            algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE,
        }));
    }
    catch {
        throw new Error('INVALID_ACCESS_TOKEN');
    }
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string')
        throw new Error('INVALID_TOKEN_CLAIMS');
    return { userId: payload.sub, sessionId: payload.sid };
}
//# sourceMappingURL=auth-security.js.map
