import React from 'react';
import { Car, Gamepad2, LayoutGrid, Mountain, Plane, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CategoryType } from '@/features/catalog/types/product';
import { CATEGORIES } from '@/features/catalog/data/categories';

const CATEGORY_ICONS = { Zap, Car, Plane, Gamepad2, Mountain, LayoutGrid } as const;

interface CategorySectionProps {
  activeCategory?: CategoryType;
  onSelectCategory?: (category: CategoryType) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  activeCategory = 'Anime',
  onSelectCategory,
}) => {
  const navigate = useNavigate();

  const handleCategoryClick = (catId: CategoryType) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      navigate(`/catalog?category=${catId}`);
    }
  };

  return (
    <div className="space-y-4 ">
      {/* Title with yellow sparkle */}
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-brand-yellow fill-brand-yellow" />
        <h3 className="font-display font-bold text-base md:text-lg text-brand-navy">
          Explore Categories
        </h3>
      </div>

      {/* 2-column or grid of pill buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.iconName as keyof typeof CATEGORY_ICONS];
          const isActive = activeCategory.toLowerCase() === cat.id.toLowerCase();

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs md:text-sm font-bold border border-black transition-all ${
                isActive
                  ? 'bg-brand-lime text-brand-navy shadow-sm'
                  : 'bg-white text-brand-navy/80 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-brand-navy' : 'text-brand-navy/60'} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
