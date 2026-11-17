import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-navy/45">Page not found</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-navy">This page could not be opened</h1>
      <p className="mt-2 text-sm text-brand-navy/60">Check the address or return to the catalogue.</p>
      <Link to="/catalogue" className="mt-6 inline-flex rounded-full bg-brand-lime px-5 py-3 text-sm font-bold text-brand-navy">Back to Catalog</Link>
    </div>
  );
};
