import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Binding, OrdersService, Product, Store } from '@shop/core';
import { db, ObjectId, scoped, type DbEnv } from '@shop/core/db';
import { getTheme } from './themes';
import type { CartView, Theme } from './themes/types';

interface Env extends DbEnv {
  ORDERS: Binding<OrdersService>;
  DEFAULT_STORE?: string;
}

type Vars = { store: Store; theme: Theme; cart: Map<string, number> };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

const storeCache = new Map<string, { store: Store | null; at: number }>();
const STORE_TTL = 60_000;

async function findStore(env: Env, key: string, query: Record<string, unknown>): Promise<Store | null> {
  const hit = storeCache.get(key);
  if (hit && Date.now() - hit.at < STORE_TTL) return hit.store;
  const store = await (await db(env)).stores.findOne({ ...query, active: true });
  storeCache.set(key, { store, at: Date.now() });
  return store;
}

const cartCookie = (store: Store) => `cart_${store.slug}`;

function parseCart(raw: string | undefined): Map<string, number> {
  const cart = new Map<string, number>();
  for (const part of (raw ?? '').split(',')) {
    const [id, q] = part.split(':');
    const qty = Number(q);
    if (id && /^[a-f0-9]{24}$/.test(id) && qty > 0) cart.set(id, Math.min(qty, 99));
  }
  return cart;
}

function saveCart(c: Parameters<typeof setCookie>[0], store: Store, cart: Map<string, number>) {
  const value = [...cart].filter(([, q]) => q > 0).map(([id, q]) => `${id}:${q}`).join(',');
  setCookie(c, cartCookie(store), value, { path: '/', httpOnly: true, sameSite: 'Lax', secure: true, maxAge: 60 * 60 * 24 * 30 });
}

app.use('*', (_c, next) => scoped(next));

app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  const host = url.hostname;
  const slug = url.searchParams.get('store') ?? getCookie(c, 'sf_store') ?? c.env.DEFAULT_STORE;
  let store = await findStore(c.env, `host:${host}`, { domains: host });
  if (!store && slug) {
    store = await findStore(c.env, `slug:${slug}`, { slug });
    if (store && url.searchParams.has('store')) setCookie(c, 'sf_store', slug, { path: '/', sameSite: 'Lax' });
  }
  store ??= await findStore(c.env, 'first', {});
  if (!store) return c.text('No active store is configured yet. Create one in the admin.', 503);

  // ?theme= previews another design for this browser session only (used by the admin's preview button).
  const themeParam = url.searchParams.get('theme');
  if (themeParam === 'reset') setCookie(c, 'sf_theme', '', { path: '/', maxAge: 0 });
  else if (themeParam) setCookie(c, 'sf_theme', themeParam, { path: '/', sameSite: 'Lax' });
  const themeId = themeParam === 'reset' ? store.theme : (themeParam ?? getCookie(c, 'sf_theme') ?? store.theme);

  c.set('store', store);
  c.set('theme', getTheme(themeId));
  c.set('cart', parseCart(getCookie(c, cartCookie(store))));
  await next();
});

function count(cart: Map<string, number>) {
  let n = 0;
  for (const q of cart.values()) n += q;
  return n;
}

app.get('/', async (c) => {
  const store = c.get('store');
  const { Layout, Home } = c.get('theme');
  const products = await (await db(c.env)).products
    .find({ storeId: store._id, status: 'active' })
    .sort({ createdAt: -1 })
    .limit(48)
    .toArray();
  return c.html(<Layout store={store} cartCount={count(c.get('cart'))}><Home store={store} products={products} /></Layout>);
});

app.get('/products/:slug', async (c) => {
  const store = c.get('store');
  const { Layout, ProductPage, NotFound } = c.get('theme');
  const product = await (await db(c.env)).products.findOne({ storeId: store._id, slug: c.req.param('slug'), status: 'active' });
  const cartCount = count(c.get('cart'));
  if (!product) return c.html(<Layout store={store} cartCount={cartCount} title="Not found"><NotFound store={store} /></Layout>, 404);
  return c.html(<Layout store={store} cartCount={cartCount} title={product.title}><ProductPage store={store} product={product} /></Layout>);
});

