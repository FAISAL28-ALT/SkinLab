import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, ChevronDown, X, Sliders, Layers, LogOut, Settings } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/auth/AuthContext';

export const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { wishlistCount } = useWishlist();
  const { profile, signOut } = useAuth();

  // Track container width to dynamically anchor the organic curved transition
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  // Silhouette Calculation:
  // Height = 56px.
  // Left: starts at (0, 0), rounds bottom-left corner with r=24px at (0, 56).
  // Extends under Logo and Search bar to x_curve_start.
  // Then curves UP to (x_curve_end, 0) with a smooth organic S-curve fillet.
  // To the right of x_curve_end, the background is pure white (#FFFFFF), matching Screenshot B.
  const w = containerWidth;
  const isDesktop = w >= 860;
  
  // Right profile area width is ~260px on desktop
  const xCurveStart = Math.max(w - 300, 340);
  const xCurveEnd = Math.max(w - 250, 390);

  const blackTabSvgPath = isDesktop
    ? `M 0,0 L 0,32 Q 0,56 24,56 L ${xCurveStart},56 C ${xCurveStart + 25},56 ${xCurveEnd - 25},0 ${xCurveEnd},0 L 0,0 Z`
    : `M 0,0 L 0,32 Q 0,56 24,56 L ${w - 24},56 Q ${w},56 ${w},32 L ${w},0 Z`;

  return (
    <header className="sticky top-0 z-50 w-full select-none bg-white">
      <div
        ref={containerRef}
        className="relative w-full h-[56px] flex items-center justify-between"
      >
        {/* Black Navigation Tab Background (#050505) with Organic Curved Silhouette */}
        <svg
          className="absolute top-0 left-0 h-[56px] pointer-events-none z-0"
          width={w}
          height={56}
          viewBox={`0 0 ${w} 56`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={blackTabSvgPath} fill="#050505" />
        </svg>

        {/* ------------------------------------------------------------- */}
        {/* LEFT & CENTER (Inside Black Navigation Background)             */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-10 flex items-center flex-1 h-full pl-5 sm:pl-7 pr-3 gap-3 md:gap-6 min-w-0">
          
          {/* LEFT: SkinLab Logo in White with Lime Green Accent Dot */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 group">
            <span className="font-display font-extrabold text-[21px] sm:text-[23px] tracking-tight text-white group-hover:text-gray-200 transition-colors">
              SkinLab
            </span>
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#C5F04A] inline-block transform -translate-y-0.5 group-hover:scale-125 transition-transform" />
          </Link>

          {/* CENTER: Long Search Bar (Dark Charcoal #171717, Border #383838) */}
          <div className="hidden sm:flex flex-1 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <Search
                size={15}
                className="absolute left-3.5 text-[#A0A0A0] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skin by name, design number or category..."
                className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-[13px] text-[#FFFFFF] placeholder-[#A0A0A0] bg-[#171717] border border-[#383838] rounded-full outline-none focus:border-[#C5F04A] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-0.5 rounded-full text-[#A0A0A0] hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT: Action Icons & Profile (White Background on Desktop, Black on Mobile) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-10 flex items-center gap-3 sm:gap-4 md:gap-5 flex-shrink-0 pr-4 sm:pr-6 md:pr-8 pl-3">
          
          {/* Mobile Search Icon Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="sm:hidden p-1.5 rounded-full text-white hover:text-[#C5F04A] focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 transition-all"
            aria-label="Toggle search"
          >
            <Search size={18} />
          </button>

          {/* Wishlist Heart Icon */}
          <Link
            to="/wishlist"
            className={`relative p-1 rounded-full transition-colors ${
              isDesktop
                ? 'text-[#171A35] hover:text-red-500'
                : 'text-white hover:text-red-400'
            } min-[860px]:text-[#171A35] min-[860px]:hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            title="Wishlist"
            aria-label="Saved Wishlist"
          >
            <Heart size={20} className="stroke-[1.8]" />
          </Link>

          {/* Shopping Bag Icon with RED #FF3030 Notification Badge (4) */}
          <button
            type="button"
            className={`relative p-1 rounded-full transition-all ${
              isDesktop
                ? 'text-[#171A35] hover:text-[#FF681F]'
                : 'text-white hover:text-[#C5F04A] active:scale-95'
            } min-[860px]:text-[#171A35] min-[860px]:hover:text-[#FF681F] focus:outline-none focus-visible:ring-2 focus-visible:ring-white`}
            title="Shopping Bag"
            aria-label="Shopping Cart"
            onClick={() => navigate('/catalog')}
          >
            <ShoppingBag size={20} className="stroke-[1.8]" />
            <span className="absolute -top-1 -right-1.5 bg-[#FF3030] text-white font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none shadow-sm">
              4
            </span>
          </button>

          {profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                className="flex items-center gap-2 py-1 pl-1 pr-1 rounded-full hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-opacity"
              >
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#C5F04A] text-[#171A35] font-black text-[10px] sm:text-[11px] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#171A35]/15">
                  {(profile.fullName || profile.email).slice(0, 1).toUpperCase()}
                </span>
                <span
                  className={`hidden sm:inline text-xs sm:text-[13px] font-semibold tracking-tight ${
                    isDesktop ? 'text-[#171A35]' : 'text-white'
                  } min-[860px]:text-[#171A35]`}
                >
                  {profile.fullName || profile.role.replace('_', ' ')}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''} ${
                    isDesktop ? 'text-[#171A35]' : 'text-white'
                  } min-[860px]:text-[#171A35]`}
                />
              </button>
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#171A35] text-white rounded-2xl shadow-xl border border-white/10 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="font-bold text-white">{profile.fullName || profile.role.replace('_', ' ')}</p>
                    <p className="text-gray-300 text-[11px]">{profile.email}</p>
                  </div>
                  <Link to="/settings" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-gray-200">
                    <Settings size={14} className="text-gray-300" /> Settings
                  </Link>
                  <Link to="/wishlist" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-gray-200">
                    <Heart size={14} className="text-red-400" /> Saved Wishlist ({wishlistCount})
                  </Link>
                  <Link to="/preview" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-gray-200">
                    <Sliders size={14} className="text-brand-lime" /> Laptop Studio
                  </Link>
                  <Link to="/catalog" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-gray-200">
                    <Layers size={14} className="text-brand-blue" /> Browse All Skins
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      void signOut().finally(() => {
                        const isProtected = ['/product/new', '/settings', '/change-password'].some((p) => window.location.pathname.startsWith(p)) || window.location.pathname.endsWith('/edit');
                        if (isProtected) {
                          navigate('/', { replace: true });
                        }
                      });
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-gray-200 hover:bg-white/10"
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={`rounded-full px-3 py-2 text-xs sm:text-sm font-bold ${
                isDesktop
                  ? 'text-brand-navy hover:text-brand-blue'
                  : 'text-white hover:text-[#C5F04A]'
              } min-[860px]:text-brand-navy min-[860px]:hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors`}
            >
              Log in
            </Link>
          )}

        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 py-2 bg-[#050505] border-t border-[#383838]">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <Search size={15} className="absolute left-3.5 text-white pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skin by name, design number or category..."
              className="w-full pl-9 pr-8 py-1.5 text-xs text-white placeholder-[#C7C7C7] bg-[#171717] border border-[#383838] rounded-full outline-none focus:border-[#C5F04A] focus:ring-1 focus:ring-[#C5F04A] transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="absolute right-2.5 p-0.5 text-white hover:text-[#C5F04A] focus:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors"
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
