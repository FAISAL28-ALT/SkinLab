import React from 'react';
import { Product } from '@/features/catalog/types/product';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { SearchX, RotateCcw } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onResetFilters?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onResetFilters,
  isLoading = false,
  emptyMessage,
}) => {
  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 my-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-3xl p-4 border border-brand-border flex flex-col justify-between">
            <div className="w-full aspect-[16/11] rounded-2xl bg-brand-card/70" />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-brand-border/60 rounded" />
                <div className="h-3 w-10 bg-brand-border/60 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-brand-border/80 rounded" />
              <div className="h-3 w-full bg-brand-border/40 rounded" />
            </div>
            <div className="mt-4 pt-3 border-t border-brand-border/60 flex justify-between items-center">
              <div className="h-4 w-16 bg-brand-border/60 rounded" />
              <div className="h-5 w-14 bg-brand-border/80 rounded" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-8 bg-brand-border/40 rounded-full" />
              <div className="h-8 bg-brand-border/60 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 px-6 text-center bg-[#F6F8FB] rounded-3xl border border-dashed border-brand-border flex flex-col items-center justify-center my-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-orange/15 text-brand-orange flex items-center justify-center mb-4">
          <SearchX size={32} />
        </div>
        <h3 className="font-display font-bold text-xl text-brand-navy">
          No matching skins found
        </h3>
        <p className="text-sm text-brand-navy/60 max-w-md mt-1.5 leading-relaxed">
          {emptyMessage || "We couldn't find any laptop skins matching your search criteria. Try a different search term, category filter, or reset your filters."}
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-6 px-6 py-2.5 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center gap-2 hover:bg-black transition-all shadow-sm"
          >
            <RotateCcw size={14} />
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 my-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} variant="catalog" priority={index < 4} />
      ))}
    </div>
  );
};
