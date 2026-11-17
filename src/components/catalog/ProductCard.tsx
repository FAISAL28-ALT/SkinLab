import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ArrowUpRight, Star } from 'lucide-react';
import { Product } from '../../types/product';
import { WishlistButton } from '../common/WishlistButton';

interface ProductCardProps {
  product: Product;
  variant?: 'trending' | 'catalog';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'catalog',
}) => {
  const navigate = useNavigate();

  // "trending" variant matches the exact homepage bottom row from the reference image
  if (variant === 'trending') {
    return (
      <div className="group relative bg-[#F7F8FA] hover:bg-white rounded-2xl p-2.5 sm:p-3 border border-[#E5E7EB] hover:border-brand-navy/30 transition-all duration-200 hover:shadow-card flex flex-col justify-between">
        {/* Product Mockup Image Container */}
        <Link
          to={`/product/${product.id}`}
          className="relative block w-full aspect-[16/10.5] overflow-hidden rounded-xl bg-white border border-[#F0F2F5] flex items-center justify-center p-2 group-hover:border-transparent transition-colors"
        >
          <img
            src={product.image}
            alt={`${product.name} Laptop Skin`}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            style={{ imageRendering: 'auto' }}
          />

          {/* Quick Preview Hover Overlay (Clean, no heavy blur) */}
          <div className="absolute inset-0 bg-brand-navy/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/preview?skin=${product.id}`);
              }}
              className="px-3 py-1 rounded-full bg-brand-lime text-brand-navy font-bold text-xs flex items-center gap-1 shadow hover:bg-white transition-colors"
            >
              <Eye size={12} />
              Preview
            </button>
          </div>
        </Link>

        {/* Bottom Pill Bar (Matches Reference Image Exactly) */}
        <div className="mt-2.5 flex items-center justify-between gap-1.5">
          <Link
            to={`/product/${product.id}`}
            className="flex items-center gap-1.5 min-w-0 flex-1 group/name"
          >
            <span className="text-[11px] font-mono font-bold text-brand-navy/70 bg-[#E8EAEF] px-1.5 py-0.5 rounded-md flex-shrink-0">
              #{product.designNumber}
            </span>
            <span className="text-xs font-bold text-brand-navy truncate group-hover/name:text-brand-orange transition-colors">
              {product.name}
            </span>
          </Link>

          {/* Wishlist Heart Icon */}
          <WishlistButton productId={product.id} size="sm" />
        </div>
      </div>
    );
  }

  // "catalog" variant for the Catalog page with richer info (price, rating, buttons)
  return (
    <div className="group bg-white rounded-3xl p-4 border border-brand-border hover:border-brand-navy/40 transition-all duration-200 hover:shadow-card flex flex-col justify-between">
      {/* Top badges & Image */}
      <div className="relative">
        <Link
          to={`/product/${product.id}`}
          className="relative block w-full aspect-[16/11] overflow-hidden rounded-2xl bg-[#F6F8FB] flex items-center justify-center p-3"
        >
          <img
            src={product.image}
            alt={`${product.name} Laptop Skin`}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            style={{ imageRendering: 'auto' }}
          />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
            {product.badge && (
              <span className="bg-brand-lime text-brand-navy text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                {product.badge}
              </span>
            )}
            {product.isNew && !product.badge && (
              <span className="bg-brand-navy text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                NEW
              </span>
            )}
          </div>
        </Link>

        {/* Floating Wishlist Button */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <WishlistButton productId={product.id} size="sm" />
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-brand-secondary mb-1">
            <span className="font-semibold text-brand-orange">{product.category}</span>
            <span className="font-mono font-bold">#{product.designNumber}</span>
          </div>

          <Link to={`/product/${product.id}`} className="block">
            <h4 className="font-display font-bold text-base text-brand-navy group-hover:text-brand-orange transition-colors truncate">
              {product.name}
            </h4>
          </Link>

          <p className="text-xs text-brand-secondary line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Rating and Price */}
        <div className="mt-3 pt-3 border-t border-brand-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-brand-yellow fill-brand-yellow" />
            <span className="text-xs font-bold text-brand-navy">{product.rating}</span>
            <span className="text-[11px] text-brand-secondary">({product.reviewCount})</span>
          </div>

          {product.price && (
            <div className="text-right">
              <span className="text-base font-extrabold text-brand-navy font-display">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="ml-1.5 text-xs text-brand-secondary line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate(`/preview?skin=${product.id}`)}
            className="w-full py-2 px-3 rounded-full bg-brand-card hover:bg-[#EDEFF2] text-brand-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-brand-border"
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
  );
};
