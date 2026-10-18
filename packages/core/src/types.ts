import type { ObjectId } from 'mongodb';

export type ThemeId = 'classic' | 'minimal' | 'bold';

export interface Store {
  _id: ObjectId;
  slug: string;
  name: string;
  domains: string[];
  currency: string;
  theme: ThemeId;
  themeSettings: { accent: string; logoUrl?: string; tagline?: string; announcement?: string };
  emailFrom: string;
  supportEmail?: string;
  shippingFlat: number;
  freeShippingOver?: number;
  active: boolean;
  createdAt: Date;
}

export type ProductStatus = 'draft' | 'active' | 'archived';

export interface Product {
  _id: ObjectId;
  storeId: ObjectId;
  slug: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  compareAt?: number;
  stock: number;
  status: ProductStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  productId: ObjectId;
  title: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface TimelineEntry {
  at: Date;
  status?: OrderStatus;
  note: string;
  by?: string;
}

export interface Order {
  _id: ObjectId;
  storeId: ObjectId;
  number: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  customer: { email?: string; name?: string; phone?: string };
  shippingAddress?: Address;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  timeline: TimelineEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  _id: ObjectId;
  storeId: ObjectId;
  email: string;
  name?: string;
  orders: number;
  totalSpent: number;
  lastOrderAt?: Date;
  createdAt: Date;
}

export interface EmailRecord {
  _id: ObjectId;
  storeId?: ObjectId;
  direction: 'in' | 'out';
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  status: 'received' | 'sent' | 'failed';
  error?: string;
  read?: boolean;
  createdAt: Date;
}

export interface Admin {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: 'owner' | 'staff';
  createdAt: Date;
}
