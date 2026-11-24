import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useProducts } from '@/features/catalog/hooks/useProducts';
import { CategoryFilter } from '@/features/catalog/components/CategoryFilter';
import { SortFilter } from '@/features/catalog/components/SortFilter';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { SearchBar } from '@/components/shared/SearchBar';
import {
  CollectionType,
  DEVICE_CATEGORIES,
  DeviceCategorySlug,
} from '@/features/catalog/types/product';
import {
  Laptop,
  Smartphone,
  Tablet,
  Camera,
  Cylinder,
  CreditCard,
  Gamepad2,
  Command,
  Layers,
  ChevronDown,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

const CATEGORY_ICONS = {
  Laptop,
  Smartphone,
  Tablet,
  Camera,
  Cylinder,
  CreditCard,
  Gamepad2,
  Command,
} as const;

export const Catalog: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const [flashNotice, setFlashNotice] = useState<string | null>(location.state?.notice ?? null);
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const rawCategoryParam = searchParams.get('category') || 'laptop-skins';
  const rawCollectionParam = searchParams.get('collection') || searchParams.get('style') || 'All';

  // Backward compatibility: If an old design style / collection was passed as category
  const legacyStyles = ['all', 'anime', 'cars', 'travel', 'gaming', 'aesthetic', 'abstract'];
  const isLegacyStyle = legacyStyles.includes(rawCategoryParam.toLowerCase());
  const initialDeviceCategory = isLegacyStyle ? 'laptop-skins' : rawCategoryParam;
  const initialCollection = isLegacyStyle
    ? (rawCategoryParam.charAt(0).toUpperCase() + rawCategoryParam.slice(1).toLowerCase()) as CollectionType
    : (rawCollectionParam as CollectionType);

  const {
    products,
    totalCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCollection,
    setSelectedCollection,
    sortBy,
    setSortBy,
  } = useProducts(initialDeviceCategory, initialCollection);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Sync url params when changed
  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
    if (!isLegacyStyle && rawCategoryParam) {
      setSelectedCategory(rawCategoryParam);
    }
    if (rawCollectionParam) {
      setSelectedCollection(rawCollectionParam as CollectionType);
    }
  }, [queryParam, rawCategoryParam, rawCollectionParam, isLegacyStyle, setSearchQuery, setSelectedCategory, setSelectedCollection]);

  // Click outside listener for category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };

    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen]);

  useEffect(() => {
    if (location.state?.notice) {
      setFlashNotice(location.state.notice);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const activeCategoryConfig =
    DEVICE_CATEGORIES.find(
      (c) => c.slug.toLowerCase() === selectedCategory.toLowerCase()
    ) || DEVICE_CATEGORIES[0];

  const handleDeviceCategorySelect = (categorySlug: DeviceCategorySlug) => {
    setSelectedCategory(categorySlug);
    setIsCategoryOpen(false);

    const newParams = new URLSearchParams(searchParams);
    newParams.set('category', categorySlug);
    setSearchParams(newParams);
  };

  const handleCollectionSelect = (col: CollectionType) => {
    setSelectedCollection(col);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('style');
    if (col === 'All') {
      newParams.delete('collection');
    } else {
      newParams.set('collection', col);
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCollection('All');
    setSortBy('featured');

    const newParams = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'laptop-skins') {
      newParams.set('category', selectedCategory);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="px-2 sm:px-4 md:px-6 py-6 bg-white min-h-[750px]">
      {flashNotice && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-brand-lime/50 bg-brand-lime/15 px-4 py-3.5 text-sm font-bold text-brand-navy shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-lime text-brand-navy">
              <Check size={14} strokeWidth={3} />
            </span>
            <span>{flashNotice}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setFlashNotice(null)}
            className="rounded-lg p-1 text-brand-navy/60 hover:bg-brand-lime/30 hover:text-brand-navy"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-brand-navy/60 font-display">
            SKINLAB COMPLETE COLLECTION
          </span>
          <span className="w-8 h-[1.5px] bg-brand-navy/30 inline-block" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand-navy font-display tracking-tight">
              {activeCategoryConfig.heading}
            </h1>
            <p className="text-brand-navy/65 text-sm md:text-base mt-1.5 max-w-xl">
              {activeCategoryConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono font-bold bg-brand-card px-3 py-1.5 rounded-full border border-brand-border text-brand-navy">
              Showing <span className="text-brand-orange">{products.length}</span> of {totalCount} Designs
            </span>
            {profile?.role === 'SHOP_ADMIN' && (
              <Link
                to={{
                  pathname: '/product/new',
                  search: `?category=${selectedCategory}`,
                }}
                state={{ category: selectedCategory }}
                className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-4 py-2 text-xs font-extrabold text-brand-navy shadow-neo-sm transition hover:bg-[#b5e03b] sm:text-sm"
              >
                <Plus size={17} strokeWidth={2.5} /> Add New Design
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="w-full box-border space-y-3.5 sm:space-y-4 mb-6 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-brand-card/50 border border-brand-border/80">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-center">
          {/* Search Bar */}
          <div className="w-full md:col-span-7">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                const newParams = new URLSearchParams(searchParams);
                if (val) newParams.set('q', val);
                else newParams.delete('q');
                setSearchParams(newParams);
              }}
              placeholder={activeCategoryConfig.searchPlaceholder}
              variant="light"
            />
          </div>

          {/* Category Dropdown & Sort Filter */}
          <div className="w-full md:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 md:justify-end">
            {/* Category Dropdown */}
            <div className="relative w-full sm:w-auto" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                className="flex items-center justify-between sm:justify-start gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-full border border-brand-border bg-white text-xs font-semibold text-brand-navy shadow-sm w-full sm:w-auto cursor-pointer hover:border-brand-navy/30 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isCategoryOpen}
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Layers size={13} className="text-brand-navy/60 flex-shrink-0" />
                  <span className="text-brand-navy/50 flex-shrink-0">Category:</span>
                  <span className="font-bold text-brand-navy truncate">{activeCategoryConfig.name}</span>
                </div>
                <ChevronDown
                  size={13}
                  className={`text-brand-navy/60 ml-0.5 transition-transform duration-150 flex-shrink-0 ${
                    isCategoryOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isCategoryOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 min-w-[210px] w-full sm:w-auto bg-white rounded-2xl border border-brand-border shadow-lg py-1.5 overflow-hidden"
                >
                  {DEVICE_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.iconName];
                    const isSelected =
                      selectedCategory.toLowerCase() === cat.slug.toLowerCase();
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleDeviceCategorySelect(cat.slug)}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-brand-navy hover:bg-brand-card/70 transition-colors"
                      >
                        <Icon size={15} className="text-brand-navy/70 flex-shrink-0" />
                        <span className="flex-1 whitespace-nowrap">{cat.name}</span>
                        {isSelected && (
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            className="text-brand-navy ml-auto flex-shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sort Filter */}
            <SortFilter sortBy={sortBy} onSortChange={setSortBy} />
          </div>
        </div>

        {/* Collection Pill Filters */}
        <div className="pt-2 border-t border-brand-border/60 w-full min-w-0 overflow-hidden">
          <CategoryFilter
            selectedCollection={selectedCollection}
            onSelectCollection={handleCollectionSelect}
          />
        </div>
      </div>

      {/* Products Grid */}
      <ProductGrid
        products={products}
        onResetFilters={handleResetFilters}
        isLoading={isLoading}
        emptyMessage={activeCategoryConfig.emptyMessage}
      />
    </div>
  );
};
