import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { LAPTOP_MODELS } from '../data/laptops';
import { Product, LaptopModel, CategoryType } from '../types/product';
import { LaptopSelector } from '../components/preview/LaptopSelector';
import { LaptopPreview } from '../components/preview/LaptopPreview';
import { PreviewControls } from '../components/preview/PreviewControls';
import { WishlistButton } from '../components/common/WishlistButton';
import { 
  Sliders, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  Layers,
  Heart
} from 'lucide-react';

export const PreviewStudio: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const skinParam = searchParams.get('skin');
  const laptopParam = searchParams.get('laptop');

  // Initial skin state
  const [selectedProduct, setSelectedProduct] = useState<Product>(() => {
    if (skinParam) {
      const match = PRODUCTS.find((p) => p.id === skinParam);
      if (match) return match;
    }
    // Default to flagship #28 Nezuko Art
    return PRODUCTS.find((p) => p.id === 'skin-028') || PRODUCTS[0];
  });

  // Initial laptop model state
  const [selectedLaptop, setSelectedLaptop] = useState<LaptopModel>(() => {
    if (laptopParam) {
      const match = LAPTOP_MODELS.find((l) => l.id === laptopParam);
      if (match) return match;
    }
    return LAPTOP_MODELS[0]; // MacBook Air 13
  });

  // Controls state
  const [zoom, setZoom] = useState<number>(1);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [finish, setFinish] = useState<'Matte' | 'Glossy'>('Matte');
  const [activeTab, setActiveTab] = useState<CategoryType>('All');

  // Sync URL when skin or laptop changes
  const handleSelectSkin = (product: Product) => {
    setSelectedProduct(product);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('skin', product.id);
    setSearchParams(newParams, { replace: true });
  };

  const handleSelectLaptop = (laptop: LaptopModel) => {
    setSelectedLaptop(laptop);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('laptop', laptop.id);
    setSearchParams(newParams, { replace: true });
  };

  // Filter skins by selected category tab
  const availableSkins = PRODUCTS.filter(
    (p) => activeTab === 'All' || p.category.toLowerCase() === activeTab.toLowerCase()
  );

  return (
    <div className="px-2 sm:px-4 md:px-6 py-6 bg-white min-h-[850px]">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-lime animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-brand-navy/60 font-display">
              SKINLAB REAL-TIME STUDIO
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-navy font-display tracking-tight flex items-center gap-3">
            Laptop Preview Studio
            <span className="text-xs font-mono font-bold bg-brand-lime text-brand-navy px-2.5 py-1 rounded-full uppercase tracking-wider">
              Live Mockup
            </span>
          </h1>
        </div>

        {/* Model Spec Tag */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-bold text-brand-navy">{selectedLaptop.name}</div>
            <div className="text-[10px] text-brand-navy/60 font-mono">{selectedLaptop.dimensions}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-center font-bold text-xs text-brand-navy">
            {selectedLaptop.brand.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Canvas & Viewer Controls */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* 1. Step 1: Laptop Selector */}
          <div className="p-4 rounded-3xl bg-brand-card/50 border border-brand-border/70">
            <LaptopSelector
              selectedLaptop={selectedLaptop}
              onSelectLaptop={handleSelectLaptop}
            />
          </div>

          {/* 2. Interactive Laptop Canvas Preview */}
          <div className="relative">
            <LaptopPreview
              product={selectedProduct}
              laptop={selectedLaptop}
              zoom={zoom}
              showComparison={showComparison}
              sliderPos={sliderPos}
              finish={finish}
            />
          </div>

          {/* 3. Preview Controls Bar (Zoom, Compare, Finish) */}
          <PreviewControls
            zoom={zoom}
            onZoomChange={setZoom}
            onResetZoom={() => setZoom(1)}
            showComparison={showComparison}
            onToggleComparison={() => setShowComparison(!showComparison)}
            sliderPos={sliderPos}
            onSliderChange={setSliderPos}
            finish={finish}
            onFinishChange={setFinish}
          />

          {/* Important Technical Note */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-brand-card/70 border border-brand-border text-xs text-brand-navy/70 leading-relaxed">
            <Info size={16} className="text-brand-orange flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-brand-navy">Model-Specific Precision Cut:</strong> Previews utilize calibrated aspect ratios and model-matched chassis images. We never use a generic one-size-fits-all mockup for laser manufacturing.
            </p>
          </div>
        </div>

        {/* Right Column: Skin Selection Drawer & Purchase Panel */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Active Skin Card Info */}
          <div className="p-5 rounded-3xl bg-brand-card border border-brand-border shadow-sm">
            <div className="flex items-center justify-between text-xs text-brand-navy/60 mb-1">
              <span className="font-bold text-brand-orange uppercase">{selectedProduct.category}</span>
              <span className="font-mono font-bold">Design #{selectedProduct.designNumber}</span>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-xl text-brand-navy">
                {selectedProduct.name}
              </h3>
              <WishlistButton productId={selectedProduct.id} size="sm" />
            </div>

            <p className="text-xs text-brand-navy/70 mt-2 line-clamp-2 leading-relaxed">
              {selectedProduct.description}
            </p>

            <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between">
              <div>
                <div className="text-xs text-brand-navy/60">Estimated Price:</div>
                <div className="text-2xl font-black text-brand-navy font-display">
                  ${selectedProduct.price?.toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/product/${selectedProduct.id}`}
                  className="px-3 py-2 rounded-full bg-white border border-brand-border hover:border-brand-navy text-xs font-bold text-brand-navy flex items-center gap-1 transition-colors"
                >
                  Full Specs
                  <ArrowUpRight size={13} />
                </Link>
                <button
                  type="button"
                  onClick={() => alert(`Custom precision laser wrap for ${selectedLaptop.name} added to cart!`)}
                  className="px-4 py-2 rounded-full bg-brand-lime hover:bg-[#b8e539] text-brand-navy font-extrabold text-xs shadow-sm transition-colors"
                >
                  Order Wrap
                </button>
              </div>
            </div>
          </div>

          {/* Skin Selection Carousel / Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 font-display">
                2. Choose Skin To Preview
              </label>
              <span className="text-xs font-mono font-bold text-brand-navy/60">
                {availableSkins.length} designs
              </span>
            </div>

            {/* Category Mini Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['All', 'Anime', 'Cars', 'Travel', 'Gaming', 'Aesthetic', 'Abstract'] as CategoryType[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveTab(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                    activeTab === cat
                      ? 'bg-brand-navy text-white'
                      : 'bg-white border border-brand-border text-brand-navy/70 hover:border-brand-navy'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Skin Thumbnails Grid with Real-time Switching */}
            <div className="grid grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {availableSkins.map((p) => {
                const isSelected = selectedProduct.id === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectSkin(p)}
                    className={`relative rounded-2xl p-2 text-left transition-all group overflow-hidden border ${
                      isSelected
                        ? 'border-brand-navy ring-2 ring-brand-lime bg-brand-card shadow-sm'
                        : 'border-brand-border bg-white hover:border-brand-navy/40'
                    }`}
                  >
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-brand-card/60 flex items-center justify-center p-1">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>

                    <div className="mt-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-brand-navy/60">#{p.designNumber}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-brand-lime" />
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-brand-navy truncate">
                        {p.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
