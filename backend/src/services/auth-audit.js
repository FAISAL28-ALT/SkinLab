import { createHmac } from 'node:crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
export async function recordAuthEvent(action, req, userId) {
    const ip = req.ip || req.socket?.remoteAddress;
    const ipHash = ip && env.AUTH_IP_HASH_SECRET
        ? createHmac('sha256', env.AUTH_IP_HASH_SECRET).update(ip).digest('hex')
        : null;
    try {
        await prisma.authAuditEvent.create({ data: { action, userId, ipHash } });
    }
    catch {
        // Do not log request bodies, bearer tokens, raw IPs, or provider error payloads.
        console.error('[auth-audit] Unable to persist authentication audit event');
    }
}
//# sourceMappingURL=auth-audit.js.map