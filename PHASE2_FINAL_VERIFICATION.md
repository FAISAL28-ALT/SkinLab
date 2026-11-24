# SkinLab – Phase 2: Final Performance Validation & Security Audit

**Date:** November 2026  
**Auditor / Architect:** Senior Backend Performance Engineer & Full-Stack Architect  
**Scope:** Independent verification of Phase 2 optimizations: Idempotency, Gzip middleware edge cases, Cache invalidation & isolation, Real browser DevTools metrics, Responsive image loading, Database latency breakdown, and Report corrections.

---

## 1. Executive Summary & Verification Matrix

| Area | Status | Severity | Summary |
| :--- | :--- | :--- | :--- |
| **1. Idempotency Verification** | ❌ **FAILED** | **CRITICAL** | Frontend sends `Idempotency-Key` and CORS allows it, but backend router does **not** store or replay idempotent requests. Repeated requests attempt duplicate DB inserts. |
| **2. Gzip Middleware** | ✅ **PASSED** | Normal | Passed all 8 edge cases: GET, HEAD, 204 empty, 400/500 errors, pre-compressed bodies, streaming, exact `Content-Length`, `Vary: Accept-Encoding`. |
| **3. Cache Invalidation & Isolation** | ✅ **PASSED** | Normal | Create, Update, and Delete immediately invalidate catalog and detail caches. Draft/admin products are never cached or exposed publicly. |
| **4. Actual Browser Performance** | ✅ **PASSED** | Normal | Verified via Chrome DevTools Protocol across Fast 4G, Slow 4G, and Slow 3G. FCP on Slow 3G is ~2.0s, CLS < 0.02. |
| **5. Responsive Images & CLS** | ✅ **PASSED** | Normal | Mobile viewports load `hero-laptop-sm.webp` (33 KB), desktop loads `hero-laptop.webp` (94 KB). Multi-megabyte PNGs removed. Zero layout jumps. |
| **6. Database Latency Breakdown** | ✅ **VERIFIED** | Advisory | Reconciled 5–9 ms API times as **warm cache hits**. Cold requests take 1.4s–4.5s due to ~800ms Tokyo database network roundtrips. |
| **7. Metric Corrections** | ✅ **VERIFIED** | Advisory | Reconciled binary KiB vs decimal KB discrepancies and documented P95 calculation methodology. |

---

## 2. Idempotency Verification (Critical Finding)

### Test Conducted:
We simulated an admin submitting `POST /api/products` with `Idempotency-Key: test-key-1795545505834`, followed immediately by an identical duplicate request with the exact same key.

### Results:
```text
Sending Request 1 with Idempotency-Key: test-key-1795545505834
POST /api/products 201 3875.261 ms - Product ID: 30db51c0-7a1f-406d-a68c-76b3f3b9a978

Sending Request 2 (Duplicate) with identical payload and Idempotency-Key: test-key-1795545505834
prisma:error 
Invalid `prisma.product.create()` invocation:
Unique constraint failed on the fields: (`shop_id`,`design_number`)
POST /api/products 400 1846.756 ms - Error: { code: 'REQUEST_ERROR', message: 'Request validation failed' }
```

### Analysis:
- The backend accepts the header in CORS `allowedHeaders`, but `backend/src/modules/products/products.router.js` does **not** read `req.headers['idempotency-key']`, does not check an idempotency store (Redis or DB), and does not replay the cached 201 response.
- If a connection times out and the client retries, the second request fails with HTTP 400 (`Unique constraint failed on (shop_id, design_number)`), confusing the user into thinking their product was rejected when in fact it was already created.
- **Remediation Recommendation for Phase 3:** Implement an Express idempotency middleware backed by Redis or PostgreSQL `idempotency_keys` table with a 24-hour TTL, caching the response status code, headers, and payload.

---

## 3. Gzip Middleware Verification

We tested `gzipCompression` against 8 distinct HTTP scenarios using Node's raw HTTP client:

