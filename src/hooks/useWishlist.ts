import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types/product';
import { PRODUCTS } from '../data/products';

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
    return ['skin-028', 'skin-013', 'skin-024', 'skin-009'];
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
    .map((id) => PRODUCTS.find((p) => p.id === id))
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
