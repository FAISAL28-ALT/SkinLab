import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Truck,
  Layers,
  Laptop,
  ArrowUpRight,
  Instagram,
  Youtube,
  Mail,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white pt-8 pb-10 mt-12 sm:mt-16 text-[#080D2B] font-sans selection:bg-[#B7FF27] selection:text-[#080D2B]">
      {/* A. Top Benefits Bar */}
      <div className="w-full bg-[#F0F6FF] rounded-2xl md:rounded-full px-5 py-3.5 sm:px-8 sm:py-4 border border-[#E3EFFF]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x lg:divide-[#D2E4FD]">
          {/* Item 1: 3M Cast Vinyl */}
          <div className="flex items-center gap-3.5 lg:px-6 first:pl-2">
            <div className="w-10 h-10 rounded-xl bg-[#B7FF27] flex items-center justify-center flex-shrink-0 text-[#080D2B]">
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-[#080D2B] leading-tight">
                3M Cast Vinyl
              </h4>
              <p className="text-[12px] text-[#5A6482] leading-tight mt-0.5">
                Premium, durable, long-lasting
              </p>
            </div>
          </div>

          {/* Item 2: Laser Cut Match */}
          <div className="flex items-center gap-3.5 lg:px-6">
            <div className="w-10 h-10 rounded-xl bg-[#D6E6FE] flex items-center justify-center flex-shrink-0 text-[#0866FF]">
              <ShieldCheck size={19} strokeWidth={2.2} />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-[#080D2B] leading-tight">
                Laser Cut Match
              </h4>
              <p className="text-[12px] text-[#5A6482] leading-tight mt-0.5">
                Precision cut, perfect fit
              </p>
            </div>
          </div>

          {/* Item 3: Zero Residue */}
          <div className="flex items-center gap-3.5 lg:px-6">
            <div className="w-10 h-10 rounded-xl bg-[#B7FF27] flex items-center justify-center flex-shrink-0 text-[#080D2B]">
              <RefreshCw size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-[#080D2B] leading-tight">
                Zero Residue
              </h4>
              <p className="text-[12px] text-[#5A6482] leading-tight mt-0.5">
                No marks, no sticky glue
              </p>
            </div>
          </div>

          {/* Item 4: Worldwide Shipping */}
          <div className="flex items-center gap-3.5 lg:px-6 last:pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#D6E6FE] flex items-center justify-center flex-shrink-0 text-[#0866FF]">
              <Truck size={19} strokeWidth={2.2} />
            </div>
            <div>
              <h4 className="font-bold text-[14px] text-[#080D2B] leading-tight">
                Worldwide Shipping
              </h4>
              <p className="text-[12px] text-[#5A6482] leading-tight mt-0.5">
                Reliable delivery, no extra hassle
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* B. Main Footer Section */}
      <div className="relative pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-0">
          {/* Column 1 – Brand Identity (lg:col-span-4 or 5) */}
          <div className="lg:col-span-4 lg:pr-10 lg:border-r lg:border-[#DCE8F8] flex flex-col justify-between space-y-5">
            <div>
              {/* Logo with Green Accent Dot */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="font-display font-extrabold text-2xl sm:text-[28px] tracking-tight text-[#080D2B]">
                  SkinLab
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#B7FF27] inline-block -mt-1" />
              </div>

              {/* Tagline with Highlighted Identity */}
              <h3 className="font-display font-extrabold text-lg sm:text-[21px] tracking-tight text-[#080D2B] leading-snug mb-3.5">
                Your Laptop. Your{' '}
                <span className="inline-block px-2 py-0.5 rounded-lg bg-[#D4E6FB] text-[#080D2B] font-extrabold -rotate-1">
                  Identity.
                </span>
              </h3>

              {/* Description */}
              <p className="text-[13px] text-[#5A6482] leading-relaxed max-w-sm">
                Premium artist-crafted laptop skins engineered with genuine 3M materials.
                Give your setup a bold, neo-brutalist identity with unmatched protection.
              </p>
            </div>

            {/* Studio Printing Station Badge & Social Icons */}
            <div className="space-y-4 pt-1">
              {/* Studio Printing Station badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D3E3F7] bg-[#F7FAFE] text-[12px] font-medium text-[#080D2B]">
                <span className="w-2 h-2 rounded-full bg-[#0866FF] flex-shrink-0" />
                <span>Studio Printing Station &bull; 500+ Skins in Stock</span>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-2.5">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-xl bg-[#EEF5FE] flex items-center justify-center text-[#080D2B] hover:bg-[#DCEBFE] hover:text-[#0866FF] transition-colors"
                >
                  <Instagram size={17} strokeWidth={2} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-xl bg-[#EEF5FE] flex items-center justify-center text-[#080D2B] hover:bg-[#DCEBFE] hover:text-[#0866FF] transition-colors"
                >
                  <Youtube size={17} strokeWidth={2} />
                </a>
                <a
                  href="mailto:support@skinlab.com"
                  aria-label="Email"
                  className="w-9 h-9 rounded-xl bg-[#EEF5FE] flex items-center justify-center text-[#080D2B] hover:bg-[#DCEBFE] hover:text-[#0866FF] transition-colors"
                >
                  <Mail size={17} strokeWidth={2} />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2 – Categories */}
          <div className="lg:col-span-3 lg:px-8 lg:border-r lg:border-[#E8F1FC]">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#E0EEFD] flex items-center justify-center text-[#0866FF] flex-shrink-0">
                <Layers size={16} strokeWidth={2.2} />
              </div>
              <h4 className="font-display font-bold text-[15px] text-[#080D2B]">
                Categories
              </h4>
            </div>

            {/* Links */}
            <ul className="space-y-3 text-[13px] font-medium text-[#171A35]/80">
              <li>
                <Link to="/catalog?category=Anime" className="hover:text-[#0866FF] transition-colors block">
                  Anime Series
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=Cars" className="hover:text-[#0866FF] transition-colors block">
                  Car &amp; Racing
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=Travel" className="hover:text-[#0866FF] transition-colors block">
                  Travel &amp; Architecture
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=Gaming" className="hover:text-[#0866FF] transition-colors block">
                  Gaming &amp; Cyber
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=Aesthetic" className="hover:text-[#0866FF] transition-colors block">
                  Aesthetic Landscapes
                </Link>
              </li>
              <li>
                <Link to="/catalog?category=Abstract" className="hover:text-[#0866FF] transition-colors block">
                  Abstract Geometry
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 – Laptop Models */}
          <div className="lg:col-span-3 lg:px-8 lg:border-r lg:border-[#E8F1FC]">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#E0EEFD] flex items-center justify-center text-[#0866FF] flex-shrink-0">
                <Laptop size={16} strokeWidth={2.2} />
              </div>
              <h4 className="font-display font-bold text-[15px] text-[#080D2B]">
                Laptop Models
              </h4>
            </div>

            {/* Links */}
            <ul className="space-y-3 text-[13px] font-medium text-[#171A35]/80">
              <li>
                <Link to="/preview" className="hover:text-[#0866FF] transition-colors block">
                  Apple MacBook Air / Pro
                </Link>
              </li>
              <li>
                <Link to="/preview" className="hover:text-[#0866FF] transition-colors block">
                  HP Pavilion &amp; Envy 15
                </Link>
              </li>
              <li>
                <Link to="/preview" className="hover:text-[#0866FF] transition-colors block">
                  Dell Inspiron &amp; XPS 15
                </Link>
              </li>
              <li>
                <Link to="/preview" className="hover:text-[#0866FF] transition-colors block">
                  Lenovo IdeaPad &amp; Legion
                </Link>
              </li>
              <li>
                <Link to="/preview" className="hover:text-[#0866FF] transition-colors block">
                  Asus ROG &amp; Zenbook
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 – Interactive Tools */}
          <div className="lg:col-span-2 lg:pl-8 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#E0EEFD] flex items-center justify-center text-[#0866FF] flex-shrink-0">
                  <Sparkles size={16} strokeWidth={2.2} />
                </div>
                <h4 className="font-display font-bold text-[15px] text-[#080D2B]">
                  Interactive Tools
                </h4>
              </div>

              {/* Links */}
              <ul className="space-y-3 text-[13px] font-medium text-[#171A35]/80">
                <li>
                  <Link
                    to="/preview"
                    className="inline-flex items-center gap-1 hover:text-[#0866FF] transition-colors group"
                  >
                    <span>Laptop Studio Preview</span>
                    <ArrowUpRight size={13} strokeWidth={2.2} className="text-[#080D2B] group-hover:text-[#0866FF] transition-colors" />
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="hover:text-[#0866FF] transition-colors block">
                    Saved Skin Collection
                  </Link>
                </li>
                <li>
                  <Link to="/catalog" className="hover:text-[#0866FF] transition-colors block">
                    All Trending Skins
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* C. Decorative Background Element (Three diagonal geometric shapes at bottom-right) */}
        <div className="absolute right-0 bottom-1 pointer-events-none select-none hidden sm:flex items-center gap-2.5">
          {/* Lime Green Shape */}
          <div className="w-12 h-8 rounded-[5px] bg-[#B7FF27] -skew-x-[36deg] transform" />
          {/* Light Blue Shape 1 */}
          <div className="w-12 h-8 rounded-[5px] bg-[#D6E6FE] -skew-x-[36deg] transform" />
          {/* Light Blue Shape 2 */}
          <div className="w-12 h-8 rounded-[5px] bg-[#EAF2FE] -skew-x-[36deg] transform" />
        </div>
      </div>

      {/* D. Bottom Copyright Section */}
      <div className="pt-6">
        {/* Horizontal Divider Line with Left Accent */}
        <div className="relative w-full h-px bg-[#DFECFA] mb-6">
          <div className="absolute left-0 top-[-1px] w-12 h-[2.5px] bg-[#0866FF]" />
        </div>

        {/* Copyright content */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[12.5px] gap-4">
          <p className="text-[#5A6482] text-center sm:text-left">
            &copy; 2026 SkinLab Inc. All rights reserved. Neo-Brutalist Laptop Skin Marketplace.
          </p>

          <div className="flex items-center gap-3 font-medium text-[#080D2B]">
            <a href="#legal" className="hover:text-[#0866FF] transition-colors">
              Legal
            </a>
            <span className="text-[#0866FF] text-[11px] font-light">|</span>
            <a href="#privacy" className="hover:text-[#0866FF] transition-colors">
              Privacy
            </a>
            <span className="text-[#0866FF] text-[11px] font-light">|</span>
            <a href="#terms" className="hover:text-[#0866FF] transition-colors">
              Terms
            </a>
            <span className="text-[#0866FF] text-[11px] font-light">|</span>
            <a href="#contact" className="hover:text-[#0866FF] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
