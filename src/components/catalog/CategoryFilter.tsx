import React from 'react';
import { CategoryType } from '../../types/product';
import { Zap, Car, Plane, Gamepad2, Mountain, LayoutGrid, Layers } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  productCounts?: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  productCounts = {},
}) => {
  const categories: { id: CategoryType; label: string; icon: React.ElementType }[] = [
    { id: 'All', label: 'All Skins', icon: Layers },
    { id: 'Anime', label: 'Anime', icon: Zap },
    { id: 'Cars', label: 'Cars', icon: Car },
    { id: 'Travel', label: 'Travel', icon: Plane },
    { id: 'Gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'Aesthetic', label: 'Aesthetic', icon: Mountain },
    { id: 'Abstract', label: 'Abstract', icon: LayoutGrid },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
        const count = productCounts[cat.id];

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              isSelected
                ? 'bg-brand-navy text-white shadow-sm'
                : 'bg-white border border-brand-border text-brand-navy/70 hover:border-brand-navy hover:text-brand-navy'
            }`}
          >
            <Icon size={14} className={isSelected ? 'text-brand-lime' : 'text-brand-navy/60'} />
            <span>{cat.label}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-brand-border/60 text-brand-navy/60'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
