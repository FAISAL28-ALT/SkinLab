const DELETE_OPERATION = 'DELETE_R2_OBJECT';
const MAX_BACKOFF_MS = 60 * 60 * 1000;

function retryAt(attemptCount) {
    return new Date(Date.now() + Math.min(MAX_BACKOFF_MS, 1_000 * (2 ** Math.min(attemptCount, 12))));
}

function safeErrorCode(error) {
    return String(error?.name || 'R2_DELETE_FAILED').slice(0, 80);
}

/** Records a failed R2 delete exactly once per object key, preserving it for retry. */
export async function enqueueR2Deletion(prisma, objectKey) {
    return prisma.storageCleanupTask.upsert({
        where: { operation_objectKey: { operation: DELETE_OPERATION, objectKey } },
        create: { operation: DELETE_OPERATION, objectKey },
        update: { status: 'PENDING', leaseUntil: null, nextAttemptAt: new Date() },
    });
}

/** Safely retries currently due work. A lease prevents concurrent workers from deleting the same key. */
export async function processPendingR2Cleanup({ prisma, storage, limit = 25, now = new Date() }) {
    // A worker crash can leave a lease behind; make expired leases eligible again.
    await prisma.storageCleanupTask.updateMany({
        where: { status: 'PROCESSING', leaseUntil: { lte: now } },
        data: { status: 'PENDING', leaseUntil: null },
    });
    const tasks = await prisma.storageCleanupTask.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: now } }, orderBy: { nextAttemptAt: 'asc' }, take: limit,
    });
    let completed = 0;
    for (const task of tasks) {
        const leaseUntil = new Date(now.getTime() + 60_000);
        const claimed = await prisma.storageCleanupTask.updateMany({
            where: { id: task.id, status: 'PENDING', leaseUntil: null },
            data: { status: 'PROCESSING', leaseUntil },
        });
        if (claimed.count !== 1) continue;
        try {
            await storage.deleteObject(task.objectKey);
            await prisma.storageCleanupTask.delete({ where: { id: task.id } });
            completed += 1;
        }
        catch (error) {
            const attempts = task.attemptCount + 1;
            await prisma.storageCleanupTask.update({ where: { id: task.id }, data: {
                status: 'PENDING', leaseUntil: null, attemptCount: attempts,
                nextAttemptAt: retryAt(attempts), lastErrorCode: safeErrorCode(error),
            } });
            console.error('[R2 cleanup retry failed]', { taskId: task.id, operation: task.operation });
        }
    }
    return { completed };
}
