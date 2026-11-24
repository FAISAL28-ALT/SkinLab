import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { GuestRoute, ProtectedRoute } from '@/auth/RouteGuards';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLoader } from '@/components/ui/PageLoader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Pages
import { Home } from '@/pages/home/Home';
import { ProductDetails } from '@/pages/product-details/ProductDetails';
import { PreviewStudio } from '@/pages/preview/PreviewStudio';
import { Wishlist } from '@/pages/Wishlist';
import { EditProduct } from '@/pages/admin/EditProduct';
import { AddNewDesign } from '@/pages/admin/AddNewDesign';
import { Login } from '@/pages/Login';
import { Catalog } from '@/pages/laptop-skins/Catalog';
import { ChangePassword } from '@/pages/ChangePassword';
import { Settings } from '@/pages/settings/Settings';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
         <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

            {/* Mandatory First-Time Password Change (Admin only) */}
            <Route element={<ProtectedRoute roles={['SHOP_ADMIN']} />}>
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>

            {/* Application Layout */}
            <Route path="/" element={<MainLayout />}>
              {/* Public Routes */}
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="preview" element={<PreviewStudio />} />
              <Route path="wishlist" element={<Wishlist />} />

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute roles={['SHOP_ADMIN']} />}>
                <Route path="product/new" element={<AddNewDesign />} />
                <Route path="product/:id/edit" element={<EditProduct />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Public Product Details */}
              <Route path="product/:id" element={<ProductDetails />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
         </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
