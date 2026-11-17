import { useState, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { Product, CategoryType } from '../types/product';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'design-number';

export function useProducts(initialCategory: CategoryType = 'All') {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [selectedLaptop, setSelectedLaptop] = useState<string>('all');

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Category match
      const categoryMatch = 
        selectedCategory === 'All' || product.category.toLowerCase() === selectedCategory.toLowerCase();

      // Search match: name or designNumber (e.g., "28", "#28", "Nezuko", "cars")
      const cleanQuery = searchQuery.trim().toLowerCase().replace(/^#/, '');
      const searchMatch = !cleanQuery || 
        product.name.toLowerCase().includes(cleanQuery) ||
        product.designNumber.toLowerCase().includes(cleanQuery) ||
        product.category.toLowerCase().includes(cleanQuery) ||
        product.description.toLowerCase().includes(cleanQuery);

      // Laptop model match
      const laptopMatch = 
        selectedLaptop === 'all' || product.laptopCompatibility.includes(selectedLaptop);

      return categoryMatch && searchMatch && laptopMatch;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        case 'price-asc':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'price-desc':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'design-number':
          return parseInt(a.designNumber, 10) - parseInt(b.designNumber, 10);
        case 'featured':
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
    });
  }, [searchQuery, selectedCategory, sortBy, selectedLaptop]);

  return {
    products: filteredProducts,
    totalCount: PRODUCTS.length,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    selectedLaptop,
    setSelectedLaptop,
  };
}
