import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { issueAccessToken, sessionLifetimeMs } from '../src/services/auth-security.js';

async function testCacheInvalidation() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[Cache Invalidation Test] Listening on ${baseUrl}`);

  const shop = await prisma.shop.findFirst();
  const user = await prisma.profile.findFirst({ where: { role: 'SHOP_ADMIN', shopId: shop.id } });
  const category = await prisma.category.findFirst({ where: { shopId: shop.id } });

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs);
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: 'cache-test-token-hash-12345678901234567890123456789012',
      userAgent: 'CacheTester/1.0',
      ipAddress: '127.0.0.1',
      createdAt,
      expiresAt,
    }
  });

  const adminToken = await issueAccessToken(user.id, session.id);
  const results = [];

  try {
    // 1. Initial public catalogue fetch (populates cache)
    const initRes = await fetch(`${baseUrl}/api/products`);
    const initData = await initRes.json();
    const initialCount = initData.pagination?.total ?? initData.data?.length ?? 0;

    // 2. Create product (PUBLISHED)
    const newDesignNum = '888';
    const createRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Cache Invalidation Test Skin',
        categoryId: category.id,
        designNumber: newDesignNum,
        description: 'Testing cache invalidation on write operations',
        status: 'PUBLISHED',
        price: 29.99,
      }),
    });
    const createdJson = await createRes.json();
    const createdProduct = createdJson.data;
    if (!createdProduct?.id) throw new Error('Product creation failed: ' + JSON.stringify(createdJson));

    // Verify public catalogue immediately reflects new product (cache was invalidated)
    const postCreateRes = await fetch(`${baseUrl}/api/products`);
    const postCreateData = await postCreateRes.json();
    const postCreateCount = postCreateData.pagination?.total ?? 0;
    const foundInList = postCreateData.data?.some((p) => p.id === createdProduct.id);

    results.push({
      test: 'Create product invalidates public list cache',
      passed: postCreateCount === initialCount + 1 && foundInList,
      details: { initialCount, postCreateCount, foundInList },
    });

    // 3. Fetch product detail (populates detail cache)
    const detailRes1 = await fetch(`${baseUrl}/api/products/${createdProduct.id}`);
    const detailData1 = await detailRes1.json();
    const initialTitle = detailData1.data?.title;

    // 4. Update product title
    const updateRes = await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Updated Title For Cache Test',
      }),
    });
    const updateJson = await updateRes.json();

    // Verify detail immediately returns updated title
    const detailRes2 = await fetch(`${baseUrl}/api/products/${createdProduct.id}`);
    const detailData2 = await detailRes2.json();
    const updatedTitle = detailData2.data?.title;

    results.push({
      test: 'Update product invalidates detail cache',
      passed: updatedTitle === 'Updated Title For Cache Test',
      details: { initialTitle, updatedTitle },
    });

    // 5. Create a DRAFT product and verify it is NEVER visible in public catalog
    const draftRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Private Admin Draft Skin',
        categoryId: category.id,
        designNumber: '889',
        description: 'Should never be in public cache',
        status: 'DRAFT',
        price: 39.99,
      }),
    });
    const draftJson = await draftRes.json();
    const draftProduct = draftJson.data;

    const publicAfterDraft = await fetch(`${baseUrl}/api/products`);
    const publicAfterDraftData = await publicAfterDraft.json();
    const draftInPublic = publicAfterDraftData.data?.some((p) => p.id === draftProduct.id);

    const publicDetailDraft = await fetch(`${baseUrl}/api/products/${draftProduct.id}`);

    results.push({
      test: 'Draft/Admin products are excluded from public catalog and return 404 on public detail',
      passed: !draftInPublic && publicDetailDraft.status === 404,
      details: { draftInPublic, publicDetailStatus: publicDetailDraft.status },
    });

    // 6. Delete products and verify public catalogue reflects deletion
    await fetch(`${baseUrl}/api/products/${createdProduct.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    await fetch(`${baseUrl}/api/products/${draftProduct.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    const publicAfterDelete = await fetch(`${baseUrl}/api/products`);
    const publicAfterDeleteData = await publicAfterDelete.json();
    const foundAfterDelete = publicAfterDeleteData.data?.some((p) => p.id === createdProduct.id);
    const detailAfterDelete = await fetch(`${baseUrl}/api/products/${createdProduct.id}`);

    results.push({
      test: 'Delete product invalidates list and detail caches',
      passed: !foundAfterDelete && detailAfterDelete.status === 404,
      details: { foundAfterDelete, detailStatus: detailAfterDelete.status },
    });

  } finally {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  console.log('=== CACHE INVALIDATION RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
}

testCacheInvalidation().catch((err) => {
  console.error(err);
  process.exit(1);
});
