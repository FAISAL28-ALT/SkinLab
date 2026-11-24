import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { issueAccessToken, sessionLifetimeMs } from '../src/services/auth-security.js';

async function testIdempotency() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[Idempotency Test] Server listening on ${baseUrl}`);

  // Find or create test shop and admin user
  const shop = await prisma.shop.findFirst();
  if (!shop) throw new Error('No shop found');
  const user = await prisma.profile.findFirst({
    where: { role: 'SHOP_ADMIN', shopId: shop.id }
  });
  if (!user) throw new Error('No SHOP_ADMIN found');

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs);

  // Create a valid session in DB for requireAuth
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: 'idempotency-test-token-hash-12345678901234567890123456789012',
      userAgent: 'IdempotencyTester/1.0',
      ipAddress: '127.0.0.1',
      createdAt,
      expiresAt,
    }
  });

  const token = await issueAccessToken(user.id, session.id);

  const category = await prisma.category.findFirst({ where: { shopId: shop.id } });
  if (!category) throw new Error('No category found');

  const idempotencyKey = 'test-key-' + Date.now();
  const productPayload = {
    title: 'Idempotency Test Product ' + Date.now(),
    categoryId: category.id,
    designNumber: '998',
    description: 'This is a test description for idempotency validation',
    price: 19.99,
    status: 'DRAFT',
  };

  console.log('Sending Request 1 with Idempotency-Key:', idempotencyKey);
  const res1 = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(productPayload),
  });
  const data1 = await res1.json();
  console.log('Request 1 Status:', res1.status, 'Product ID:', data1.data?.id);

  console.log('Sending Request 2 (Duplicate) with identical payload and Idempotency-Key:', idempotencyKey);
  const res2 = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(productPayload),
  });
  const data2 = await res2.json();
  console.log('Request 2 Status:', res2.status, 'Product ID:', data2.data?.id, 'Error:', data2.error);

  // Check how many products were created with designNumber '998'
  const createdProducts = await prisma.product.findMany({
    where: { shopId: shop.id, designNumber: '998' }
  });
  console.log('Total products created with designNumber 998:', createdProducts.length);

  // Cleanup
  await prisma.product.deleteMany({ where: { shopId: shop.id, designNumber: '998' } });
  await prisma.authSession.delete({ where: { id: session.id } });
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();

  if (createdProducts.length > 1) {
    console.log('RESULT: IDEMPOTENCY_FAILED: Duplicate product was created because backend does not store/check Idempotency-Key.');
  } else if (res2.status >= 400 && data2.error) {
    console.log('RESULT: IDEMPOTENCY_FAILED_ON_ERROR: Request 2 failed with error (e.g. unique constraint or slug collision) instead of returning cached response.');
  } else if (data1.data?.id === data2.data?.id) {
    console.log('RESULT: IDEMPOTENCY_PASSED: Returned original response with single product created.');
  }
}

testIdempotency().catch((err) => {
  console.error(err);
  process.exit(1);
});
