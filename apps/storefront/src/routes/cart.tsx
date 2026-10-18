import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { lineKey, parseLineKey, priceCart, type PricedCart, type Store } from '@shop/core';
import { db, ObjectId } from '@shop/core/db';
import { cookieOpts, discountCookie, getDiscountCode, isId, notFound, page, saveCart, type AppContext, type Env, type Vars } from '../app';
import { CartView, OrderSummary } from '../themes/shared';

export const cart = new Hono<{ Bindings: Env; Variables: Vars }>();

function requests(lines: Map<string, number>) {
  return [...lines]
    .map(([key, quantity]) => ({ ...parseLineKey(key)!, quantity }))
    .filter((r) => r.productId && r.quantity > 0);
}

export async function buildCart(c: AppContext, store: Store): Promise<PricedCart> {
  const reqs = requests(c.get('cart'));
  const code = getDiscountCode(c);
  const d = await db(c.env);
  const ids = [...new Set(reqs.map((r) => r.productId))].map((id) => new ObjectId(id));
  const [products, discount] = await Promise.all([
    ids.length ? d.products.find({ _id: { $in: ids }, storeId: store._id }).toArray() : [],
    code ? d.discounts.findOne({ storeId: store._id, code }) : null,
  ]);
  const priced = priceCart(store, products, reqs, discount);
  if (code && !discount) priced.discountError = 'That discount code does not exist';
  return priced;
}

cart.get('/cart', async (c) => {
  const store = c.get('store');
  const { Page } = c.get('theme');
  const priced = await buildCart(c, store);
  if (priced.problems.length) {
    saveCart(c, new Map(priced.lines.map((l) => [lineKey(l.product._id.toHexString(), l.variant?.id), l.quantity])));
  }
  const error = c.req.query('error');
  if (error) priced.problems.unshift(error);
  return page(
    c,
    'Cart',
    <Page title="Your cart">
      <CartView store={store} cart={priced} discountCode={getDiscountCode(c)} email={c.get('customer') ?? undefined} />
    </Page>,
    { meta: { noindex: true } },
  );
});

cart.post('/cart/add', async (c) => {
  const form = await c.req.parseBody();
  const productId = String(form.productId ?? '');
  const variantId = form.variantId ? String(form.variantId) : undefined;
  const qty = Math.max(1, Math.min(99, Number(form.quantity) || 1));
  const key = lineKey(productId, variantId);
  if (!parseLineKey(key)) return c.redirect('/cart', 303);
  const lines = c.get('cart');
  lines.set(key, Math.min(99, (lines.get(key) ?? 0) + qty));
  saveCart(c, lines);
  return c.redirect('/cart', 303);
});

cart.post('/cart/update', async (c) => {
  const form = await c.req.parseBody();
  const lines = c.get('cart');
  for (const [key, value] of Object.entries(form)) {
    if (key.startsWith('q_') && lines.has(key.slice(2))) lines.set(key.slice(2), Math.max(0, Math.min(99, Number(value) || 0)));
  }
  if (typeof form.remove === 'string') lines.delete(form.remove);
  saveCart(c, lines);
  return c.redirect('/cart', 303);
});

cart.post('/cart/discount', async (c) => {
  const form = await c.req.parseBody();
  const code = String(form.code ?? '').trim().toUpperCase().slice(0, 40);
  setCookie(c, discountCookie(c.get('store')), code, { ...cookieOpts, maxAge: code ? 60 * 60 * 24 * 7 : 0 });
  return c.redirect('/cart', 303);
});

cart.post('/checkout', async (c) => {
  const store = c.get('store');
  const form = await c.req.parseBody();
  const email = String(form.email ?? '').trim() || c.get('customer') || undefined;
  const items = requests(c.get('cart'));
  if (!items.length) return c.redirect('/cart', 303);
  const origin = new URL(c.req.url).origin;
  try {
    const { url } = await c.env.ORDERS.createCheckout({
      storeId: store._id.toHexString(),
      items,
      email,
      discountCode: getDiscountCode(c),
      origin,
      successUrl: `${origin}/orders/{ORDER_ID}?s={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/cart`,
    });
    return c.redirect(url, 303);
  } catch (err) {
    const message = err instanceof Error ? err.message.replace(/^Error: /, '') : 'Checkout failed';
    return c.redirect(`/cart?error=${encodeURIComponent(message.slice(0, 200))}`, 303);
  }
});

cart.get('/orders/:id', async (c) => {
  const store = c.get('store');
  const { Page } = c.get('theme');
  const id = c.req.param('id');
  const session = c.req.query('s');
  const order =
    isId(id) && session ? await (await db(c.env)).orders.findOne({ _id: new ObjectId(id), storeId: store._id, stripeSessionId: session }) : null;
  if (!order) return notFound(c);
  if (order.status !== 'pending') {
    saveCart(c, new Map());
    setCookie(c, discountCookie(store), '', { ...cookieOpts, maxAge: 0 });
  }
  return page(c, `Order #${order.number}`, <Page><OrderSummary store={store} order={order} thanks /></Page>, { meta: { noindex: true } });
});
