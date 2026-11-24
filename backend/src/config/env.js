import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Load the backend's own environment file regardless of the process working directory.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
export const env = {
    NODE_ENV: (process.env.NODE_ENV ?? 'development'),
    PORT: parseInt(process.env.PORT ?? '5000', 10),
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    DIRECT_URL: process.env.DIRECT_URL ?? '',
    AUTH_IP_HASH_SECRET: process.env.AUTH_IP_HASH_SECRET ?? '',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? '',
    JWT_ISSUER: process.env.JWT_ISSUER ?? '',
    JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? '',
    INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? '',
    INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD ?? '',
    CORS_ORIGINS: process.env.CORS_ORIGINS ?? '',
    FRONTEND_URL: process.env.FRONTEND_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'),
    TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS !== undefined
        ? Math.max(0, Number.parseInt(process.env.TRUST_PROXY_HOPS, 10) || 0)
        : (process.env.NODE_ENV === 'production' && process.env.RENDER ? 1 : 0),
    // Cloudflare R2 (server-side only)
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ?? '',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? '',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?? '',
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ?? '',
    R2_ENDPOINT: process.env.R2_ENDPOINT ?? '',
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL ?? '',
};
export function validateAuthEnvironment() {
    const missing = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE', 'AUTH_IP_HASH_SECRET', 'FRONTEND_URL']
        .filter((key) => !String(env[key] ?? ''));
    if (missing.length)
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    if (Buffer.byteLength(env.JWT_ACCESS_SECRET) < 32 || Buffer.byteLength(env.AUTH_IP_HASH_SECRET) < 32) {
        throw new Error('JWT_ACCESS_SECRET and AUTH_IP_HASH_SECRET must each contain at least 32 bytes');
    }
    if (env.JWT_ACCESS_SECRET === env.AUTH_IP_HASH_SECRET)
        throw new Error('JWT_ACCESS_SECRET and AUTH_IP_HASH_SECRET must be different secrets');
    try {
        const frontend = new URL(env.FRONTEND_URL);
        if (frontend.origin !== env.FRONTEND_URL)
            throw new Error('FRONTEND_URL must be an origin without a path');
        if (env.NODE_ENV === 'production' && frontend.protocol !== 'https:')
            throw new Error('FRONTEND_URL must use HTTPS in production');
        for (const origin of env.CORS_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)) {
            const parsed = new URL(origin);
            if (parsed.origin !== origin)
                throw new Error('CORS_ORIGINS entries must be origins without a path');
        }
    }
    catch {
        throw new Error('FRONTEND_URL and CORS_ORIGINS must contain valid origins');
    }
}
export function validateR2Environment() {
    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_ENDPOINT', 'R2_PUBLIC_BASE_URL'];
    const missing = required.filter((key) => !String(env[key] ?? '').trim());
    if (missing.length) {
        throw new Error(`Missing required R2 environment variables: ${missing.join(', ')}`);
    }
    try {
        const endpoint = new URL(env.R2_ENDPOINT);
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
            throw new Error('invalid endpoint');
        }
    }
    catch {
        throw new Error('R2_ENDPOINT must be an HTTPS account endpoint without a path, query, or credentials');
    }
    try {
        const publicBaseUrl = new URL(env.R2_PUBLIC_BASE_URL);
        if (publicBaseUrl.protocol !== 'https:' || publicBaseUrl.username || publicBaseUrl.password || publicBaseUrl.pathname !== '/' || publicBaseUrl.search || publicBaseUrl.hash) {
            throw new Error('invalid public URL');
        }
    }
    catch {
        throw new Error('R2_PUBLIC_BASE_URL must be an HTTPS public origin without a path, query, or credentials');
    }
}
export default env;
//# sourceMappingURL=env.js.map
