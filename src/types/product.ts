export type CategoryType = 
  | 'All'
  | 'Anime' 
  | 'Cars' 
  | 'Travel' 
  | 'Gaming' 
  | 'Aesthetic' 
  | 'Abstract';

export interface Product {
  id: string;
  designNumber: string;
  name: string;
  category: Exclude<CategoryType, 'All'>;
  description: string;
  price?: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  image: string;
  /** Additional real gallery views, when available. */
  images?: string[];
  laptopCompatibility: string[];
  featured: boolean;
  isNew: boolean;
  finish?: 'Matte Anti-Glare' | 'Glossy Ultra' | 'Textured Vinyl';
  material?: string;
  dimensions?: string;
  badge?: string;
}

export interface CategoryInfo {
  id: Exclude<CategoryType, 'All'>;
  name: string;
  iconName: string;
  description: string;
  cardColor: string;
  accentColor: string;
  textColor: string;
  bannerImage: string;
}

export interface LaptopModel {
  id: string;
  name: string;
  brand: 'Apple' | 'HP' | 'Dell' | 'Lenovo';
  screenSize: string;
  dimensions: string;
  baseImage: string;
  colorName: string;
  lidAspect: number; // width / height
}