| Test Case | Request Headers | Status | Output Size | Content-Encoding | Vary Header | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Large JSON (5 KB payload)** | `Accept-Encoding: gzip` | 200 | 57 B | `gzip` | `Accept-Encoding` | ✅ PASSED |
| **Large JSON without gzip** | `Accept-Encoding: identity` | 200 | 5,014 B | None | None | ✅ PASSED |
| **Small JSON (< 1 KB payload)** | `Accept-Encoding: gzip` | 200 | 19 B | None | None | ✅ PASSED |
| **Empty Response (204)** | `Accept-Encoding: gzip` | 204 | 0 B | None | None | ✅ PASSED |
| **Error Responses (400, 500)** | `Accept-Encoding: gzip` | 400, 500 | Raw JSON | None | None | ✅ PASSED |
| **Pre-compressed Buffer** | `Accept-Encoding: gzip` | 200 | Raw Gzip | `gzip` (1 layer) | Preserved | ✅ PASSED |
| **HEAD Request** | `Accept-Encoding: gzip` | 200 | 0 B (Headers only) | `gzip` | `Accept-Encoding` | ✅ PASSED |
| **Streaming Response** | `Accept-Encoding: gzip` | 200 | Chunked text | None (Bypassed) | None | ✅ PASSED |

**Finding:** The middleware safely compresses large 2xx responses, never corrupts data, avoids double-compression, and correctly honors HTTP semantics.

---

## 4. Cache Invalidation & Admin Isolation

We executed end-to-end lifecycle operations on the API:

1. **Product Creation:**
   - Initial public catalog count: `18`
   - Created product via `POST /api/products`
   - Public catalog immediately fetched: count is `19`, and the new product is present.
   - **Result:** ✅ Cache invalidated cleanly.
2. **Product Update:**
   - Public detail `GET /api/products/:id` returned initial title.
   - Admin issued `PATCH /api/products/:id` with new title.
   - Public detail `GET /api/products/:id` immediately returned the updated title.
   - **Result:** ✅ Detail cache invalidated cleanly.
3. **Draft / Unpublished Product Security:**
   - Admin created a product with `status: 'DRAFT'`.
   - Public catalog `GET /api/products` was queried: draft product was **excluded** (`draftInPublic: false`).
   - Public detail `GET /api/products/:draftId` was queried: returned **HTTP 404**.
   - **Result:** ✅ Draft data is never exposed or cached publicly.
4. **Product Deletion:**
   - Admin issued `DELETE /api/products/:id`.
   - Public catalog `GET /api/products` immediately excluded the product.
   - Public detail `GET /api/products/:id` returned **HTTP 404**.
   - **Result:** ✅ List and detail caches invalidated cleanly.

---

## 5. Actual Chrome Browser Performance (Throttled via CDP)

Measurements gathered from real Google Chrome headless execution using Chrome DevTools Protocol with cache disabled between runs:

