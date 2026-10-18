import type { Child, FC } from 'hono/jsx';
import type { Order, Product, Store } from '@shop/core';

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface CartView {
  lines: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface LayoutProps {
  store: Store;
  title?: string;
  cartCount: number;
  children: Child;
}

export interface Theme {
  id: Store['theme'];
  name: string;
  description: string;
  Layout: FC<LayoutProps>;
  Home: FC<{ store: Store; products: Product[] }>;
  ProductPage: FC<{ store: Store; product: Product }>;
  Cart: FC<{ store: Store; cart: CartView; error?: string }>;
  OrderComplete: FC<{ store: Store; order: Order }>;
  NotFound: FC<{ store: Store }>;
}
