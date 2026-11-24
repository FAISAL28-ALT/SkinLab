import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        // Never emit query parameters: authentication writes include credential hashes.
        log: ['error'],
    });
if (env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
export default prisma;
//# sourceMappingURL=database.js.map