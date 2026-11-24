import { prisma } from '../config/database.js';
import { r2Storage } from '../services/r2-storage.js';
import { processPendingR2Cleanup } from '../services/storage-cleanup.js';

try {
    const { completed } = await processPendingR2Cleanup({ prisma, storage: r2Storage });
    console.log(`R2 cleanup run completed: ${completed} object(s) removed.`);
}
finally {
    await prisma.$disconnect();
}
