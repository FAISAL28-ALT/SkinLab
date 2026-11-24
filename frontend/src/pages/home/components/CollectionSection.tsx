import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const CollectionSection: React.FC = () => {
  const collections = [
    {
      id: 'anime',
      title: 'Anime Collection',
      description: 'Iconic anime designs for your laptop.',
      category: 'Anime',
      bgColor: 'bg-[#C5F04A]',
      textColor: 'text-brand-navy',
      btnColor: 'bg-brand-navy text-white hover:bg-black',
      image: '/assets/banners/collection-anime.webp',
      alt: 'Anime laptop skin collection featuring iconic characters',
      imageClass: 'w-52 h-28 -bottom-2 -right-2',
    },
    {
      id: 'cars',
      title: 'Car Series',
      description: 'Supercars and racing themes.',
      category: 'Cars',
      bgColor: 'bg-[#D8E9FE]',
      textColor: 'text-brand-navy',
      btnColor: 'bg-brand-navy text-white hover:bg-black',
      image: '/assets/skins/cars/005.png',
      alt: 'Porsche GT3 supercar racing laptop skins',
      imageClass: 'w-52 h-28 -bottom-2 -right-2',
    },
    {
      id: 'travel',
      title: 'Travel Collection',
      description: 'Explore the world with unique designs.',
      category: 'Travel',
      bgColor: 'bg-[#FBF0E4]',
      textColor: 'text-brand-navy',
      btnColor: 'bg-brand-orange text-white hover:bg-[#e05713]',
      image: '/assets/banners/London Landmarks.png',
      alt: 'London Big Ben and World landmarks laptop skin collection',
      imageClass: 'w-55 h-40 -bottom-0 -right-5',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[repeat(3,minmax(0,370px))] gap-4">
      {collections.map((col) => (
        <Link
          key={col.id}
          to={`/catalog?collection=${col.category}`}
          className={`relative rounded-3xl ${col.bgColor} p-6 flex flex-col justify-between overflow-hidden min-h-[160px] md:min-h-[175px] group hover:shadow-lg transition-all duration-300 border border-brand-navy/10`}
        >
          {/* Header row with Title and Arrow Circle Button */}
          <div className="flex items-start justify-between z-10">
            <div>
            <h4 className="font-display font-black text-xl md:text-2xl text-brand-navy leading-[0.65] max-w-[130px]">
              {col.title}
            </h4>
              <p className="text-xs text-brand-navy/80 mt-1 max-w-[160px] leading-relaxed">
                {col.description}
              </p>
            </div>

            {/* Circular Arrow Button */}
            <span
              className={`w-9 h-9 rounded-full ${col.btnColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-45 transition-transform duration-300 shadow-sm`}
            >
              <ArrowUpRight size={18} />
            </span>
          </div>

          {/* Peeking Graphic at Bottom Right */}
          <div
            className={`absolute overflow-hidden pointer-events-none transition-transform duration-300 group-hover:scale-105 ${col.imageClass}`}
          >
            <img
              src={col.image}
              alt={col.alt}
              className="w-full h-full object-contain object-bottom"
            />
          </div>
        </Link>
        
      ))}
    </div>
  );
};
