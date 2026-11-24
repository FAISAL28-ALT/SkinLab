import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requireAuth, optionalAuth } from './middleware/auth.middleware.js';
import { prisma } from './config/database.js';
import authRouter from './modules/auth/auth.router.js';
import shopsRouter from './modules/shops/shops.router.js';
import productsRouter from './modules/products/products.router.js';
import categoriesRouter from './modules/categories/categories.router.js';
import imagesRouter from './modules/images/images.router.js';
import r2TestRouter from './modules/images/r2-test.router.js';
const app = express();
const allowedOrigins = new Set([
    env.FRONTEND_URL,
    ...env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
]);
app.set('trust proxy', env.TRUST_PROXY_HOPS);
// TLS is terminated either here or by the explicitly configured trusted proxy.
// Do not issue redirects for API requests because that could replay request bodies.
app.use((req, res, next) => {
    if (env.NODE_ENV === 'production' && !req.secure) {
        res.status(400).json({ success: false, error: { code: 'HTTPS_REQUIRED', message: 'HTTPS is required' } });
        return;
    }
    next();
});
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin))
            callback(null, true);
        else
            callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Shop-Slug'],
    maxAge: 600,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}
// ── Health Check ──────────────────────────────────────────────────────────────
let cachedDbHealth = null;
let lastDbCheck = 0;
const DB_HEALTH_TTL_MS = 15_000;

async function checkDatabaseHealth() {
    const now = Date.now();
    if (cachedDbHealth !== null && (now - lastDbCheck) < DB_HEALTH_TTL_MS) {
        return cachedDbHealth;
    }
    try {
        const checkPromise = prisma.$queryRaw `SELECT 1`;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 3_000));
        await Promise.race([checkPromise, timeoutPromise]);
        cachedDbHealth = true;
        lastDbCheck = Date.now();
        return true;
    }
    catch (err) {
        cachedDbHealth = false;
        lastDbCheck = Date.now();
        console.error('[Health check database failure]:', err?.message || err);
        return false;
    }
}

// Lightweight liveness check that does not touch the database
app.get('/health/live', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'alive' } });
});

// Full readiness / health check with cached, bounded database verification
app.get(['/health', '/health/ready'], async (_req, res) => {
    const isDbOk = await checkDatabaseHealth();
    if (isDbOk) {
        res.status(200).json({
            success: true,
            data: { server: 'ok', database: 'ok', environment: env.NODE_ENV },
        });
    }
    else {
        res.status(503).json({
            success: false,
            data: { server: 'ok', database: 'error', environment: env.NODE_ENV },
            error: { code: 'DATABASE_UNAVAILABLE', message: 'Database connectivity check failed' },
        });
    }
});
// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api', optionalAuth);
app.use('/api/shops', shopsRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/images', imagesRouter);
// Temporary diagnostics are deliberately unavailable outside local development.
if (env.NODE_ENV === 'development') {
    app.use('/api/r2-test', r2TestRouter);
}
// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    });
});
// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);
export default app;
