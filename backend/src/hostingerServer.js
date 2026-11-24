import express from 'express';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { env, validateAuthEnvironment, validateR2Environment } from './config/env.js';
import { prisma } from './config/database.js';

validateAuthEnvironment();
validateR2Environment();

const frontendDirectory = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
const indexHtml = join(frontendDirectory, 'index.html');

const website = express();

// Forward API and health check requests to the Express application
website.use((req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/health/')) {
        return app(req, res, next);
    }
    next();
});

// Serve frontend static assets (CSS, JS, images)
website.use(express.static(frontendDirectory, { index: false, dotfiles: 'deny' }));

// SPA fallback for client-side routing
website.get('*', (req, res, next) => {
    if (extname(req.path) || !req.accepts('html')) {
        return next();
    }
    if (existsSync(indexHtml)) {
        res.set('Cache-Control', 'no-cache').sendFile(indexHtml);
    } else {
        res.status(503).send('Frontend build not ready. Please run build.');
    }
});

// 404 handler for missing static assets or unmatched paths
website.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

// Pre-connect database pool
void prisma.$connect()
    .then(() => console.log('   Database: Pre-connected and connection pool warmed'))
    .catch((err) => console.error('   Database connection initialization warning:', err.message));

const port = process.env.PORT || env.PORT || 5000;
const server = website.listen(port, () => {
    console.log(`\nSkinLab Fullstack server running on port ${port}`);
    console.log(`   Frontend: ${frontendDirectory}`);
    console.log(`   API: /api`);
    console.log(`   Health check: /health\n`);
});

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

export default website;
