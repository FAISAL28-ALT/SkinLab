// Compatibility exports retained for legacy imports; all verification uses the
// centralized Supabase-backed authentication middleware.
export { requireAuth } from './auth.middleware.js';
export { requireShopAdmin as requireAdmin } from './role.middleware.js';
//# sourceMappingURL=auth.js.map