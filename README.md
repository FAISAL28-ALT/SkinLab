# SkinLab

**Premium Laptop Skin Catalogue Platform**

A full-stack web application for managing and showcasing laptop skin designs. Built with React + Vite (frontend) and Node.js + Express (backend), with Supabase PostgreSQL, Prisma ORM, and Cloudflare R2 image storage.

---

## Project Structure

```
SkinLab/
├── frontend/          # React + Vite + TypeScript + Tailwind CSS
│   ├── public/assets/ # Static assets (banners, laptop images, logo)
│   └── src/
│       ├── admin/     # Admin panel (Dashboard, Products, Categories)
│       ├── components/
│       │   ├── catalogue/   # Catalogue grid, filters, product cards
│       │   ├── common/      # Navbar, Footer, SearchBar, etc.
│       │   ├── home/        # Hero, Category, Collection, Trending sections
│       │   └── preview/     # Laptop Preview Studio components
│       ├── data/      # Static data (products, categories, laptops) — migrate to API in Phase 2
│       ├── hooks/     # useProducts, useWishlist
│       ├── layouts/   # MainLayout (Navbar + Outlet + Footer)
│       ├── lib/       # Supabase client
│       ├── pages/     # Public pages (Home, Catalogue, ProductDetails, etc.)
│       ├── routes/    # Centralized route definitions
│       ├── services/  # API service layer (productService, etc.)
│       ├── types/     # TypeScript interfaces
│       └── context/   # React contexts (Auth)
│
├── backend/           # Node.js + Express + TypeScript REST API
│   ├── prisma/
│   │   └── schema.prisma   # Database schema (5 tables)
│   └── src/
│       ├── config/    # Environment variables
│       ├── middleware/ # Auth, shop-scoping
│       ├── modules/   # Feature modules (auth, products, categories, images, shops)
│       ├── utils/     # Response helpers
│       ├── app.ts     # Express application
│       └── server.ts  # HTTP server entry point
│
├── package.json       # Workspace root scripts
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS 3 (custom brand tokens) |
| Routing | React Router v7 |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase PostgreSQL |
| ORM | Prisma 5 |
| Authentication | Supabase Auth |
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
cp .env.example .env
# Fill in your environment variables in .env
npm run dev
# → http://localhost:4000
```

### Environment Variables

#### Frontend (`frontend/.env.local`)
```
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Backend (`backend/.env`)
See `backend/.env.example` for all required variables.

---

## User Roles

| Role | Permissions |
|------|-------------|
| **ADMIN** | Add / Edit / Delete products, Upload images, Manage categories |
| **USER** | View catalogue, Search & filter, View product details |

---

## Database Schema

Five tables with proper foreign keys and indexes:

- `shops` — Multi-tenant shop support (future)
- `profiles` — User profiles linked to Supabase Auth
- `categories` — Product categories scoped to a shop
- `products` — Skin designs with metadata
- `product_images` — Cloudflare R2 object keys (never binary)

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
| **Phase 2** | 🔜 Next | Supabase Auth + Prisma database integration |
| **Phase 3** | 🔜 | Cloudflare R2 image upload + Sharp processing |
| **Phase 4** | 🔜 | Admin panel full CRUD with real API |
| **Phase 5** | 🔜 | Multi-shop tenant support |
