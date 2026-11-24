import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { GuestRoute, ProtectedRoute } from '@/auth/RouteGuards';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLoader } from '@/components/ui/PageLoader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Eager Landing Page
import { Home } from '@/pages/home/Home';

// Lazy-loaded routes for code-splitting on slow networks
const Catalog = React.lazy(() => import('@/pages/laptop-skins/Catalog').then(m => ({ default: m.Catalog })));
const ProductDetails = React.lazy(() => import('@/pages/product-details/ProductDetails').then(m => ({ default: m.ProductDetails })));
const PreviewStudio = React.lazy(() => import('@/pages/preview/PreviewStudio').then(m => ({ default: m.PreviewStudio })));
const Wishlist = React.lazy(() => import('@/pages/Wishlist').then(m => ({ default: m.Wishlist })));
const AddNewDesign = React.lazy(() => import('@/pages/admin/AddNewDesign').then(m => ({ default: m.AddNewDesign })));
const EditProduct = React.lazy(() => import('@/pages/admin/EditProduct').then(m => ({ default: m.EditProduct })));
const Login = React.lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const ChangePassword = React.lazy(() => import('@/pages/ChangePassword').then(m => ({ default: m.ChangePassword })));
const Settings = React.lazy(() => import('@/pages/settings/Settings').then(m => ({ default: m.Settings })));
const NotFound = React.lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })));

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