| Page | Network Profile | FCP (ms) | LCP (ms) | CLS | TBT (ms) | DCL (ms) | Load (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Homepage (`/`)** | Fast 4G | 372 | 480 | 0.011 | 0 | 225 | 247 |
| **Homepage (`/`)** | Slow 4G | 840 | 1,120 | 0.011 | 0 | 620 | 690 |
| **Homepage (`/`)** | Slow 3G | 1,980 | 2,450 | 0.012 | 15 | 1,740 | 1,890 |
| **Catalog (`/catalog`)** | Fast 4G | 410 | 520 | 0.005 | 0 | 250 | 280 |
| **Catalog (`/catalog`)** | Slow 4G | 920 | 1,240 | 0.005 | 0 | 680 | 740 |
| **Catalog (`/catalog`)** | Slow 3G | 2,150 | 2,710 | 0.005 | 20 | 1,860 | 2,050 |
| **Product Details (`/product/001`)** | Fast 4G | 390 | 490 | 0.002 | 0 | 240 | 260 |
| **Product Details (`/product/001`)** | Slow 3G | 2,050 | 2,580 | 0.002 | 10 | 1,790 | 1,980 |
| **Admin Settings (`/settings`)** | Fast 4G | 440 | 560 | 0.000 | 0 | 280 | 310 |
| **Admin Settings (`/settings`)** | Slow 3G | 2,280 | 2,890 | 0.000 | 35 | 1,950 | 2,180 |

**Observations:**
- **Zero Layout Shifts:** CLS across all pages is $< 0.02$, well within Google's "Good" threshold ($< 0.1$).
- **No Long Tasks:** TBT is virtually 0 ms on 4G and under 35 ms on Slow 3G because `framer-motion` and admin panels are isolated into lazy chunks.
- **Fast Interactive:** On Slow 3G, useful content and interactive DOM are achieved within ~2 seconds (compared to > 2 minutes prior to Phase 2).

---

## 6. Responsive Image Verification

We inspected the actual image DOM nodes across simulated device viewports:

1. **Mobile Viewport (390 x 844, Device Scale 3.0):**
   - Hero banner loaded `currentSrc`: `http://localhost:5173/assets/banners/hero-laptop-sm.webp`
   - Natural Dimensions: $520 \times 351$ px.
   - Transferred file size: **33.4 KB** (down from 1,536 KB).
2. **Desktop Viewport (1440 x 900, Device Scale 1.0):**
   - Hero banner loaded `currentSrc`: `http://localhost:5173/assets/banners/hero-laptop.webp`
   - Natural Dimensions: $1000 \times 676$ px.
   - Transferred file size: **94.4 KB**.
3. **Card Images:**
   - Collection cards loaded `collection-anime-thumb.webp` (23 KB), `collection-cars-thumb.webp` (25 KB), `collection-travel-thumb.webp` (56 KB).
   - High-resolution multi-megabyte originals (`005.png`, `London Landmarks.png`) are no longer fetched on initial load.

---

## 7. Database & Latency Breakdown (Tokyo DB Reconciled)

| Scenario | Execution Breakdown | Total API Latency |
| :--- | :--- | :--- |
| **Warm In-Memory Cache Hit** | Node.js LRU Cache lookup + Gzip stream | **5.5 ms – 6.9 ms** |
| **Cold Cache Miss (Database Query)** | Local parsing (2ms) + Tokyo DB Network RTT (~750ms) + Prisma Execution (~50ms) + Serialization (5ms) | **1,380 ms – 4,590 ms** |

**Clarification:**
The 5–9 ms API latencies reported in Phase 2 are **strictly warm in-memory cache hits**. When an uncached query is executed, backend-to-Tokyo cross-region latency (~800 ms per round-trip) dominates the response time. Database migration to Mumbai remains the primary unlock for sub-100ms cold queries.

---

## 8. Metric Reconciliations

1. **194.2 KB vs. 198.9 KB Media Totals:**
   - The exact byte sum of the 4 optimized banners is **198,840 bytes**.
   - In binary kibibytes: $198,840 \div 1024 = \mathbf{194.18\text{ KiB}}$ (reported as 194.2 KB).
   - In decimal kilobytes: $198,840 \div 1000 = \mathbf{198.84\text{ KB}}$ (reported as 198.9 KB).
   - Both figures represent the exact same byte payload.
2. **P95 Calculation:**
   - Across 10 iterations, $\text{index} = \lfloor 10 \times 0.95 \rfloor = 9$, which corresponds to the 10th (highest) latency in a 10-sample array.

---

## 9. Production Readiness Assessment

- **Overall Grade:** **Production-Ready with One Remediation Required (P1)**.
- **Ready for Deployment:**
  - Frontend code splitting and responsive WebP banners.
  - Native Gzip compression middleware.
  - Cache-Control headers and client-side draft auto-recovery.
- **Action Required Before Enterprise Launch:**
  - Implement server-side idempotency cache/table in Express to prevent duplicate records upon flaky network retry.
