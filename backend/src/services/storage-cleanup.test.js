import assert from 'node:assert/strict';
import test from 'node:test';
import { enqueueR2Deletion, processPendingR2Cleanup } from './storage-cleanup.js';

function cleanupDatabase() {
    const state = { tasks: [] };
    return {
        state,
        storageCleanupTask: {
            async upsert({ where, create, update }) {
                const task = state.tasks.find((item) => item.operation === where.operation_objectKey.operation && item.objectKey === where.operation_objectKey.objectKey);
                if (task) { Object.assign(task, update); return task; }
                const created = { id: `task-${state.tasks.length}`, attemptCount: 0, status: 'PENDING', nextAttemptAt: new Date(0), ...create };
                state.tasks.push(created); return created;
            },
            async updateMany({ where, data }) {
                const matching = state.tasks.filter((task) => (!where.id || task.id === where.id) && (!where.status || task.status === where.status) && (!where.leaseUntil || task.leaseUntil === null || task.leaseUntil <= where.leaseUntil.lte));
                matching.forEach((task) => Object.assign(task, data)); return { count: matching.length };
            },
            async findMany() { return state.tasks.filter((task) => task.status === 'PENDING').map((task) => ({ ...task })); },
            async delete({ where }) { state.tasks = state.tasks.filter((task) => task.id !== where.id); },
            async update({ where, data }) { const task = state.tasks.find((item) => item.id === where.id); Object.assign(task, data); return task; },
        },
    };
}

test('deduplicates failed cleanup keys and removes tasks only after a successful retry', async () => {
    const db = cleanupDatabase();
    await enqueueR2Deletion(db, 'products/one.png');
    await enqueueR2Deletion(db, 'products/one.png');
    assert.equal(db.state.tasks.length, 1);
    const failedStorage = { async deleteObject() { throw new Error('unavailable'); } };
    await processPendingR2Cleanup({ prisma: db, storage: failedStorage, now: new Date() });
    assert.equal(db.state.tasks.length, 1);
    assert.equal(db.state.tasks[0].status, 'PENDING');
    assert.equal(db.state.tasks[0].attemptCount, 1);
    const workingStorage = { async deleteObject() {} };
    await processPendingR2Cleanup({ prisma: db, storage: workingStorage, now: new Date(Date.now() + 5_000) });
    assert.equal(db.state.tasks.length, 0);
});
