import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../hooks/useWishlist';

interface WishlistButtonProps {
  productId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  size = 'md',
  className = '',
  showText = false,
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const saved = isInWishlist(productId);

  const iconSizes = {
    sm: 15,
    md: 18,
    lg: 22,
  };

  const buttonSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
      }}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`group flex items-center justify-center transition-all duration-200 rounded-full ${
        showText
          ? 'px-4 py-2 border font-medium text-sm'
          : `${buttonSizes[size]} bg-white/90 hover:bg-white shadow-sm border border-brand-border`
      } ${
        saved
          ? 'text-red-500 border-red-200 bg-red-50/80 hover:bg-red-50'
          : 'text-brand-navy/70 hover:text-red-500'
      } ${className}`}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-transform duration-200 group-hover:scale-110 ${
          saved ? 'fill-red-500 text-red-500' : 'stroke-[1.8]'
        }`}
      />
      {showText && (
        <span className="ml-2 font-medium">
          {saved ? 'In Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
};
