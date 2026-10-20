import type { Child, FC } from 'hono/jsx';
import type { Category, Product, Review, Store } from '@shop/core';

export interface PageMeta {
  description?: string;
  image?: string;
  jsonLd?: unknown;
  noindex?: boolean;
}

export interface LayoutProps {
  store: Store;
  title?: string;
  meta?: PageMeta;
  cartCount: number;
  categories: Category[];
  customer: string | null;
  notice?: string;
  url: string;
  children: Child;
}

export interface ProductPageProps {
  store: Store;
  product: Product;
  reviews: Review[];
  canReview: boolean;
  signedIn: boolean;
  image: number;
}

export interface HomeProps {
  store: Store;
  products: Product[];
  categories: Category[];
  featured?: Product[];
  sections?: { category: Category; products: Product[] }[];
}

export interface Theme {
  id: Store['theme'];
  name: string;
  description: string;
  Layout: FC<LayoutProps>;
  Home: FC<HomeProps>;
  homeCollections?: number;
  ProductGrid: FC<{ store: Store; products: Product[] }>;
  ProductPage: FC<ProductPageProps>;
  Page: FC<{ title?: string; children: Child }>;
  pages?: Record<string, { title: string; description?: string; render: FC<{ store: Store }> }>;
}
