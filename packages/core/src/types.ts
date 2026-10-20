import type { ObjectId } from 'mongodb';

export type ThemeId = 'classic' | 'minimal' | 'bold' | 'maison' | 'market';

export type CopyTemplate = 'order_confirmation' | 'order_shipped' | 'order_status' | 'order_refunded' | 'abandoned_checkout';

export interface StoreContent {
  heroTitle?: string;
  heroText?: string;
  features?: { title: string; text: string }[];
  promises?: { title: string; text: string }[];
  faq?: { q: string; a: string }[];
}

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
  notifyEmail?: string;
  lowStockThreshold?: number;
  abandonedCartEmails?: boolean;
  emailCopy?: Partial<Record<CopyTemplate, { subject?: string; intro?: string }>>;
  content?: StoreContent;
  shippingFlat: number;
  freeShippingOver?: number;
  shippingCountries?: string[];
  active: boolean;
  createdAt: Date;
}

export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductOption {
  name: string;
  values: string[];
}

export interface Variant {
  id: string;
  options: string[];
  price: number;
  compareAt?: number;
  stock: number;
  sku?: string;
}

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
  sku?: string;
  options: ProductOption[];
  variants: Variant[];
  categoryIds: ObjectId[];
  status: ProductStatus;
  tags: string[];
  ratingAvg?: number;
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  _id: ObjectId;
  storeId: ObjectId;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  sort: number;
}

export type DiscountType = 'percent' | 'fixed' | 'free_shipping';

export interface Discount {
  _id: ObjectId;
  storeId: ObjectId;
  code: string;
  type: DiscountType;
  value: number;
  minSubtotal?: number;
  startsAt?: Date;
  endsAt?: Date;
  usageLimit?: number;
  usageCount: number;
  active: boolean;
  createdAt: Date;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  productId: ObjectId;
  variantId?: string;
  title: string;
  variantTitle?: string;
  sku?: string;
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

export interface Fulfillment {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  at: Date;
}

export interface Order {
  _id: ObjectId;
  storeId: ObjectId;
  number: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  total: number;
  refundedAmount?: number;
  currency: string;
  customer: { email?: string; name?: string; phone?: string };
  shippingAddress?: Address;
  fulfillment?: Fulfillment;
  flags?: string[];
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  recoveryEmailSent?: boolean;
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
  lastLoginAt?: Date;
  createdAt: Date;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  _id: ObjectId;
  storeId: ObjectId;
  productId: ObjectId;
  orderId?: ObjectId;
  email: string;
  name: string;
  rating: number;
  title?: string;
  body: string;
  verified: boolean;
  status: ReviewStatus;
  createdAt: Date;
}

export interface Subscriber {
  _id: ObjectId;
  storeId: ObjectId;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  token: string;
  createdAt: Date;
}

export interface Broadcast {
  _id: ObjectId;
  storeId: ObjectId;
  subject: string;
  text: string;
  status: 'queued' | 'sending' | 'sent';
  cursor?: ObjectId;
  sent: number;
  failed: number;
  createdBy?: string;
  createdAt: Date;
  finishedAt?: Date;
}

export interface EmailRecord {
  _id: ObjectId;
  storeId?: ObjectId;
  orderId?: ObjectId;
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
