import type { Context } from 'hono';
import type { Child } from 'hono/jsx';
import { getCookie, setCookie } from 'hono/cookie';
import { serializeCart, type Binding, type Category, type EmailService, type OrdersService, type Store } from '@shop/core';
import type { DbEnv } from '@shop/core/db';
import type { PageMeta, Theme } from './themes/types';

export interface Env extends DbEnv {
  ORDERS: Binding<OrdersService>;
  EMAIL: Binding<EmailService>;
  MEDIA?: R2Bucket;
  CUSTOMER_SECRET: string;
  DEFAULT_STORE?: string;
}

export type Vars = {
  store: Store;
  theme: Theme;
  cart: Map<string, number>;
  categories: Category[];
  customer: string | null;
};

export type AppContext = Context<{ Bindings: Env; Variables: Vars }>;

export const cookieOpts = { path: '/', httpOnly: true, sameSite: 'Lax' as const, secure: true };

export const cartCookie = (store: Store) => `cart_${store.slug}`;
export const discountCookie = (store: Store) => `disc_${store.slug}`;

export function saveCart(c: AppContext, cart: Map<string, number>) {
  setCookie(c, cartCookie(c.get('store')), serializeCart(cart), { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

export function getDiscountCode(c: AppContext): string | undefined {
  return getCookie(c, discountCookie(c.get('store'))) || undefined;
}

export function cartCount(c: AppContext): number {
  let n = 0;
  for (const q of c.get('cart').values()) n += q;
  return n;
}

export const isId = (s: string | undefined): s is string => !!s && /^[a-f0-9]{24}$/.test(s);
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function page(c: AppContext, title: string | undefined, body: Child, opts: { status?: number; meta?: PageMeta } = {}) {
  const { Layout } = c.get('theme');
  const notice = c.req.query('notice');
  return c.html(
    <Layout
      store={c.get('store')}
      title={title}
      meta={opts.meta}
      cartCount={cartCount(c)}
      categories={c.get('categories')}
      customer={c.get('customer')}
      notice={notice}
      url={c.req.url}
    >
      {body}
    </Layout>,
    (opts.status ?? 200) as 200,
  );
}

export function notFound(c: AppContext) {
  const { Page } = c.get('theme');
  return page(
    c,
    'Not found',
    <Page title="Page not found">
      <p class="muted">We could not find what you were looking for.</p>
      <a class="btn" href="/">Back to the shop</a>
    </Page>,
    { status: 404 },
  );
}
