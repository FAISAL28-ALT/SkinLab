export const COLLECTIONS = [
  'Anime',
  'Cars',
  'Travel',
  'Gaming',
  'Aesthetic',
  'Abstract',
] as const;

export type CollectionName = typeof COLLECTIONS[number];

export type CollectionType = 
  | 'All'
  | CollectionName;

export type CategoryType = CollectionType;

export interface Product {
  id: string;
  designNumber: string;
  name: string;
  category: string;
  categorySlug?: string;
  categoryName?: string;
  collection?: string;
  designStyle?: string;
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
  isTrending?: boolean;
  isBestseller?: boolean;
  finish?: 'Matte Anti-Glare' | 'Glossy Ultra' | 'Textured Vinyl';
  material?: string;
  dimensions?: string;
  badge?: string;
}

export type DeviceCategorySlug =
  | 'laptop-skins'
  | 'mobile-skin'
  | 'tablet-skin'
  | 'camera-skin'
  | 'camera-lens-skin'
  | 'card-skin'
  | 'gaming-skin'
  | 'dji-skins';

export interface DeviceCategoryConfig {
  id: DeviceCategorySlug;
  name: string;
  slug: DeviceCategorySlug;
  iconName: 'Laptop' | 'Smartphone' | 'Tablet' | 'Camera' | 'Cylinder' | 'CreditCard' | 'Gamepad2' | 'Command';
  heading: string;
  description: string;
  searchPlaceholder: string;
  emptyMessage: string;
}

export const DEVICE_CATEGORIES: DeviceCategoryConfig[] = [
  {
    id: 'laptop-skins',
    name: 'Laptop Skins',
    slug: 'laptop-skins',
    iconName: 'Laptop',
    heading: 'Skins Catalog',
    description: 'Precision die-cut skins engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search by skin name, design # (e.g. 28, London, GT3)...',
    emptyMessage: "We couldn't find any laptop skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'mobile-skin',
    name: 'Mobile Skin',
    slug: 'mobile-skin',
    iconName: 'Smartphone',
    heading: 'Mobile Skin Catalog',
    description: 'Ultra-thin precision wraps engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search mobile skins by name, design #...',
    emptyMessage: "We couldn't find any mobile skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'tablet-skin',
    name: 'Tablet Skin',
    slug: 'tablet-skin',
    iconName: 'Tablet',
    heading: 'Tablet Skin Catalog',
    description: 'Full-coverage premium wraps engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search tablet skins by name, design #...',
    emptyMessage: "We couldn't find any tablet skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'camera-skin',
    name: 'Camera Skin',
    slug: 'camera-skin',
    iconName: 'Camera',
    heading: 'Camera Skin Catalog',
    description: 'Textured protective wraps engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search camera skins by name, design #...',
    emptyMessage: "We couldn't find any camera skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'camera-lens-skin',
    name: 'Camera Lens Skin',
    slug: 'camera-lens-skin',
    iconName: 'Cylinder',
    heading: 'Camera Lens Skin Catalog',
    description: 'Precision-cut lens barrel wraps engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search camera lens skins by name, design #...',
    emptyMessage: "We couldn't find any camera lens skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'card-skin',
    name: 'Card Skin',
    slug: 'card-skin',
    iconName: 'CreditCard',
    heading: 'Card Skin Catalog',
    description: 'Ultra-slim protective card wraps engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search card skins by name, design #...',
    emptyMessage: "We couldn't find any card skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'gaming-skin',
    name: 'Gaming Skin',
    slug: 'gaming-skin',
    iconName: 'Gamepad2',
    heading: 'Gaming Skin Catalog',
    description: 'High-durability console and controller skins engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search gaming skins by name, design #...',
    emptyMessage: "We couldn't find any gaming skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
  {
    id: 'dji-skins',
    name: 'DJI Skins',
    slug: 'dji-skins',
    iconName: 'Command',
    heading: 'DJI Skins Catalog',
    description: 'Precision-cut drone and controller wraps engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
    searchPlaceholder: 'Search DJI skins by name, design #...',
    emptyMessage: "We couldn't find any DJI skins matching your search criteria. Try a different search term, category filter, or reset your filters.",
  },
];

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
