import React from 'react';
import { SortOption } from '../../hooks/useProducts';
import { ArrowUpDown } from 'lucide-react';

interface SortFilterProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const SortFilter: React.FC<SortFilterProps> = ({ sortBy, onSortChange }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-brand-border bg-white text-xs font-semibold text-brand-navy shadow-sm">
          <ArrowUpDown size={13} className="text-brand-navy/60" />
          <span className="text-brand-navy/50">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent font-bold text-brand-navy outline-none cursor-pointer pr-1"
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