async function buildCart(env: Env, store: Store, cart: Map<string, number>): Promise<CartView> {
  const ids = [...cart.keys()].map((id) => new ObjectId(id));
  const products: Product[] = ids.length
    ? await (await db(env)).products.find({ _id: { $in: ids }, storeId: store._id, status: 'active' }).toArray()
    : [];
  const lines = products.map((product) => ({ product, quantity: Math.min(cart.get(product._id.toHexString()) ?? 0, product.stock) })).filter((l) => l.quantity > 0);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const shipping = !lines.length || (store.freeShippingOver != null && subtotal >= store.freeShippingOver) ? 0 : store.shippingFlat;
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

app.get('/cart', async (c) => {
  const store = c.get('store');
  const { Layout, Cart } = c.get('theme');
  const cart = await buildCart(c.env, store, c.get('cart'));
  const error = c.req.query('error');
  return c.html(<Layout store={store} cartCount={count(c.get('cart'))} title="Cart"><Cart store={store} cart={cart} error={error} /></Layout>);
});

app.post('/cart/add', async (c) => {
  const form = await c.req.parseBody();
  const id = String(form.productId ?? '');
  const qty = Math.max(1, Math.min(99, Number(form.quantity) || 1));
  const cart = c.get('cart');
  if (/^[a-f0-9]{24}$/.test(id)) cart.set(id, Math.min(99, (cart.get(id) ?? 0) + qty));
  saveCart(c, c.get('store'), cart);
  return c.redirect('/cart', 303);
});

app.post('/cart/update', async (c) => {
  const form = await c.req.parseBody();
  const cart = c.get('cart');
  for (const [key, value] of Object.entries(form)) {
    if (key.startsWith('q_')) cart.set(key.slice(2), Math.max(0, Math.min(99, Number(value) || 0)));
  }
  saveCart(c, c.get('store'), cart);
  return c.redirect('/cart', 303);
});

app.post('/checkout', async (c) => {
  const store = c.get('store');
  const form = await c.req.parseBody();
  const email = String(form.email ?? '').trim() || undefined;
  const items = [...c.get('cart')].filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
  if (!items.length) return c.redirect('/cart', 303);
  const origin = new URL(c.req.url).origin;
  try {
    const { url } = await c.env.ORDERS.createCheckout({
      storeId: store._id.toHexString(),
      items,
      email,
      successUrl: `${origin}/orders/{ORDER_ID}?s={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/cart`,
    });
    return c.redirect(url, 303);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return c.redirect(`/cart?error=${encodeURIComponent(message)}`, 303);
  }
});

app.get('/orders/:id', async (c) => {
  const store = c.get('store');
  const { Layout, OrderComplete, NotFound } = c.get('theme');
  const id = c.req.param('id');
  const session = c.req.query('s');
  const order =
    /^[a-f0-9]{24}$/.test(id) && session
      ? await (await db(c.env)).orders.findOne({ _id: new ObjectId(id), storeId: store._id, stripeSessionId: session })
      : null;
  if (!order) return c.html(<Layout store={store} cartCount={0} title="Not found"><NotFound store={store} /></Layout>, 404);
  if (order.status !== 'pending') saveCart(c, store, new Map());
  return c.html(<Layout store={store} cartCount={0} title={`Order #${order.number}`}><OrderComplete store={store} order={order} /></Layout>);
});

app.notFound((c) => {
  const store = c.get('store');
  if (!store) return c.text('Not found', 404);
  const { Layout, NotFound } = c.get('theme');
  return c.html(<Layout store={store} cartCount={count(c.get('cart'))} title="Not found"><NotFound store={store} /></Layout>, 404);
});

export default app;
