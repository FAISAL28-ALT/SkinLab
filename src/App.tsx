import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { PageLoader } from './components/common/PageLoader';

// Pages
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetails } from './pages/ProductDetails';
import { PreviewStudio } from './pages/PreviewStudio';
import { Wishlist } from './pages/Wishlist';
import { EditProduct } from './pages/EditProduct';
import { AddNewDesign } from './pages/AddNewDesign';

export function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="product/:id/edit" element={<EditProduct />} />
            <Route path="product/new" element={<AddNewDesign />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="preview" element={<PreviewStudio />} />
            <Route path="wishlist" element={<Wishlist />} />
            {/* Keep route failures visible instead of masking them as the home page. */}
            <Route path="*" element={
              <div className="mx-auto max-w-2xl py-20 text-center">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-navy/45">Page not found</p>
                <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-navy">This page could not be opened</h1>
                <p className="mt-2 text-sm text-brand-navy/60">Check the address or return to the catalogue.</p>
                <Link to="/catalog" className="mt-6 inline-flex rounded-full bg-brand-lime px-5 py-3 text-sm font-bold text-brand-navy">Back to Catalog</Link>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
