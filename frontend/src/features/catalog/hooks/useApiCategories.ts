/**
 * useApiCategories — fetches the active categories available to the signed-in
 * catalogue editor.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/auth/authService';

export interface ApiCategoryDetail {
  id: string;
  shopId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  iconName: string | null;
  cardColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
}

export function useApiCategories() {
  const [categories, setCategories] = useState<ApiCategoryDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/categories/admin/active');
      const json = await response.json().catch(() => null) as {
        success?: boolean;
        data?: ApiCategoryDetail[];
        error?: { message?: string };
      } | null;

      if (!response.ok || !json?.success || !Array.isArray(json.data)) {
        setCategories([]);
        setError(json?.error?.message ?? 'Failed to load categories.');
        return;
      }

      setCategories(json.data);
      setError(null);
    } catch {
      setCategories([]);
      setError('Unable to reach the category service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return { categories, isLoading, error, retry: loadCategories };
}
