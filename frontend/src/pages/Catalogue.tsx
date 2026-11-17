import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProducts, SortOption } from '@/hooks/useProducts';
import { CategoryFilter } from '@/components/catalogue/CategoryFilter';
import { SortFilter } from '@/components/catalogue/SortFilter';
import { ProductGrid } from '@/components/catalogue/ProductGrid';
import { SearchBar } from '@/components/common/SearchBar';
import { CategoryType } from '@/types/product';
import { LAPTOP_MODELS } from '@/data/laptops';
import { Sparkles, SlidersHorizontal, Laptop, Plus } from 'lucide-react';

export const Catalogue: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const categoryParam = (searchParams.get('category') as CategoryType) || 'All';

  const {
    products,
    totalCount,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    selectedLaptop,
    setSelectedLaptop,
  } = useProducts(categoryParam);

  // Sync url params when changed
  useEffect(() => {
    if (queryParam) setSearchQuery(queryParam);
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [queryParam, categoryParam, setSearchQuery, setSelectedCategory]);

  const handleCategorySelect = (cat: CategoryType) => {
    setSelectedCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', cat);
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedLaptop('all');
    setSortBy('featured');
    setSearchParams({});
  };

  return (
    <div className="px-2 sm:px-4 md:px-6 py-6 bg-white min-h-[750px]">
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
              Laptop Skins Catalog
            </h1>
            <p className="text-brand-navy/65 text-sm md:text-base mt-1.5 max-w-xl">
              Precision die-cut skins engineered with authentic 3M materials. Filter by design style, category, or search directly by design number.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono font-bold bg-brand-card px-3 py-1.5 rounded-full border border-brand-border text-brand-navy">
              Showing <span className="text-brand-orange">{products.length}</span> of {totalCount} Designs
            </span>
            <Link to="/admin/products/new" className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-4 py-2 text-xs font-extrabold text-brand-navy shadow-neo-sm transition hover:bg-[#b5e03b] sm:text-sm">
              <Plus size={17} strokeWidth={2.5} /> Add New Design
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="space-y-4 mb-6 p-5 rounded-3xl bg-brand-card/50 border border-brand-border/80">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="md:col-span-7">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                const newParams = new URLSearchParams(searchParams);
                if (val) newParams.set('q', val);
                else newParams.delete('q');
                setSearchParams(newParams);
              }}
              placeholder="Search by skin name, design # (e.g. 28, London, GT3)..."
              variant="light"
            />
          </div>

          {/* Laptop Compatibility Filter */}
          <div className="md:col-span-5 flex items-center gap-2 justify-end">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-brand-border bg-white text-xs font-semibold text-brand-navy shadow-sm w-full md:w-auto">
              <Laptop size={13} className="text-brand-navy/60" />
              <span className="text-brand-navy/50">Model:</span>
              <select
                value={selectedLaptop}
                onChange={(e) => setSelectedLaptop(e.target.value)}
                className="bg-transparent font-bold text-brand-navy outline-none cursor-pointer pr-1 flex-1 md:flex-none"
              >
                <option value="all">All Compatible Laptops</option>
                {LAPTOP_MODELS.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <SortFilter sortBy={sortBy} onSortChange={setSortBy} />
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="pt-2 border-t border-brand-border/60">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>
      </div>

      {/* Products Grid */}
      <ProductGrid
        products={products}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
};
