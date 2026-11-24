import { useState, useEffect, useCallback } from 'react';
import { Product } from '@/features/catalog/types/product';
import { PRODUCTS } from '@/features/catalog/data/products';

const STORAGE_KEY = 'skinlab_wishlist_ids';
const WISHLIST_EVENT = 'skinlab_wishlist_updated';

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback to empty
    }
    // Default with 4 items as shown in mockup badge (badge shows '4')
    return [
      'fd3db38f-cd28-4da0-9cdf-85411debb5b6',
      '71a339d3-2dfd-4436-bcec-a34cae2504e8',
      'cf3c5c2c-8443-4773-81c4-0b36181bda1e',
      '56e885a6-f034-4453-8377-d7a4527023a1',
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore storage quota issues
    }

    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setWishlistIds(JSON.parse(saved));
      } catch {
        // ignore
      }
    };

    window.addEventListener(WISHLIST_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [wishlistIds]);

  const broadcast = (ids: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event(WISHLIST_EVENT));
    } catch {
      // ignore
    }
  };

  const isInWishlist = useCallback((id: string) => wishlistIds.includes(id), [wishlistIds]);

  const toggleWishlist = useCallback((id: string) => {
    setWishlistIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      broadcast(next);
      return next;
    });
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    setWishlistIds((prev) => {
      const next = prev.filter((item) => item !== id);
      broadcast(next);
      return next;
    });
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlistIds([]);
    broadcast([]);
  }, []);

  const wishlistProducts: Product[] = wishlistIds
    .map((id) => PRODUCTS.find((p) => p.id === id || p.designNumber === id.replace(/^skin-0?/, '')))
    .filter((p): p is Product => Boolean(p));

  return {
    wishlistIds,
    wishlistCount: wishlistIds.length,
    wishlistProducts,
    isInWishlist,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
  };
}
