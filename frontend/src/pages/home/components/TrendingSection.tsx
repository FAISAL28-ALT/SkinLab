import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { WishlistButton } from '@/components/shared/WishlistButton';
import { useApiProducts } from '@/features/catalog/hooks/useApiProducts';
import { apiProductToProduct } from '@/features/catalog/hooks/useProducts';

const INITIAL_TRENDING_ORDER = ['013', '021', '024', '009', '028', '007'];

export const TrendingSection: React.FC = () => {
  const { products: apiProducts, isLoading } = useApiProducts({
    trending: true,
    limit: 50,
  });

  const trendingProducts = useMemo(() => {
    if (!apiProducts || apiProducts.length === 0) return [];

    const publishedTrending = apiProducts
      .filter((p) => p.isTrending && (!p.status || p.status === 'PUBLISHED'))
      .map(apiProductToProduct);

    return [...publishedTrending].sort((a, b) => {
      const cleanA = a.designNumber.replace(/^0+/, '');
      const cleanB = b.designNumber.replace(/^0+/, '');
      const idxA = INITIAL_TRENDING_ORDER.findIndex(
        (num) => num.replace(/^0+/, '') === cleanA || num === a.designNumber
      );
      const idxB = INITIAL_TRENDING_ORDER.findIndex(
        (num) => num.replace(/^0+/, '') === cleanB || num === b.designNumber
      );
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }, [apiProducts]);

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
        {isLoading && trendingProducts.length === 0 ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="group min-w-0 animate-pulse">
              <div className="relative block w-full aspect-[18/10.5] overflow-hidden rounded-xl bg-[#F6F8FB]" />
              <div className="mt-2.5 flex min-w-0 items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="h-5 w-8 rounded-md bg-[#E8EAEF] block flex-shrink-0" />
                  <span className="h-4 w-20 rounded bg-[#E8EAEF] block" />
                </div>
                <div className="w-6 h-6 rounded-full bg-[#E8EAEF] flex-shrink-0" />
              </div>
            </div>
          ))
        ) : (
          trendingProducts.map((product) => {
            const displayNum = product.designNumber.length === 3 && product.designNumber.startsWith('0')
              ? product.designNumber.slice(1)
              : product.designNumber;

            return (
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
                      #{displayNum}
                    </span>
                    <span className="text-xs font-bold text-brand-navy truncate group-hover/name:text-brand-orange transition-colors">
                      {product.name}
                    </span>
                  </Link>
                  <WishlistButton productId={product.id} size="sm" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
