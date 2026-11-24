/**
 * useApiProducts — fetches the live product catalogue from the backend API
 * with in-memory caching and in-flight request deduplication.
 *
 * The backend exposes GET /api/products which supports:
 *   ?category=slug, ?q=search, ?laptop=model, ?sort=featured|newest|price-asc|price-desc|rating, ?page, ?limit
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/auth/authService';
import { CategoryType, CollectionType } from '@/features/catalog/types/product';
import { SortOption } from '@/features/catalog/hooks/useProducts';

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiProductImage {
  id: string;
  productId: string;
  originalKey: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  fileSize?: number;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  createdAt?: string;
  url: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ApiProduct {
  id: string;
  shopId: string;
  categoryId?: string;
  title: string;
  slug: string;
  designNumber: string;
  description: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  isBestseller: boolean;
  isTrending?: boolean;
  isNew: boolean;
  badge: string | null;
  finish: string | null;
  material?: string | null;
  dimensions?: string | null;
  laptopCompatibility: string[];
  designStyle?: string | null;
  collection?: string | null;
  price: string | null;
  originalPrice: string | null;
  rating: string | null;
  reviewCount: number;
  createdAt?: string;
  updatedAt?: string;
  category: ApiCategory;
  images: ApiProductImage[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface FetchState {
  products: ApiProduct[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Global In-Memory Cache & In-Flight Deduplication ──────────────────────────

interface CacheEntry {
  data: ApiProduct[];
  pagination: PaginationMeta | null;
  timestamp: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds
const apiProductsCache = new Map<string, CacheEntry>();
const singleProductCache = new Map<string, ApiProduct>();
const inFlightRequests = new Map<string, Promise<{ data: ApiProduct[]; pagination: PaginationMeta | null }>>();

/** Retrieve a previously fetched product by ID from client memory. */
export function getCachedProduct(id: string): ApiProduct | undefined {
  return singleProductCache.get(id);
}

/** Store a product directly in client memory. */
export function cacheProduct(product: ApiProduct): void {
  singleProductCache.set(product.id, product);
}

/** Invalidate client product caches (e.g. after adding/editing/deleting a design). */
export function invalidateClientProductCache(): void {
  apiProductsCache.clear();
  singleProductCache.clear();
  inFlightRequests.clear();
}

// Map backend sort key → frontend SortOption and vice-versa
const sortOptionToParam: Record<SortOption, string> = {
  featured: 'featured',
  newest: 'newest',
  'price-asc': 'price-asc',
  'price-desc': 'price-desc',
  rating: 'rating',
  'design-number': 'newest',
};

function buildCacheKey(params: URLSearchParams): string {
  return params.toString();
}

export function useApiProducts(options: {
  category?: string;
  collection?: CollectionType | string;
  style?: CollectionType | string;
  search?: string;
  laptop?: string;
  sort?: SortOption;
  trending?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  const { category, collection, style, search, laptop, sort = 'featured', trending, page = 1, limit = 24 } = options;

  // Build query string
  const params = new URLSearchParams();
  const selectedCol = collection ?? style;
  if (category && category !== 'All' && category !== 'all') params.set('category', category.toLowerCase());
  if (selectedCol && selectedCol !== 'All' && selectedCol !== 'all') params.set('collection', selectedCol);
  if (search?.trim()) params.set('q', search.trim());
  if (laptop && laptop !== 'all') params.set('laptop', laptop);
  if (trending !== undefined) params.set('trending', String(trending));
  params.set('sort', sortOptionToParam[sort] ?? 'featured');
  params.set('page', String(page));
  params.set('limit', String(limit));
  const cacheKey = buildCacheKey(params);

  // Initialize state from cache if available
  const [state, setState] = useState<FetchState>(() => {
    const cached = apiProductsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        products: cached.data,
        pagination: cached.pagination,
        isLoading: false,
        error: null,
      };
    }
    return {
      products: [],
      pagination: null,
      isLoading: true,
      error: null,
    };
  });

  const requestIdRef = useRef(0);

  const fetchProducts = useCallback(async (bypassCache = false) => {
    const id = ++requestIdRef.current;

    // Check cache first
    if (!bypassCache) {
      const cached = apiProductsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setState({
          products: cached.data,
          pagination: cached.pagination,
          isLoading: false,
          error: null,
        });
        return;
      }
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Deduplicate in-flight requests for the same query
      let requestPromise = inFlightRequests.get(cacheKey);
      if (!requestPromise || bypassCache) {
        requestPromise = (async () => {
          const response = await apiFetch(`/products?${params.toString()}`);
          const json = await response.json() as {
            success: boolean;
            data?: ApiProduct[];
            pagination?: PaginationMeta;
            error?: { message?: string };
          };
          if (!response.ok || !json.success) {
            throw new Error(json.error?.message ?? 'Failed to load products.');
          }
          const products = json.data ?? [];
          const pagination = json.pagination ?? null;

          // Populate cache
          apiProductsCache.set(cacheKey, { data: products, pagination, timestamp: Date.now() });
          for (const p of products) {
            singleProductCache.set(p.id, p);
          }

          return { data: products, pagination };
        })();

        inFlightRequests.set(cacheKey, requestPromise);
      }

      const result = await requestPromise;
      inFlightRequests.delete(cacheKey);

      if (id !== requestIdRef.current) return; // Discard stale request

      setState({
        products: result.data,
        pagination: result.pagination,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      inFlightRequests.delete(cacheKey);
      if (id !== requestIdRef.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unable to reach the catalogue service.',
      }));
    }
  }, [cacheKey]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const refetch = useCallback(() => fetchProducts(true), [fetchProducts]);

  return { ...state, refetch };
}

/**
 * useApiProduct — fetches a single product by UUID from GET /api/products/:id
 * with client memory caching and loading/error states.
 */
export function useApiProduct(id?: string) {
  const [product, setProduct] = useState<ApiProduct | null>(() => (id ? getCachedProduct(id) ?? null : null));
  const [isLoading, setIsLoading] = useState<boolean>(!product && Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (bypassCache = false) => {
    if (!id) {
      setProduct(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!bypassCache) {
      const cached = getCachedProduct(id);
      if (cached) {
        setProduct(cached);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/products/${id}`);
      const json = await res.json() as {
        success: boolean;
        data?: ApiProduct;
        error?: { message?: string } | string;
      };

      if (!res.ok || !json.success || !json.data) {
        const errorMsg = typeof json.error === 'string'
          ? json.error
          : json.error?.message ?? 'Product not found.';
        throw new Error(errorMsg);
      }

      cacheProduct(json.data);
      setProduct(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product details.');
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProduct();
  }, [fetchProduct]);

  const refetch = useCallback(() => fetchProduct(true), [fetchProduct]);

  return { product, isLoading, error, refetch };
}
