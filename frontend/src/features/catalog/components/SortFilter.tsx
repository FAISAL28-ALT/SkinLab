import React from 'react';
import { SortOption } from '@/features/catalog/hooks/useProducts';
import { ArrowUpDown } from 'lucide-react';

interface SortFilterProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

export const SortFilter: React.FC<SortFilterProps> = ({ sortBy, onSortChange, className = '' }) => {
  return (
    <div className={`relative w-full sm:w-auto ${className}`}>
      <div className="flex items-center justify-between sm:justify-start gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-full border border-brand-border bg-white text-xs font-semibold text-brand-navy shadow-sm w-full sm:w-auto transition-colors hover:border-brand-navy/30">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ArrowUpDown size={13} className="text-brand-navy/60 flex-shrink-0" />
          <span className="text-brand-navy/50 flex-shrink-0">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent font-bold text-brand-navy outline-none cursor-pointer flex-1 min-w-0 pr-1 text-xs"
          >
            <option value="featured">Featured First</option>
            <option value="newest">Newest Releases</option>
            <option value="rating">Highest Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="design-number">Design Number</option>
          </select>
        </div>
      </div>
    </div>
  );
};
