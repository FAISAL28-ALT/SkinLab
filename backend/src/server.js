import app from './app.js';
import { env } from './config/env.js';
import { validateAuthEnvironment, validateR2Environment } from './config/env.js';
import { prisma } from './config/database.js';

validateAuthEnvironment();
validateR2Environment();

// Pre-warm database connection pool at startup to eliminate cold-start latency on authentication
void prisma.$connect()
    .then(() => console.log('   Database: Pre-connected and connection pool warmed'))
    .catch((err) => console.error('   Database connection initialization warning:', err.message));

const server = app.listen(env.PORT, () => {
    console.log(`\nSkinLab API running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${env.PORT}/health\n`);
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
