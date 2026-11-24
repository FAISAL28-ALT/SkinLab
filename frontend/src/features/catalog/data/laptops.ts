import { LaptopModel } from '@/features/catalog/types/product';

export const LAPTOP_MODELS: LaptopModel[] = [
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13',
    brand: 'Apple',
    screenSize: '13.6-inch Liquid Retina',
    dimensions: '30.41 x 21.50 x 1.13 cm',
    baseImage: '/assets/laptops/macbook-air-13.webp',
    colorName: 'Space Gray Aluminum',
    lidAspect: 1.41,
  },
  {
    id: 'hp-pavilion-15',
    name: 'HP Pavilion 15',
    brand: 'HP',
    screenSize: '15.6-inch FHD IPS',
    dimensions: '36.02 x 23.40 x 1.79 cm',
    baseImage: '/assets/laptops/hp-pavilion-15.webp',
    colorName: 'Natural Silver',
    lidAspect: 1.54,
  },
  {
    id: 'dell-inspiron-15',
    name: 'Dell Inspiron 15',
    brand: 'Dell',
    screenSize: '15.6-inch FHD Anti-Glare',
    dimensions: '35.85 x 23.55 x 1.89 cm',
    baseImage: '/assets/laptops/dell-inspiron-15.webp',
    colorName: 'Carbon Black Matte',
    lidAspect: 1.52,
  },
  {
    id: 'lenovo-ideapad-15',
    name: 'Lenovo IdeaPad 15',
    brand: 'Lenovo',
    screenSize: '15.6-inch FHD IPS',
    dimensions: '35.92 x 23.65 x 1.99 cm',
    baseImage: '/assets/laptops/lenovo-ideapad-15.webp',
    colorName: 'Arctic Grey',
    lidAspect: 1.51,
  },
];
