import React from 'react';
import { Product, LaptopModel } from '../../types/product';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LaptopPreviewProps {
  product: Product;
  laptop: LaptopModel;
  zoom: number;
  showComparison: boolean;
  sliderPos: number;
  finish: 'Matte' | 'Glossy';
}

export const LaptopPreview: React.FC<LaptopPreviewProps> = ({
  product,
  laptop,
  zoom,
  showComparison,
  sliderPos,
  finish,
}) => {
  const isCompatible = product.laptopCompatibility.includes(laptop.name);

  return (
    <div className="relative w-full aspect-[16/11] max-h-[580px] bg-gradient-to-b from-[#181B26] via-[#12141D] to-[#0A0B10] rounded-3xl overflow-hidden flex items-center justify-center p-4 md:p-8 border border-brand-border/20 shadow-2xl">
      {/* Background Stage Lighting / Grid Accents */}
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-brand-blue/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-brand-lime/10 blur-3xl pointer-events-none" />

      {/* Floating Model & Compatibility Tag */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <span className="bg-white/10 backdrop-blur-md text-white border border-white/15 px-3 py-1 rounded-full text-xs font-bold font-display">
          {laptop.name}
        </span>
        {isCompatible ? (
          <span className="bg-brand-lime/90 text-brand-navy px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-sm">
            <CheckCircle2 size={12} /> Laser Fit Available
          </span>
        ) : (
          <span className="bg-amber-400 text-brand-navy px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            Universal Trim Required
          </span>
        )}
      </div>

      {/* Floating Design Badge */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <span className="bg-brand-navy/90 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold">
          Design #{product.designNumber}
        </span>
        <span className="hidden sm:inline bg-brand-orange text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold">
          {product.category}
        </span>
      </div>

      {/* Main Interactive Laptop Mockup Container */}
      <div
        className="relative w-full max-w-[620px] transition-transform duration-300 ease-out origin-center"
        style={{ transform: `scale(${zoom})` }}
      >
        {/* Laptop Shadow on Desk */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-[85%] h-8 bg-black/60 blur-xl rounded-full pointer-events-none" />

        {/* Laptop Base Case / Lid Structure */}
        <div className="relative mx-auto rounded-[28px] overflow-hidden p-2.5 bg-gradient-to-b from-[#2A2E3D] via-[#1C1F2B] to-[#12141C] shadow-2xl border-2 border-[#3D4358]">
          
          {/* Bare Laptop Lid (Underneath / Original) */}
          <div className="relative w-full aspect-[16/10.5] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#2D313F] via-[#20232E] to-[#14161F] flex items-center justify-center border border-white/10">
            {/* Laptop Base Lid Artwork & Hardware Logo */}
            <img
              src={laptop.baseImage}
              alt={`${laptop.name} Original Bare Lid`}
              className="w-full h-full object-cover"
            />

            {/* Laptop Center Logo Badge (Apple, HP, Dell, Lenovo) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <span className="text-[11px] font-bold font-mono tracking-widest text-white/70 uppercase">
                  {laptop.brand}
                </span>
              </div>
            </div>

            {/* Skin Applied Layer */}
            <AnimatePresence mode="wait">
              <motion.div
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 overflow-hidden"
                style={{
                  clipPath: showComparison
                    ? `polygon(${sliderPos}% 0%, 100% 0%, 100% 100%, ${sliderPos}% 100%)`
                    : 'none',
                }}
              >
                {/* Precision Skin Image */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                {/* Skin Finish Overlay */}
                {finish === 'Glossy' ? (
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-black/10 backdrop-brightness-95 pointer-events-none" />
                )}

                {/* Subtle Inner Die-Cut Edge Border */}
                <div className="absolute inset-0 rounded-[18px] border-2 border-black/30 pointer-events-none" />
              </motion.div>
            </AnimatePresence>

            {/* Comparison Divider Line & Indicator */}
            {showComparison && (
              <div
                className="absolute top-0 bottom-0 z-30 w-1 bg-brand-lime shadow-lg cursor-ew-resize"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-brand-navy border-2 border-brand-lime text-brand-lime flex items-center justify-center text-[10px] font-black shadow-md">
                  ⇄
                </div>
              </div>
            )}
          </div>

          {/* Laptop Hinge & Front Opening Lip */}
          <div className="relative mt-1 flex items-center justify-center">
            <div className="w-40 h-2 bg-[#12141A] rounded-full border-t border-white/10" />
            <div className="absolute w-12 h-1 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Laptop Bottom Lower Chassis Rim */}
        <div className="w-[96%] mx-auto h-2 bg-gradient-to-b from-[#1E212B] to-[#0E1015] rounded-b-xl border-t border-white/5" />
      </div>

      {/* Floating Bottom Note */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 bg-[#0c0d12]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-gray-300 text-xs">
        <ShieldCheck size={14} className="text-brand-lime" />
        <span>Precision 3M cast vinyl • Air-release channels • 0.2mm edge gap</span>
      </div>
    </div>
  );
};
