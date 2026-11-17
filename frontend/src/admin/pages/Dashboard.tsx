import React from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '@/data/products';
import { CATEGORIES } from '@/data/categories';
import { Package, Tag, Image as ImageIcon, Plus, ArrowUpRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const totalProducts = PRODUCTS.length;
  const totalCategories = CATEGORIES.length;
  const totalImages = PRODUCTS.reduce((acc, p) => acc + (p.images?.length ?? 1), 0);

  const stats = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'bg-brand-lime/20 text-brand-navy',
    },
    {
      label: 'Total Categories',
      value: totalCategories,
      icon: Tag,
      color: 'bg-brand-blue/20 text-brand-blue',
    },
    {
      label: 'Total Images',
      value: totalImages,
      icon: ImageIcon,
      color: 'bg-brand-orange/20 text-brand-orange',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-navy/40 mb-1">Overview</p>
        <h1 className="font-display text-3xl font-extrabold text-brand-navy">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-brand-navy/60">Manage your SkinLab catalogue, products and categories.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-3xl border border-brand-border p-6 flex items-center gap-4 shadow-card"
          >
            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={24} />
            </span>
            <div>
              <div className="text-3xl font-extrabold font-display text-brand-navy">{value}</div>
              <div className="text-xs font-semibold text-brand-navy/55 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-3xl border border-brand-border p-6 shadow-card">
        <h2 className="font-display font-bold text-lg text-brand-navy mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-5 py-2.5 text-sm font-extrabold text-brand-navy shadow-neo-sm hover:bg-[#b5e03b] transition-colors"
          >
            <Plus size={16} />
            Add New Product
          </Link>
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 rounded-full bg-brand-card border border-brand-border px-5 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-border transition-colors"
          >
            View Catalogue
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};
