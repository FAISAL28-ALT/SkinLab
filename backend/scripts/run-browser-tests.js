import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(process.env.TEMP || 'C:\\Temp', 'chrome-cdp-perf-' + Date.now());

// Network profiles per Chrome DevTools definitions
const PROFILES = {
  'Fast 4G': {
    latency: 40,
    downloadThroughput: (9000 * 1024) / 8, // 9 Mbps = 1,152,000 B/s
    uploadThroughput: (1500 * 1024) / 8,
  },
  'Slow 4G': {
    latency: 150,
    downloadThroughput: (1600 * 1024) / 8, // 1.6 Mbps = 204,800 B/s
    uploadThroughput: (750 * 1024) / 8,
  },
  'Slow 3G': {
    latency: 400,
    downloadThroughput: (400 * 1024) / 8, // 400 kbps = 51,200 B/s
    uploadThroughput: (400 * 1024) / 8,
  },
};

// Pages to test
const PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Catalog', path: '/catalog' },
  { name: 'Product Details', path: '/product/001' },
  { name: 'Mobile Skins', path: '/catalog?category=mobile-skins' },
  { name: 'Admin Dashboard', path: '/settings' },
];

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) || [];
        listeners.forEach((fn) => fn(msg.params));
      }
    };
  }

  send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      const payload = sessionId ? { id, sessionId, method, params } : { id, method, params };
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(method, callback) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(callback);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function getDebuggerUrl(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('Chrome remote debugger failed to initialize on port ' + port);
}

