import React, { useState } from 'react';
import { HeroSection } from '@/pages/home/components/HeroSection';
import { CategorySection } from '@/pages/home/components/CategorySection';
import { CollectionSection } from '@/pages/home/components/CollectionSection';
import { TrendingSection } from '@/pages/home/components/TrendingSection';
import { MobileSkinsSection } from '@/pages/home/components/MobileSkinsSection';
import { CategoryType } from '@/features/catalog/types/product';

export const Home: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('Anime');

  return (
    <div className="w-full bg-white">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Explore Categories & Collection Cards Section */}
      <section className="px-2 sm:px-4 md:px-6 py-6 bg-white border-t border-brand-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Explore Categories */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <CategorySection
              activeCategory={activeCategory}
              onSelectCategory={(cat) => setActiveCategory(cat)}
            />
          </div>

          {/* Right Column: 3 Collection Cards (Anime, Cars, Travel) */}
          <div className="lg:col-span-8 flex flex-col justify-center">
            <CollectionSection />
          </div>
        </div>
      </section>

      {/* 3. Trending Designs Row (Exact replica of original reference bottom row) */}
      <TrendingSection />

      {/* 4. Mobile Skins Section */}
      <MobileSkinsSection />
    </div>
  );
};
