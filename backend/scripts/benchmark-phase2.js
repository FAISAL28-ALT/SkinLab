import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';

async function runBenchmark() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[Phase 2 Benchmark] Test server listening on ${baseUrl}`);

  // Helpers to test endpoint
  async function testEndpoint(endpoint, headers = {}) {
    const start = performance.now();
    const res = await fetch(`${baseUrl}${endpoint}`, { headers });
    const duration = performance.now() - start;
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      status: res.status,
      duration,
      size: buffer.length,
      contentEncoding: res.headers.get('content-encoding'),
      cacheControl: res.headers.get('cache-control'),
    };
  }

  // 1. Measure API compression & latency across iterations
  const endpoints = [
    { name: 'Catalogue List (Default)', path: '/api/products' },
    { name: 'Catalogue List (Trending 12)', path: '/api/products?trending=true&limit=12' },
    { name: 'Categories List', path: '/api/categories' },
    { name: 'Product Details', path: '/api/products/001' },
  ];

  const results = {};

  for (const ep of endpoints) {
    // Warm up
    await testEndpoint(ep.path, { 'Accept-Encoding': 'gzip' });

    // Test raw vs gzipped sizes
    const rawRes = await testEndpoint(ep.path, { 'Accept-Encoding': 'identity' });
    const gzipRes = await testEndpoint(ep.path, { 'Accept-Encoding': 'gzip' });

    // 10 iterations with gzip
    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const run = await testEndpoint(ep.path, { 'Accept-Encoding': 'gzip' });
      latencies.push(run.duration);
    }
    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    results[ep.name] = {
      path: ep.path,
      rawBytes: rawRes.size,
      gzipBytes: gzipRes.size,
      compressionPct: ((1 - gzipRes.size / rawRes.size) * 100).toFixed(1),
      cacheControl: gzipRes.cacheControl,
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1),
      median: median.toFixed(1),
      p95: p95.toFixed(1),
    };
  }

  // 2. Measure Image Assets (Before vs After)
  const imageAssets = [
    {
      name: 'Hero Laptop Image',
      originalFile: 'frontend/public/assets/banners/hero-laptop.png',
      optimizedFile: 'frontend/public/assets/banners/hero-laptop.webp',
      optimizedMobile: 'frontend/public/assets/banners/hero-laptop-sm.webp',
    },
    {
      name: 'Anime Collection Banner',
      originalFile: 'frontend/public/assets/banners/collection-anime.webp',
      optimizedFile: 'frontend/public/assets/banners/collection-anime-thumb.webp',
    },
    {
      name: 'Cars Collection Banner',
      originalFile: 'frontend/public/assets/skins/cars/005.png',
      optimizedFile: 'frontend/public/assets/banners/collection-cars-thumb.webp',
    },
    {
      name: 'Travel Collection Banner',
      originalFile: 'frontend/public/assets/banners/London Landmarks.png',
      optimizedFile: 'frontend/public/assets/banners/collection-travel-thumb.webp',
    },
  ];

  const imageResults = [];
  let totalOrigBytes = 0;
  let totalOptBytes = 0;

  for (const img of imageAssets) {
    const origStat = fs.statSync(path.resolve(img.originalFile));
    const optStat = fs.statSync(path.resolve(img.optimizedFile));
    totalOrigBytes += origStat.size;
    totalOptBytes += optStat.size;
    imageResults.push({
      name: img.name,
      origBytes: origStat.size,
      optBytes: optStat.size,
      reductionPct: ((1 - optStat.size / origStat.size) * 100).toFixed(1),
    });
  }

  // 3. Network profile transfer times
  // Profiles:
  // Fast 4G: 9 Mbps (1,125,000 B/s), 40ms RTT
  // Slow 4G: 1.6 Mbps (200,000 B/s), 150ms RTT
  // Slow 3G: 400 kbps (50,000 B/s), 400ms RTT
  function calcTransferTime(bytes, rttMs, bandwidthBps) {
    // 1 round trip for request + transfer duration
    const transferMs = (bytes / bandwidthBps) * 1000;
    return rttMs + transferMs;
  }

  const networkProfiles = {
    'Fast 4G (9 Mbps, 40ms RTT)': { rtt: 40, bps: 1125000 },
    'Slow 4G (1.6 Mbps, 150ms RTT)': { rtt: 150, bps: 200000 },
    'Slow 3G (400 kbps, 400ms RTT)': { rtt: 400, bps: 50000 },
  };

  const imageTransferComparison = {};
  for (const [profName, prof] of Object.entries(networkProfiles)) {
    const origTimeSec = calcTransferTime(totalOrigBytes, prof.rtt, prof.bps) / 1000;
    const optTimeSec = calcTransferTime(totalOptBytes, prof.rtt, prof.bps) / 1000;
    imageTransferComparison[profName] = {
      originalSec: origTimeSec.toFixed(2),
      optimizedSec: optTimeSec.toFixed(2),
      timeSavedSec: (origTimeSec - optTimeSec).toFixed(2),
      speedup: (origTimeSec / optTimeSec).toFixed(1) + 'x',
    };
  }

  // 4. Bundle Transfer Comparison
  // Baseline: Monolith dist/assets/index-BaaNqIGZ.js = 561,720 B (gzip: 161,220 B)
  // Optimized: Initial index.js (66,550 B / 18,170 B gzip) + vendor-react.js (210,520 B / 65,520 B gzip)
  const origJsGzip = 161220;
  const optJsGzip = 18170 + 65520; // 83,690 B

  const bundleTransferComparison = {};
  for (const [profName, prof] of Object.entries(networkProfiles)) {
    const origTimeSec = calcTransferTime(origJsGzip, prof.rtt, prof.bps) / 1000;
    const optTimeSec = calcTransferTime(optJsGzip, prof.rtt, prof.bps) / 1000;
    bundleTransferComparison[profName] = {
      originalSec: origTimeSec.toFixed(2),
      optimizedSec: optTimeSec.toFixed(2),
      speedup: (origTimeSec / optTimeSec).toFixed(1) + 'x',
    };
  }

  console.log('=== API RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  console.log('=== IMAGE RESULTS ===');
  console.log(JSON.stringify(imageResults, null, 2));
  console.log(`Total Images Original: ${(totalOrigBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Images Optimized: ${(totalOptBytes / 1024).toFixed(1)} KB`);
  console.log(`Image Bandwidth Saved: ${((1 - totalOptBytes / totalOrigBytes) * 100).toFixed(1)}%`);

  console.log('=== IMAGE NETWORK TRANSFER COMPARISON ===');
  console.log(JSON.stringify(imageTransferComparison, null, 2));

  console.log('=== BUNDLE NETWORK TRANSFER COMPARISON ===');
  console.log(JSON.stringify(bundleTransferComparison, null, 2));

  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
}

runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
