import React from 'react';
import { Product } from '../../types/product';
import { ProductCard } from './ProductCard';
import { SearchX, RotateCcw } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onResetFilters?: () => void;
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onResetFilters,
}) => {
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
          We couldn't find any laptop skins matching your search criteria. Try a different search term, category filter, or reset your filters.
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
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="catalog" />
      ))}
    </div>
  );
};
