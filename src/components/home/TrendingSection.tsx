import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { WishlistButton } from '../common/WishlistButton';

export const TrendingSection: React.FC = () => {
  const trendingProducts = [
    { id: 'skin-013', number: '13', name: 'Space & Galaxy', image: '/assets/skins/travel/cosmic-astronaut.png' },
    { id: 'skin-021', number: '21', name: 'Cartoon & Animation', image: '/assets/skins/travel/tom-angry-cat.png' },
    { id: 'skin-024', number: '24', name: 'Porsche GTR', image: '/assets/skins/cars/GTR.png' },
    { id: 'skin-009', number: '09', name: 'Anime Blue', image: '/assets/skins/anime/Itachi.png' },
    { id: 'pain', number: '28', name: 'Nezuko Art', image: '/assets/skins/anime/pain.webp' },
    { id: 'skin-007', number: '07', name: 'Porsche 911 GT3', image: '/assets/skins/cars/Porsche 911 GT3.png' },
  ];

  return (
    <section className="px-2 sm:px-4 md:px-6 py-6 md:py-8 bg-white">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-[2px] bg-brand-navy/60 inline-block" />
          <h3 className="font-display font-extrabold text-xl md:text-2xl text-brand-navy tracking-tight">
            Trending Designs
          </h3>
        </div>

        <Link
          to="/catalog"
          className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-brand-navy hover:text-brand-orange transition-colors group"
        >
          <span>View All Designs</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* 6 Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {trendingProducts.map((product) => (
          <div key={product.id} className="group min-w-0">
            <Link
              to={`/product/${product.id}`}
              className="relative block w-full aspect-[18/10.5] overflow-hidden rounded-xl transition-shadow duration-200 group-hover:shadow-card"
            >
              <img
                src={product.image}
                alt={`${product.name} Laptop Skin`}
                className="block w-full h-full rounded-xl object-cover object-center transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                style={{ imageRendering: 'auto' }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  const placeholder = event.currentTarget.nextElementSibling;
                  placeholder?.classList.remove('hidden');
                  placeholder?.classList.add('flex');
                }}
              />
              <div className="absolute inset-0 hidden items-center justify-center bg-[#F6F8FB] text-xs font-semibold text-brand-secondary">
                Image unavailable
              </div>
            </Link>

            <div className="mt-2.5 flex min-w-0 items-center justify-between gap-1.5">
              <Link
                to={`/product/${product.id}`}
                className="flex min-w-0 flex-1 items-center gap-1.5 group/name"
              >
                <span className="text-[11px] font-mono font-bold text-brand-navy/70 bg-[#E8EAEF] px-1.5 py-0.5 rounded-md flex-shrink-0">
                  #{product.number}
                </span>
                <span className="text-xs font-bold text-brand-navy truncate group-hover/name:text-brand-orange transition-colors">
                  {product.name}
                </span>
              </Link>
              <WishlistButton productId={product.id} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
