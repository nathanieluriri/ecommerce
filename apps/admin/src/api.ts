const TOKEN_KEY = 'shop.admin.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setToken(null);
    window.location.assign('/');
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export async function download(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, 'Export failed');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export async function upload(file: File, storeId: string): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.set('file', file);
  form.set('storeId', storeId);
  const res = await fetch('/api/media', { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new ApiError(res.status, data.error ?? 'Upload failed');
  return data.url;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'delivered' | 'cancelled' | 'refunded';
export type ThemeId = 'classic' | 'minimal' | 'bold';
export type CopyTemplate = 'order_confirmation' | 'order_shipped' | 'order_status' | 'order_refunded' | 'abandoned_checkout';

export interface Store {
  _id: string;
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
  shippingFlat: number;
  freeShippingOver?: number;
  shippingCountries?: string[];
  active: boolean;
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
  _id: string;
  storeId: string;
  slug: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  compareAt?: number;
  stock: number;
  sku?: string;
  options: { name: string; values: string[] }[];
  variants: Variant[];
  categoryIds: string[];
  status: 'draft' | 'active' | 'archived';
  tags: string[];
  ratingAvg?: number;
  ratingCount?: number;
  updatedAt: string;
}

export interface Category {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  sort: number;
  productCount?: number;
}

export interface Discount {
  _id: string;
  code: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  minSubtotal?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usageCount: number;
  active: boolean;
}

export interface Order {
  _id: string;
  number: number;
  status: OrderStatus;
  items: { productId: string; variantId?: string; title: string; variantTitle?: string; sku?: string; image?: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  total: number;
  refundedAmount?: number;
  currency: string;
  customer: { email?: string; name?: string; phone?: string };
  shippingAddress?: Record<string, string | undefined>;
  fulfillment?: { carrier?: string; trackingNumber?: string; trackingUrl?: string; at: string };
  flags?: string[];
  stripePaymentIntentId?: string;
  timeline?: { at: string; status?: OrderStatus; note: string; by?: string }[];
  createdAt: string;
}

export interface Customer {
  _id: string;
  email: string;
  name?: string;
  orders: number;
  totalSpent: number;
  lastOrderAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  productId: string;
  product: { _id: string; title: string; slug: string } | null;
  email: string;
  name: string;
  rating: number;
  title?: string;
  body: string;
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Subscriber {
  _id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  createdAt: string;
}

export interface Broadcast {
  _id: string;
  subject: string;
  status: 'queued' | 'sending' | 'sent';
  sent: number;
  failed: number;
  createdBy?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface Email {
  _id: string;
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
  createdAt: string;
}

export interface Me {
  email: string;
  name: string;
  role: 'owner' | 'staff';
  storefrontUrl: string;
  media: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
}
