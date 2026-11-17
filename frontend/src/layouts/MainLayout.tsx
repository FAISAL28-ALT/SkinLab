import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#171A35] selection:bg-brand-lime selection:text-brand-navy">
      <div className="w-full max-w-[1440px] mx-auto">
        <Navbar />
        <main className="w-full px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <div className="px-4 sm:px-6 lg:px-8">
          <Footer />
        </div>
      </div>
    </div>
  );
};
