/**
 * useProducts — now wraps the live API catalogue.
 *
 * Keeps the same external interface so Catalog.tsx and other consumers
 * do not need structural changes. All filtering and sorting is delegated
 * to the backend; the hook simply manages the query parameters as state.
 */

import { useMemo, useState } from 'react';
import { CollectionType } from '@/features/catalog/types/product';
import { useApiProducts, type ApiProduct } from '@/features/catalog/hooks/useApiProducts';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'design-number';

/** Convert an ApiProduct from the backend into the Product shape used across SkinLab. */
export function apiProductToProduct(p: ApiProduct) {
  const primaryImage = p.images.find((img) => img.isPrimary) ?? p.images[0];
  const collectionName = p.collection || p.designStyle || undefined;
  const categoryName = p.category?.name || 'Laptop Skins';
  return {
    id: p.id,
    designNumber: p.designNumber,
    name: p.title,
    category: categoryName,
    categorySlug: p.category?.slug,
    categoryName: categoryName,
    collection: collectionName,
    designStyle: collectionName,
    description: p.description,
    price: p.price != null ? parseFloat(p.price) : undefined,
    originalPrice: p.originalPrice != null ? parseFloat(p.originalPrice) : undefined,
    rating: p.rating != null ? parseFloat(p.rating) : undefined,
    reviewCount: p.reviewCount,
    image: primaryImage?.url ?? '',
    images: p.images ? [...p.images].sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.url) : [],
    laptopCompatibility: p.laptopCompatibility,
    featured: p.isFeatured,
    isTrending: Boolean(p.isTrending),
    isBestseller: Boolean(p.isBestseller),
    isNew: p.isNew,
    finish: p.finish as 'Matte Anti-Glare' | 'Glossy Ultra' | 'Textured Vinyl' | undefined,
    material: p.material ?? undefined,
    dimensions: p.dimensions ?? undefined,
    badge: p.badge ?? undefined,
  };
}

export function useProducts(initialCategory: string = 'laptop-skins', initialCollection: CollectionType = 'All') {
  // If an old style name was passed as initialCategory, handle gracefully
  const legacyStyles = ['all', 'anime', 'cars', 'travel', 'gaming', 'aesthetic', 'abstract'];
  const isLegacyStyle = legacyStyles.includes(initialCategory.toLowerCase());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(isLegacyStyle ? 'laptop-skins' : initialCategory);
  const [selectedCollection, setSelectedCollection] = useState<CollectionType>(
    isLegacyStyle
      ? (initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1).toLowerCase() as CollectionType)
      : initialCollection
  );
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [selectedLaptop, setSelectedLaptop] = useState<string>('all');

  const { products: apiProducts, pagination, isLoading, error, refetch } = useApiProducts({
    category: selectedCategory,
    collection: selectedCollection,
    search: searchQuery,
    laptop: selectedLaptop,
    sort: sortBy,
    limit: 24, // Optimized page limit for responsive grid (2, 3, 4 columns)
  });

  const products = useMemo(() => apiProducts.map(apiProductToProduct), [apiProducts]);

  return {
    products,
    totalCount: pagination?.total ?? products.length,
    isLoading,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCollection,
    setSelectedCollection,
    // Backward compatibility aliases:
    selectedStyle: selectedCollection,
    setSelectedStyle: setSelectedCollection,
    sortBy,
    setSortBy,
    selectedLaptop,
    setSelectedLaptop,
  };
}
