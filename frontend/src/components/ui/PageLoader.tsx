import React from 'react';

export const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-2xl border-4 border-brand-navy/10 animate-spin border-t-brand-lime" />
      </div>
      <p className="mt-4 text-xs font-bold tracking-wider uppercase text-brand-navy/60 font-display">
        Loading SkinLab...
      </p>
    </div>
  );
};
