import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, Sparkles, Truck, RefreshCw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-brand-border/80 pt-10 pb-8 px-2 sm:px-4 md:px-6 bg-white">
      {/* Feature Badges Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-lime/20 text-brand-navy flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-[#658a08]" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-brand-navy">3M Cast Vinyl</h4>
            <p className="text-xs text-brand-navy/60">Air-release bubble-free channels</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-blue/20 text-brand-navy flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-[#2b6bc9]" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-brand-navy">Laser Cut Match</h4>
            <p className="text-xs text-brand-navy/60">Precision 0.2mm edge tolerance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 text-brand-navy flex items-center justify-center flex-shrink-0">
            <RefreshCw size={20} className="text-[#d84d0b]" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-brand-navy">Zero Residue</h4>
            <p className="text-xs text-brand-navy/60">Peels clean without sticky glue</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-yellow/30 text-brand-navy flex items-center justify-center flex-shrink-0">
            <Truck size={20} className="text-[#a87f04]" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-brand-navy">Worldwide Shipping</h4>
            <p className="text-xs text-brand-navy/60">Reinforced protective packaging</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-extrabold text-2xl tracking-tight text-brand-navy">
              SkinLab
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-brand-lime inline-block" />
          </div>
          <p className="text-sm text-brand-navy/70 max-w-sm leading-relaxed">
            Premium artist-crafted laptop skins engineered with genuine 3M materials. Give your setup a bold, neo-brutalist identity with unmatched protection.
          </p>
          <div className="pt-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-brand-navy/80">Studio Printing Station Active • 500+ Skins in Stock</span>
          </div>
        </div>

        <div>
          <h5 className="font-display font-bold text-sm text-brand-navy mb-4">Categories</h5>
          <ul className="space-y-2.5 text-xs font-medium text-brand-navy/70">
            <li><Link to="/catalog?category=Anime" className="hover:text-brand-navy hover:underline">Anime Series</Link></li>
            <li><Link to="/catalog?category=Cars" className="hover:text-brand-navy hover:underline">Car & Racing</Link></li>
            <li><Link to="/catalog?category=Travel" className="hover:text-brand-navy hover:underline">Travel & Architecture</Link></li>
            <li><Link to="/catalog?category=Gaming" className="hover:text-brand-navy hover:underline">Gaming & Cyber</Link></li>
            <li><Link to="/catalog?category=Aesthetic" className="hover:text-brand-navy hover:underline">Aesthetic Landscapes</Link></li>
            <li><Link to="/catalog?category=Abstract" className="hover:text-brand-navy hover:underline">Abstract Geometry</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="font-display font-bold text-sm text-brand-navy mb-4">Laptop Models</h5>
          <ul className="space-y-2.5 text-xs font-medium text-brand-navy/70">
            <li><Link to="/preview" className="hover:text-brand-navy hover:underline">Apple MacBook Air / Pro</Link></li>
            <li><Link to="/preview" className="hover:text-brand-navy hover:underline">HP Pavilion & Envy 15</Link></li>
            <li><Link to="/preview" className="hover:text-brand-navy hover:underline">Dell Inspiron & XPS 15</Link></li>
            <li><Link to="/preview" className="hover:text-brand-navy hover:underline">Lenovo IdeaPad & Legion</Link></li>
            <li><Link to="/preview" className="hover:text-brand-navy hover:underline">Asus ROG & Zenbook</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="font-display font-bold text-sm text-brand-navy mb-4">Interactive Tools</h5>
          <ul className="space-y-2.5 text-xs font-medium text-brand-navy/70">
            <li>
              <Link to="/preview" className="inline-flex items-center gap-1 text-brand-navy font-semibold hover:text-brand-orange">
                Laptop Studio Preview <ArrowUpRight size={14} />
              </Link>
            </li>
            <li><Link to="/wishlist" className="hover:text-brand-navy hover:underline">Saved Skin Collection</Link></li>
            <li><Link to="/catalog" className="hover:text-brand-navy hover:underline">All Trending Skins</Link></li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="pt-8 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-navy/50 gap-4">
        <p>© {new Date().getFullYear()} SkinLab Inc. All rights reserved. Neo-Brutalist Laptop Skin Marketplace.</p>
        <p className="font-mono text-[11px]">Crafted for creators & tech visionaries.</p>
      </div>
    </footer>
  );
};
