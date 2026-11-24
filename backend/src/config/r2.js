import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

// R2 implements the S3 API. Credentials remain in this server-only module.
export const r2Client = new S3Client({
    endpoint: env.R2_ENDPOINT,
    region: 'auto',
    // R2 account endpoints use the bucket as a URL path, not a subdomain.
    forcePathStyle: true,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
});

export default r2Client;
