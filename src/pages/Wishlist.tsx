import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { Heart, Trash2, Eye, ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';

export const Wishlist: React.FC = () => {
  const { wishlistProducts, removeFromWishlist, clearWishlist, wishlistCount } = useWishlist();
  const navigate = useNavigate();

  return (
    <div className="px-2 sm:px-4 md:px-6 py-6 bg-white min-h-[750px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart size={16} className="text-red-500 fill-red-500" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-brand-navy/60 font-display">
              SAVED SKINS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-navy font-display tracking-tight">
            My Wishlist ({wishlistCount})
          </h1>
        </div>

        {wishlistCount > 0 && (
          <button
            type="button"
            onClick={clearWishlist}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors self-start sm:self-center"
          >
            <Trash2 size={14} />
            Clear Wishlist
          </button>
        )}
      </div>

      {/* Empty State */}
      {wishlistCount === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-400 flex items-center justify-center mb-4">
            <Heart size={36} className="stroke-[1.5]" />
          </div>
          <h2 className="font-display font-bold text-2xl text-brand-navy">
            Your Wishlist is Empty
          </h2>
          <p className="text-sm text-brand-navy/60 max-w-sm mt-2 leading-relaxed">
            You haven't saved any laptop skin designs yet. Explore our catalog or test designs in the Laptop Studio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/catalog"
              className="px-6 py-3 rounded-full bg-brand-navy hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              Browse Catalog
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/preview"
              className="px-6 py-3 rounded-full bg-brand-lime text-brand-navy text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              Open Laptop Studio
            </Link>
          </div>
        </div>
      ) : (
        /* Saved Products Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-3xl p-4 border border-brand-border hover:border-brand-navy/40 transition-all duration-300 hover:shadow-card flex flex-col justify-between"
            >
              {/* Image & Remove Action */}
              <div className="relative">
                <Link
                  to={`/product/${product.id}`}
                  className="relative block w-full aspect-[16/11] overflow-hidden rounded-2xl bg-[#F6F8FB] flex items-center justify-center p-3"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 left-2.5 bg-brand-navy text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    #{product.designNumber}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-red-50 text-red-500 border border-brand-border flex items-center justify-center transition-colors shadow-sm"
                  title="Remove from wishlist"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Info */}
              <div className="mt-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-brand-orange">
                    {product.category}
                  </div>
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-display font-bold text-base text-brand-navy hover:text-brand-orange transition-colors truncate">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-brand-navy/60 line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between">
                  {product.price && (
                    <span className="text-base font-extrabold text-brand-navy font-display">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[11px] text-emerald-600 font-bold">
                    In Stock
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/preview?skin=${product.id}`)}
                    className="w-full py-2 px-3 rounded-full bg-brand-card hover:bg-brand-border text-brand-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-brand-border"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                  <Link
                    to={`/product/${product.id}`}
                    className="w-full py-2 px-3 rounded-full bg-brand-navy hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    Details
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
