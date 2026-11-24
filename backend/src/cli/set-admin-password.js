import { prisma } from '../config/database.js';
import { hashPassword, validPassword, verifyPassword } from '../services/auth-security.js';
import { randomBytes } from 'node:crypto';
async function readHidden(label) {
    if (!process.stdin.isTTY || !process.stdin.setRawMode)
        throw new Error('Run this command in an interactive terminal.');
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    return new Promise((resolve, reject) => {
        let value = '';
        const finish = (error) => {
            process.stdin.off('data', onData);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');
            if (error)
                reject(error);
            else
                resolve(value);
        };
        const onData = (chunk) => {
            for (const char of chunk.toString('utf8')) {
                if (char === '\u0003') {
                    finish(new Error('Cancelled.'));
                    return;
                }
                if (char === '\r' || char === '\n') {
                    finish();
                    return;
                }
                if (char === '\u007f' || char === '\b')
                    value = value.slice(0, -1);
                else if (char >= ' ')
                    value += char;
            }
        };
        process.stdin.on('data', onData);
    });
}
const [profileId, rawLoginId, option] = process.argv.slice(2);
if (!profileId || !rawLoginId)
    throw new Error('Usage: npm run auth:set-admin-password -- <existing-profile-uuid> <login-id> [--generate]');
if (option && option !== '--generate')
    throw new Error('The only supported option is --generate.');
const loginId = rawLoginId.trim().toLowerCase();
if (!/^[a-z0-9._@+-]{3,80}$/.test(loginId))
    throw new Error('Login ID must be 3–80 characters and use letters, numbers, dot, underscore, @, +, or hyphen.');
const password = option === '--generate'
    ? randomBytes(32).toString('base64url')
    : await readHidden('New Admin password (input hidden): ');
if (!validPassword(password))
    throw new Error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.');
try {
    const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true, role: true, credential: { select: { loginId: true } } } });
    if (!profile)
        throw new Error('The supplied profile was not found.');
    if (!profile.credential)
        throw new Error('The supplied administrator does not have application credentials.');
    if (profile.credential.loginId !== loginId)
        throw new Error('The supplied login ID does not match the existing administrator credential.');
    const passwordHash = await hashPassword(password);
    if (!await verifyPassword(passwordHash, password))
        throw new Error('Password hash verification failed; credentials were not updated.');
    await prisma.authCredential.update({ where: { userId: profile.id }, data: { passwordHash, mustChangePassword: true } });
    if (option === '--generate')
        process.stdout.write(`Temporary Admin password (shown once; save securely): ${password}\n`);
    process.stdout.write('Admin password updated. The existing profile, role, login ID, and sessions were preserved; a password change is required at next login.\n');
}
finally {
    await prisma.$disconnect();
}
//# sourceMappingURL=set-admin-password.js.map
