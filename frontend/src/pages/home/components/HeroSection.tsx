import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative w-full bg-white pt-6 md:pt-10 pb-8 sm:pb-12 overflow-hidden select-none">
      <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
        <div className="w-full lg:w-[40%] flex flex-col justify-center z-10 space-y-5 md:space-y-6 pl-1 sm:pl-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#171A35] font-display">
              LAPTOP SKINS MARKETPLACE
            </span>
            <span className="w-9 h-[1.5px] bg-[#171A35]/30 inline-block" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-[54px] lg:text-[50px] xl:text-[58px] font-extrabold text-[#171A35] tracking-tight leading-[1.08] font-display">
            Give Your
            <br />
            <span className="inline-flex items-center gap-2.5 flex-wrap">
              Laptop a
              <span className="inline-flex items-center gap-1.5 ml-1">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[17px] md:h-[17px] rounded-full bg-[#C5F04A] shadow-sm inline-block" />
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[17px] md:h-[17px] rounded-full bg-[#FFD34E] shadow-sm inline-block" />
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[17px] md:h-[17px] rounded-full bg-[#FF681F] shadow-sm inline-block" />
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[17px] md:h-[17px] rounded-full bg-[#5798F5] shadow-sm inline-block" />
              </span>
            </span>
            <br />
            <span className="relative inline-block">
              New Identity
              <svg
                className="absolute -bottom-2.5 left-0 w-full h-3.5 text-[#C5F04A] pointer-events-none"
                viewBox="0 0 260 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 11.5C65.5 4 178 3.5 256 12"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-[#777987] text-sm sm:text-base md:text-[16px] leading-relaxed max-w-md pt-0.5">
            Explore 500+ premium laptop skins and see
            <br className="hidden sm:inline" />
            how they look on your laptop.
          </p>

          <div className="pt-3 flex items-center gap-5 sm:gap-8 border-t border-[#E3E6EB]/80">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#171A35] font-display">
                500+
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#777987] mt-0.5">
                Designs
              </div>
            </div>

            <div className="w-[1px] h-9 bg-[#171A35]/20" />

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#171A35] font-display">
                20+
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#777987] mt-0.5">
                Categories
              </div>
            </div>

            <div className="w-[1px] h-9 bg-[#171A35]/20" />

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#171A35] font-display">
                10K+
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#777987] mt-0.5">
                Happy Users
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[60%] relative flex items-center justify-center min-h-[340px] sm:min-h-[400px] md:min-h-[440px] lg:min-h-[480px]">
          <div className="absolute top-12 right-14 sm:right-14 w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 pointer-events-none z-0">
            <svg className="w-full h-full text-[#171A35]" viewBox="0 0 100 100" fill="none">
              <rect x="0" y="0" width="100" height="100" stroke="currentColor" strokeWidth="1.2" />
              <line x1="25" y1="0" x2="25" y2="100" stroke="currentColor" strokeWidth="1.2" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="1.2" />
              <line x1="75" y1="0" x2="75" y2="100" stroke="currentColor" strokeWidth="1.2" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeWidth="1.2" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="1.2" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>

          <div className="absolute top-[55px] right-60 w-72 h-36 rounded-l-full bg-[#FF681F] pointer-events-none z-0" />

          <div className="absolute top-5 sm:top-8 left-8 sm:left-14 md:left-20 w-9 h-9 sm:w-11 sm:h-11 pointer-events-none z-0">
            <svg className="w-full h-full text-[#171A35]" viewBox="0 0 100 100" fill="none">
              <polygon points="18,38 44,14 88,14 62,38" fill="#FFFFFF" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
              <polygon points="18,38 62,38 62,86 18,86" fill="#FFFFFF" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
              <polygon points="62,38 88,14 88,62 62,86" fill="#171A35" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="absolute top-140 sm:top-70 md:top-100 left-8 sm:left-14 md:left-18 lg:left-20 w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full bg-[#C5F04A] border-2 border-black pointer-events-none z-0" />
          
          <div className="absolute top-[350px] sm:top-[350px] md:top-[330px] left-0 sm:left-2 md:left-4 w-36 h-[72px] sm:w-44 sm:h-[88px] md:w-52 md:h-[104px] pointer-events-none z-0">
            <svg className="w-full h-full text-[#5798F5]" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 0 H 200 A 100 100 0 0 1 0 0 Z" fill="currentColor" />
            </svg>
          </div>

          <div className="absolute bottom-10 sm:bottom-12 right-2 sm:right-6 md:right-8 w-10 h-10 sm:w-12 sm:h-12 pointer-events-none z-0">
            <svg className="w-full h-full text-[#171A35]" viewBox="0 0 100 100" fill="none">
              <polygon points="50,14 86,34 50,54 14,34" fill="#FFFFFF" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
              <polygon points="14,34 50,54 50,90 14,70" fill="#FFFFFF" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
              <polygon points="50,54 86,34 86,70 50,90" fill="#171A35" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="absolute bottom-0 right-0 w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 pointer-events-none z-0 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 70" preserveAspectRatio="none">
              <polygon points="0,70 100,0 100,70" fill="#FF681F" />
            </svg>
          </div>

          <div className="relative z-10 w-full max-w-[500px] sm:max-w-[540px] md:max-w-[580px] lg:max-w-[620px] px-1 sm:px-2">
            <img
              src="/assets/banners/hero-laptop.png"
              alt="SkinLab Nezuko Art Design #28 Laptop Skin Mockup"
              className="w-full h-auto object-contain block drop-shadow-md select-none"
              style={{ imageRendering: 'auto' }}
            />

            <div className="absolute top-[48%] -right-1 sm:right-2 md:right-4 transform -translate-y-1/2 flex items-center gap-2 pl-3.5 pr-1.5 py-1 sm:py-1.5 bg-[#C5F04A] text-[#171A35] rounded-full font-extrabold text-xs sm:text-[13px] border border-[#171A35] shadow-sm select-none z-20">
              <span className="font-display">Design #28</span>
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#171A35] bg-[#C5F04A] text-[#171A35] flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={13} className="stroke-[2.5]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
