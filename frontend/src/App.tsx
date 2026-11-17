import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { PageLoader } from '@/components/common/PageLoader';

// Public Pages
import { Home } from '@/pages/Home';
import { Catalogue } from '@/pages/Catalogue';
import { ProductDetails } from '@/pages/ProductDetails';
import { PreviewStudio } from '@/pages/PreviewStudio';
import { Wishlist } from '@/pages/Wishlist';
import { NotFound } from '@/pages/NotFound';

// Admin Layout & Pages
import { AdminLayout } from '@/admin/layout/AdminLayout';
import { Dashboard } from '@/admin/pages/Dashboard';
import { Products } from '@/admin/pages/Products';
import { AddProduct } from '@/admin/pages/AddProduct';
import { EditProduct } from '@/admin/pages/EditProduct';
import { Categories } from '@/admin/pages/Categories';

export function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes — wrapped in MainLayout (Navbar + Footer) */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="preview" element={<PreviewStudio />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin routes — wrapped in AdminLayout (no Navbar/Footer) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<AddProduct />} />
            <Route path="products/:id/edit" element={<EditProduct />} />
            <Route path="categories" element={<Categories />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
