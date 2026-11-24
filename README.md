# SkinLab

**Premium Laptop Skin Catalogue Platform**

A full-stack web application for managing and showcasing laptop skin designs. Built with React + Vite (frontend) and Node.js + Express (backend), with Supabase PostgreSQL, Prisma ORM, and Cloudflare R2 image storage.

---

## Project Structure

```text
SkinLab/
├── frontend/
│   ├── public/assets/       # Banners, laptop images, skins and logo
│   ├── src/app/              # Application entry and routes
│   ├── src/components/       # Shared UI, layout and navigation
│   ├── src/features/catalog/ # Catalog components, data, hooks and types
│   ├── src/pages/            # Storefront, preview and admin pages
│   ├── index.html
│   └── package.json / package-lock.json / Vite and TypeScript configs
├── backend/
│   ├── src/                  # Express API
│   └── package.json
├── database/
│   ├── prisma/               # Schema and migrations
│   ├── seeds/                # Existing Prisma seed
│   └── README.md
├── backend/.env              # Backend-only environment and secrets
├── backend/.env.example
├── frontend/.env.example
├── .gitignore
├── package.json              # Workspace scripts only
└── README.md
```

---
## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS 3 (custom brand tokens) |
| Routing | React Router v7 |
| Backend | Node.js + Express + JavaScript (ES modules) |
| Database | Supabase PostgreSQL |
| ORM | Prisma 5 |
| Authentication | Argon2id + HS256 JWT + PostgreSQL refresh sessions |
| Image Storage | Cloudflare R2 |
| Image Processing | Sharp |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10

### Frontend Development

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend Development

```bash
cd backend
npm install
# Configure backend/.env from backend/.env.example
npm run dev
# → http://localhost:4000
```

### Environment Variables

#### Frontend public variables (`VITE_` prefixed only)
```
VITE_API_URL=http://localhost:4000/api
```

#### Backend (`backend/.env`)
Set `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET` (at least 32 random bytes), `JWT_ISSUER`, `JWT_AUDIENCE`, `AUTH_IP_HASH_SECRET` (a separate random secret of at least 32 bytes), and `FRONTEND_URL` to the exact deployed origin. Set `CORS_ORIGINS` to any additional explicit origins. Set `TRUST_PROXY_HOPS` only to the number of trusted reverse proxies in front of Express; leave it at `0` if the API is directly exposed. The backend validates required authentication settings before listening.

The application uses app-managed authentication. Supabase remains the PostgreSQL host; Supabase Auth is not used by the app. Access JWTs are held in frontend memory, and refresh tokens are stored as hashes in PostgreSQL.

**Database migration (not applied automatically):** review and then apply `database/prisma/migrations/20261120010000_application_auth_cutover/migration.sql` after the existing migrations. It adds authentication tables. It does not delete or recreate existing business data. Regenerate Prisma with `cd backend && npm run db:generate` after applying it.

Existing administrator profile IDs and roles are preserved, but Supabase passwords are not copied. After the migration, assign an administrator an app login ID and new password using `cd backend && npm run auth:set-admin-password -- <existing-profile-uuid> <login-id>` in an interactive terminal. The password prompt is hidden.

For production, use HTTPS, set secure cookie deployment, configure only trusted proxy hops, and set the explicit frontend origin list. Passwords are never placed in browser storage; the "Remember me" and recovery-by-email flow are intentionally absent because accounts are managed by administrators.

---

## User Roles

| Role | Permissions |
|------|-------------|
| **SHOP_ADMIN** | Manage data belonging to the assigned active shop |

---

## Database Schema

Application tables with foreign keys, tenant indexes, and row-level policies:

- `shops` — Multi-tenant shop records
- `profiles` — Stable user IDs, role and shop assignment
- `auth_credentials` — Argon2id password hashes and unique login IDs
- `auth_sessions` — 48-hour absolute sessions with refresh token hashes
- `auth_refresh_token_history` — Reuse detection for rotated tokens
- `auth_login_throttles` — Shared atomic IP and account lockout counters
- `categories` — Product categories scoped to a shop
- `products` — Skin designs with metadata
- `product_images` — Cloudflare R2 object keys (never binary)
- `auth_rate_limit_buckets` — Shared short-lived IP rate-limit counters
- `auth_audit_events` — Auth and privileged mutation audit records; IPs are hashed

---

## Image Management

- Original images stored in Cloudflare R2
- Thumbnails and previews generated server-side with Sharp
- Max **8 images** per product
- Max **15 MB** per upload
- Supported formats: **JPG, JPEG, PNG, WebP**
- R2 credentials are **never exposed** to frontend code

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Done | Project structure & architecture setup |
| **Phase 2** | ✅ Done | App-managed authentication + Prisma integration |
| **Phase 3** | 🔜 | Cloudflare R2 image upload + Sharp processing |
| **Phase 4** | 🔜 | Admin panel full CRUD with real API |
| **Phase 5** | ✅ Done | Multi-shop tenant support |
