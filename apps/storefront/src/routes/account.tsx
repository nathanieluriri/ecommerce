import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';
import { db, ObjectId } from '@shop/core/db';
import { signToken, verifyToken } from '@shop/core/auth';
import { cookieOpts, escapeRegex, isId, notFound, page, type AppContext, type Env, type Vars } from '../app';
import { money, OrderSummary } from '../themes/shared';

export const account = new Hono<{ Bindings: Env; Variables: Vars }>();

const emailSchema = z.string().trim().toLowerCase().email().max(200);
const emailFilter = (email: string) => ({ $regex: `^${escapeRegex(email)}$`, $options: 'i' });

function LoginForm({ sent }: { sent?: boolean }) {
  if (sent)
    return (
      <p>
        If that address has an account or past orders, a sign-in link is on its way. It expires in 15 minutes.
      </p>
    );
  return (
    <form method="post" action="/account/login" class="stack" style="max-width:26rem">
      <p class="muted">Enter your email and we will send you a link to sign in. No password needed.</p>
      <label class="field"><span>Email</span><input type="email" name="email" required autocomplete="email" /></label>
      <button class="btn" type="submit">Email me a sign-in link</button>
    </form>
  );
}

account.get('/account', async (c) => {
  const store = c.get('store');
  const { Page } = c.get('theme');
  const customer = c.get('customer');
  if (!customer) return page(c, 'Sign in', <Page title="Sign in"><LoginForm sent={c.req.query('sent') === '1'} /></Page>, { meta: { noindex: true } });
  const orders = await (await db(c.env)).orders
    .find({ storeId: store._id, 'customer.email': emailFilter(customer), status: { $ne: 'pending' } }, { projection: { timeline: 0 } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return page(
    c,
    'Your account',
    <Page title="Your account">
      <p class="muted">Signed in as {customer}</p>
      <h2>Orders</h2>
      {orders.length ? (
        <ul class="orders-list">
          {orders.map((o) => (
            <li>
              <a href={`/account/orders/${o._id.toHexString()}`}>Order #{o.number}</a>
              <span class="muted">{o.createdAt.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>{o.status}</span>
              <span>{money(store, o.total)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p class="muted">No orders yet.</p>
      )}
      <form method="post" action="/account/logout"><button class="btn btn-ghost" type="submit">Sign out</button></form>
    </Page>,
    { meta: { noindex: true } },
  );
});

account.post('/account/login', async (c) => {
  const store = c.get('store');
  const form = await c.req.parseBody();
  const parsed = emailSchema.safeParse(form.email);
  if (!parsed.success) return c.redirect('/account', 303);
  const email = parsed.data;
  const d = await db(c.env);
  const storeId = store._id.toHexString();
  const recent = await d.logins.countDocuments({ storeId, email, at: { $gt: new Date(Date.now() - 60_000) } });
  if (!recent && c.env.CUSTOMER_SECRET) {
    const nonce = crypto.randomUUID();
    await d.logins.insertOne({ _id: nonce, storeId, email, at: new Date() });
    const token = await signToken({ sub: email, email, role: 'login', store: storeId, nonce }, c.env.CUSTOMER_SECRET, 15 * 60);
    const link = `${new URL(c.req.url).origin}/account/verify?token=${encodeURIComponent(token)}`;
    c.executionCtx.waitUntil(c.env.EMAIL.send({ storeId, to: email, template: 'magic_link', link }).then(() => undefined, console.error));
  }
  return c.redirect('/account?sent=1', 303);
});

account.get('/account/verify', async (c) => {
  const store = c.get('store');
  const token = c.req.query('token') ?? '';
  const payload = c.env.CUSTOMER_SECRET ? await verifyToken(token, c.env.CUSTOMER_SECRET) : null;
  const valid = payload?.role === 'login' && payload.store === store._id.toHexString() && payload.nonce;
  const used = valid ? await (await db(c.env)).logins.deleteOne({ _id: payload.nonce! }) : null;
  if (!valid || !used?.deletedCount) return c.redirect(`/account?notice=${encodeURIComponent('That sign-in link has expired. Request a new one.')}`, 303);
  const session = await signToken({ sub: payload.email, email: payload.email, role: 'customer', store: payload.store }, c.env.CUSTOMER_SECRET, 60 * 60 * 24 * 30);
  setCookie(c, 'sf_session', session, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  await (await db(c.env)).customers.updateOne({ storeId: store._id, email: payload.email }, { $set: { lastLoginAt: new Date() } });
  return c.redirect('/account', 303);
});

account.post('/account/logout', (c) => {
  setCookie(c, 'sf_session', '', { ...cookieOpts, maxAge: 0 });
  return c.redirect('/', 303);
});

account.get('/account/orders/:id', async (c) => {
  const store = c.get('store');
  const { Page } = c.get('theme');
  const customer = c.get('customer');
  const id = c.req.param('id');
  if (!customer) return c.redirect('/account', 303);
  const order = isId(id) ? await (await db(c.env)).orders.findOne({ _id: new ObjectId(id), storeId: store._id, 'customer.email': emailFilter(customer) }) : null;
  if (!order) return notFound(c);
  const reviewable = ['paid', 'fulfilled', 'delivered'].includes(order.status);
  return page(c, `Order #${order.number}`, <Page><OrderSummary store={store} order={order} reviewable={reviewable} /><a href="/account">Back to your orders</a></Page>, { meta: { noindex: true } });
});

function TrackForm({ error }: { error?: string }) {
  return (
    <form method="post" action="/track" class="stack" style="max-width:26rem">
      {error ? <p class="error">{error}</p> : null}
      <label class="field"><span>Order number</span><input name="number" inputmode="numeric" required /></label>
      <label class="field"><span>Email used at checkout</span><input type="email" name="email" required /></label>
      <button class="btn" type="submit">Find my order</button>
    </form>
  );
}

account.get('/track', (c) => {
  const { Page } = c.get('theme');
  return page(c, 'Track an order', <Page title="Track an order"><TrackForm /></Page>);
});

account.post('/track', async (c: AppContext) => {
  const store = c.get('store');
  const { Page } = c.get('theme');
  const form = await c.req.parseBody();
  const number = Number(String(form.number ?? '').replace('#', ''));
  const email = emailSchema.safeParse(form.email);
  const order =
    number && email.success
      ? await (await db(c.env)).orders.findOne({ storeId: store._id, number, 'customer.email': emailFilter(email.data), status: { $ne: 'pending' } })
      : null;
  if (!order) return page(c, 'Track an order', <Page title="Track an order"><TrackForm error="We could not find an order with those details." /></Page>);
  return page(c, `Order #${order.number}`, <Page><OrderSummary store={store} order={order} /></Page>, { meta: { noindex: true } });
});
