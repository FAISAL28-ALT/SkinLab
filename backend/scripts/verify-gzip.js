import express from 'express';
import http from 'node:http';
import zlib from 'node:zlib';
import { gzipCompression } from '../src/middleware/compression.middleware.js';

async function verifyGzip() {
  const testApp = express();
  testApp.use(gzipCompression);

  // 1. GET large response (>1024 B)
  testApp.get('/large', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ message: 'A'.repeat(5000) });
  });

  // 2. GET small response (<1024 B)
  testApp.get('/small', (_req, res) => {
    res.json({ message: 'small' });
  });

  // 3. Empty response (204)
  testApp.get('/empty', (_req, res) => {
    res.status(204).end();
  });

  // 4. Error response (400, 500)
  testApp.get('/error-400', (_req, res) => {
    res.status(400).json({ error: 'A'.repeat(3000) });
  });

  testApp.get('/error-500', (_req, res) => {
    res.status(500).json({ error: 'A'.repeat(3000) });
  });

  // 5. Pre-compressed response
  testApp.get('/pre-compressed', (_req, res) => {
    const raw = Buffer.from(JSON.stringify({ message: 'precompressed ' + 'X'.repeat(3000) }));
    zlib.gzip(raw, (_err, gzipped) => {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json');
      res.send(gzipped);
    });
  });

  // 6. HEAD request
  testApp.head('/large-head', (_req, res) => {
    res.json({ message: 'A'.repeat(5000) });
  });

  // 7. Streaming response via res.write
  testApp.get('/stream', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.write('chunk 1 ');
    res.write('chunk 2');
    res.end();
  });

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[Gzip Verification] Server on ${baseUrl}`);

  const testResults = [];

  // Helper using raw http.request to inspect headers and bytes without automatic client decompression
  function requestRaw(path, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}${path}`, options, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            size: body.length,
          });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  // Test 1: GET Large JSON with gzip
  {
    const res = await requestRaw('/large', { headers: { 'Accept-Encoding': 'gzip' } });
    const isGzipped = res.headers['content-encoding'] === 'gzip';
    const hasVary = res.headers['vary']?.includes('Accept-Encoding');
    const cl = parseInt(res.headers['content-length'], 10);
    const uncompressed = zlib.gunzipSync(res.body).toString('utf-8');
    const parsed = JSON.parse(uncompressed);
    const valid = isGzipped && hasVary && cl === res.size && parsed.message.length === 5000;
    testResults.push({
      test: 'Large JSON with Accept-Encoding: gzip',
      passed: valid,
      details: {
        status: res.statusCode,
        contentEncoding: res.headers['content-encoding'],
        vary: res.headers['vary'],
        contentLength: cl,
        receivedBytes: res.size,
        cacheControl: res.headers['cache-control'],
      },
    });
  }

  // Test 2: GET Large JSON without gzip (identity)
  {
    const res = await requestRaw('/large', { headers: { 'Accept-Encoding': 'identity' } });
    const isGzipped = Boolean(res.headers['content-encoding']);
    const cl = parseInt(res.headers['content-length'], 10);
    const parsed = JSON.parse(res.body.toString('utf-8'));
    const valid = !isGzipped && cl === res.size && parsed.message.length === 5000;
    testResults.push({
      test: 'Large JSON without Accept-Encoding (identity)',
      passed: valid,
      details: {
        contentEncoding: res.headers['content-encoding'] || 'none',
        contentLength: cl,
        receivedBytes: res.size,
      },
    });
  }

  // Test 3: Small JSON (<1024 B)
  {
    const res = await requestRaw('/small', { headers: { 'Accept-Encoding': 'gzip' } });
    const isGzipped = Boolean(res.headers['content-encoding']);
    const cl = parseInt(res.headers['content-length'], 10);
    testResults.push({
      test: 'Small JSON (<1 KB) should not be compressed',
      passed: !isGzipped && cl === res.size,
      details: {
        contentEncoding: res.headers['content-encoding'] || 'none',
        receivedBytes: res.size,
      },
    });
  }

  // Test 4: Empty Response (204)
  {
    const res = await requestRaw('/empty', { headers: { 'Accept-Encoding': 'gzip' } });
    testResults.push({
      test: 'Empty Response (204)',
      passed: res.statusCode === 204 && res.size === 0 && !res.headers['content-encoding'],
      details: {
        status: res.statusCode,
        size: res.size,
      },
    });
  }

  // Test 5: Error 400 & 500
  {
    const res400 = await requestRaw('/error-400', { headers: { 'Accept-Encoding': 'gzip' } });
    const res500 = await requestRaw('/error-500', { headers: { 'Accept-Encoding': 'gzip' } });
    const passed = !res400.headers['content-encoding'] && !res500.headers['content-encoding'];
    testResults.push({
      test: 'Error Responses (400, 500) uncompressed',
      passed,
      details: {
        res400Encoding: res400.headers['content-encoding'] || 'none',
        res500Encoding: res500.headers['content-encoding'] || 'none',
      },
    });
  }

  // Test 6: Pre-compressed response
  {
    const res = await requestRaw('/pre-compressed', { headers: { 'Accept-Encoding': 'gzip' } });
    // Check it is valid gzip once and gunzips cleanly
    let gunzipCount = 0;
    try {
      const decomp1 = zlib.gunzipSync(res.body);
      gunzipCount = 1;
      // If double compressed, gunzip on decomp1 would succeed. If single, it fails.
      try {
        zlib.gunzipSync(decomp1);
        gunzipCount = 2;
      } catch {}
    } catch {}

    testResults.push({
      test: 'Pre-compressed response is not double-compressed',
      passed: gunzipCount === 1,
      details: {
        compressionLayers: gunzipCount,
        contentEncoding: res.headers['content-encoding'],
      },
    });
  }

  // Test 7: HEAD request
  {
    const res = await requestRaw('/large', { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } });
    testResults.push({
      test: 'HEAD request returns headers without body',
      passed: res.size === 0,
      details: {
        status: res.statusCode,
        size: res.size,
        contentLength: res.headers['content-length'],
        contentEncoding: res.headers['content-encoding'],
      },
    });
  }

  // Test 8: Streaming response
  {
    const res = await requestRaw('/stream', { headers: { 'Accept-Encoding': 'gzip' } });
    testResults.push({
      test: 'Streaming response via res.write',
      passed: res.body.toString('utf-8') === 'chunk 1 chunk 2',
      details: {
        contentEncoding: res.headers['content-encoding'] || 'none (stream passed through)',
        bodyText: res.body.toString('utf-8'),
      },
    });
  }

  console.log('=== GZIP TEST RESULTS ===');
  console.log(JSON.stringify(testResults, null, 2));

  await new Promise((resolve) => server.close(resolve));
}

verifyGzip().catch((err) => {
  console.error(err);
  process.exit(1);
});
