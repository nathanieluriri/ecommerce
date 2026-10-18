import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { parseCartCookie, type Category, type Store } from '@shop/core';
import { db, scoped } from '@shop/core/db';
import { verifyToken } from '@shop/core/auth';
import { getTheme } from './themes';
import { cartCookie, notFound, type Env, type Vars } from './app';
import { media } from './routes/media';
import { shop } from './routes/shop';
import { cart } from './routes/cart';
import { account } from './routes/account';
import { misc } from './routes/misc';

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.route('/media', media);

const TTL = 60_000;
const storeCache = new Map<string, { store: Store | null; at: number }>();
const categoryCache = new Map<string, { categories: Category[]; at: number }>();

async function findStore(env: Env, key: string, query: Record<string, unknown>): Promise<Store | null> {
  const hit = storeCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.store;
  const store = await (await db(env)).stores.findOne({ ...query, active: true });
  storeCache.set(key, { store, at: Date.now() });
  return store;
}

async function findCategories(env: Env, store: Store): Promise<Category[]> {
  const key = store._id.toHexString();
  const hit = categoryCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.categories;
  const categories = await (await db(env)).categories.find({ storeId: store._id }).sort({ sort: 1, name: 1 }).toArray();
  categoryCache.set(key, { categories, at: Date.now() });
  return categories;
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

  // ?theme= previews another design for this browser session only (used by the admin's preview).
  const themeParam = url.searchParams.get('theme');
  if (themeParam === 'reset') setCookie(c, 'sf_theme', '', { path: '/', maxAge: 0 });
  else if (themeParam) setCookie(c, 'sf_theme', themeParam, { path: '/', sameSite: 'Lax' });
  const themeId = themeParam === 'reset' ? store.theme : (themeParam ?? getCookie(c, 'sf_theme') ?? store.theme);

  const session = getCookie(c, 'sf_session');
  const payload = session && c.env.CUSTOMER_SECRET ? await verifyToken(session, c.env.CUSTOMER_SECRET) : null;
  const customer = payload?.role === 'customer' && payload.store === store._id.toHexString() ? payload.email : null;

  c.set('store', store);
  c.set('theme', getTheme(themeId));
  c.set('cart', parseCartCookie(getCookie(c, cartCookie(store))));
  c.set('categories', await findCategories(c.env, store));
  c.set('customer', customer);
  await next();
});

app.route('/', shop);
app.route('/', cart);
app.route('/', account);
app.route('/', misc);

app.notFound((c) => (c.get('store') ? notFound(c) : c.text('Not found', 404)));

app.onError((err, c) => {
  console.error(err);
  return c.text('Something went wrong. Please try again.', 500);
});

export default app;