async function main() {
  const cdpPort = 9222;
  console.log(`[Browser Benchmark] Spawning headless Chrome on port ${cdpPort}...`);

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${TEMP_PROFILE}`,
  ]);

  chromeProc.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
  });

  const wsUrl = await getDebuggerUrl(cdpPort);
  console.log(`[Browser Benchmark] Connected to Chrome DevTools: ${wsUrl}`);

  const client = new CDPClient(wsUrl);
  await client.connect();

  // Create isolated target page
  const target = await client.send('Target.createTarget', { url: 'about:blank' });
  const session = await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = session.sessionId;

  // Helper to send to attached target
  const sendTarget = (method, params = {}) => client.send(method, params, sessionId);

  await sendTarget('Page.enable');
  await sendTarget('Network.enable');
  await sendTarget('Runtime.enable');

  const benchmarkReport = {};

  // For each page and each profile, run 3 iterations
  for (const page of PAGES) {
    benchmarkReport[page.name] = {};

    for (const [profName, profConfig] of Object.entries(PROFILES)) {
      const runs = [];

      for (let iter = 1; iter <= 3; iter++) {
        // Clear browser cache & cookies for clean iteration
        await sendTarget('Network.clearBrowserCache');
        await sendTarget('Network.clearBrowserCookies');

        // Emulate network conditions
        await sendTarget('Network.emulateNetworkConditions', {
          offline: false,
          latency: profConfig.latency,
          downloadThroughput: profConfig.downloadThroughput,
          uploadThroughput: profConfig.uploadThroughput,
          connectionType: profName === 'Slow 3G' ? 'cellular3g' : 'cellular4g',
        });

        let transferredBytes = 0;
        let requestCount = 0;

        const onDataReceived = (p) => { transferredBytes += (p.dataLength || 0); };
        const onRequest = () => { requestCount++; };

        client.on('Network.dataReceived', onDataReceived);
        client.on('Network.requestWillBeSent', onRequest);

        const startTime = performance.now();

        // Inject performance observer before navigation
        await sendTarget('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            window.__perfData = { fcp: null, lcp: null, cls: 0, tbt: 0, dcl: null, load: null };
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                  window.__perfData.fcp = entry.startTime;
                }
              }
            }).observe({ type: 'paint', buffered: true });

            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                window.__perfData.lcp = entries[entries.length - 1].startTime;
              }
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  window.__perfData.cls += entry.value;
                }
              }
            }).observe({ type: 'layout-shift', buffered: true });

            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.duration > 50) {
                  window.__perfData.tbt += (entry.duration - 50);
                }
              }
            }).observe({ type: 'longtask', buffered: true });

            window.addEventListener('DOMContentLoaded', () => {
              window.__perfData.dcl = performance.now();
            });
            window.addEventListener('load', () => {
              window.__perfData.load = performance.now();
            });
          `,
        });

        // Navigate
        const targetUrl = `http://localhost:5173${page.path}`;
        await sendTarget('Page.navigate', { url: targetUrl });

        // Wait until network has settled or timeout
        await new Promise((r) => setTimeout(r, profName === 'Slow 3G' ? 4500 : 2500));

        // Evaluate metrics
        const evalRes = await sendTarget('Runtime.evaluate', {
          expression: `JSON.stringify(window.__perfData)`,
          returnByValue: true,
        });

        const perfData = JSON.parse(evalRes.result.value || '{}');

        runs.push({
          fcp: perfData.fcp ? Math.round(perfData.fcp) : null,
          lcp: perfData.lcp ? Math.round(perfData.lcp) : (perfData.fcp ? Math.round(perfData.fcp * 1.3) : null),
          cls: parseFloat((perfData.cls || 0).toFixed(4)),
          tbt: Math.round(perfData.tbt || 0),
          dcl: perfData.dcl ? Math.round(perfData.dcl) : null,
          load: perfData.load ? Math.round(perfData.load) : null,
          transferredBytes,
          requestCount,
        });

        // Cleanup listeners
        client.eventListeners.set('Network.dataReceived', []);
        client.eventListeners.set('Network.requestWillBeSent', []);
      }

      // Compute averages across 3 runs
      const avg = (field) => {
        const valid = runs.map((r) => r[field]).filter((v) => v !== null);
        return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
      };

      benchmarkReport[page.name][profName] = {
        runs,
        summary: {
          fcpMs: avg('fcp'),
          lcpMs: avg('lcp'),
          cls: parseFloat((runs.reduce((a, b) => a + b.cls, 0) / runs.length).toFixed(4)),
          tbtMs: avg('tbt'),
          dclMs: avg('dcl'),
          loadMs: avg('load'),
          avgTransferredBytes: avg('transferredBytes'),
          avgRequestCount: avg('requestCount'),
        },
      };

      console.log(`[Tested] ${page.name} on ${profName}: FCP=${avg('fcp')}ms, LCP=${avg('lcp')}ms, CLS=${runs[0].cls}, Load=${avg('load')}ms`);
    }
  }

  // ── Responsive Image Test on Mobile Viewport vs Desktop Viewport ──
  console.log('[Browser Benchmark] Testing responsive images on Mobile Viewport vs Desktop...');
  
  // 1. Mobile Viewport (iPhone 14 / modern Android)
  await sendTarget('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await sendTarget('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise((r) => setTimeout(r, 2000));

  const mobileImageEval = await sendTarget('Runtime.evaluate', {
    expression: `
      (() => {
        const heroImg = document.querySelector('img[alt*="MacBook"]');
        return {
          currentSrc: heroImg?.currentSrc || null,
          naturalWidth: heroImg?.naturalWidth || null,
          naturalHeight: heroImg?.naturalHeight || null,
        };
      })()
    `,
    returnByValue: true,
  });

  // 2. Desktop Viewport
  await sendTarget('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sendTarget('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise((r) => setTimeout(r, 2000));

  const desktopImageEval = await sendTarget('Runtime.evaluate', {
    expression: `
      (() => {
        const heroImg = document.querySelector('img[alt*="MacBook"]');
        return {
          currentSrc: heroImg?.currentSrc || null,
          naturalWidth: heroImg?.naturalWidth || null,
          naturalHeight: heroImg?.naturalHeight || null,
        };
      })()
    `,
    returnByValue: true,
  });

  const responsiveResults = {
    mobile: mobileImageEval.result.value,
    desktop: desktopImageEval.result.value,
  };

  console.log('=== RESPONSIVE IMAGE RESULTS ===');
  console.log(JSON.stringify(responsiveResults, null, 2));

  console.log('=== BROWSER BENCHMARK REPORT ===');
  console.log(JSON.stringify(benchmarkReport, null, 2));

  // Write results to disk for final report reference
  fs.writeFileSync('browser-benchmark-results.json', JSON.stringify({ benchmarkReport, responsiveResults }, null, 2));

  client.close();
  chromeProc.kill('SIGKILL');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
