import React from 'react';
import { LAPTOP_MODELS } from '@/features/catalog/data/laptops';
import { LaptopModel } from '@/features/catalog/types/product';
import { Laptop, Check } from 'lucide-react';

interface LaptopSelectorProps {
  selectedLaptop: LaptopModel;
  onSelectLaptop: (laptop: LaptopModel) => void;
}

export const LaptopSelector: React.FC<LaptopSelectorProps> = ({
  selectedLaptop,
  onSelectLaptop,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60 font-display flex items-center gap-1.5">
          <Laptop size={14} />
          1. Select Your Laptop Model
        </label>
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Laser Cut Guaranteed
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {LAPTOP_MODELS.map((model) => {
          const isSelected = selectedLaptop.id === model.id;

          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelectLaptop(model)}
              className={`p-3 rounded-2xl text-left transition-all duration-200 border relative ${
                isSelected
                  ? 'border-brand-navy bg-brand-navy text-white shadow-neo-sm'
                  : 'border-brand-border bg-white text-brand-navy hover:border-brand-navy/40'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-lime text-brand-navy flex items-center justify-center">
                  <Check size={10} className="stroke-[3]" />
                </span>
              )}
              <span className={`text-[10px] font-bold block ${isSelected ? 'text-brand-lime' : 'text-brand-orange'}`}>
                {model.brand}
              </span>
              <h5 className="font-display font-bold text-xs truncate mt-0.5">
                {model.name}
              </h5>
              <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-gray-300' : 'text-brand-navy/50'}`}>
                {model.screenSize}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
