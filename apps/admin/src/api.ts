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

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'delivered' | 'cancelled' | 'refunded';
export type ThemeId = 'classic' | 'minimal' | 'bold';

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
  shippingFlat: number;
  freeShippingOver?: number;
  active: boolean;
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
  status: 'draft' | 'active' | 'archived';
  tags: string[];
  updatedAt: string;
}

export interface Order {
  _id: string;
  number: number;
  status: OrderStatus;
  items: { productId: string; title: string; image?: string; price: number; quantity: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  customer: { email?: string; name?: string; phone?: string };
  shippingAddress?: Record<string, string | undefined>;
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
}

export interface Paged<T> {
  items: T[];
  total: number;
}
