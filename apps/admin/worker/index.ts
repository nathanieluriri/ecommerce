import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { productInput, storeInput, ORDER_STATUSES, type Binding, type EmailService, type OrdersService } from '@shop/core';
import { db, ensureIndexes, ObjectId, type DbEnv } from '@shop/core/db';
import { hashPassword, signToken, verifyPassword, verifyToken, type TokenPayload } from '@shop/core/auth';
import { z } from 'zod';

interface Env extends DbEnv {
  ASSETS: Fetcher;
  ORDERS: Binding<OrdersService>;
  EMAIL: Binding<EmailService>;
  AUTH_SECRET: string;
  STOREFRONT_URL?: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user: TokenPayload } }>().basePath('/api');

const oid = (id: string) => {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HTTPException(400, { message: 'Bad id' });
  return new ObjectId(id);
};

const page = (q: Record<string, string | undefined>) => {
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
  const skip = Math.max(0, (Number(q.page) || 1) - 1) * limit;
  return { limit, skip };
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError) return c.json({ error: 'Invalid input', issues: err.issues }, 400);
  console.error(err);
  return c.json({ error: err.message || 'Server error' }, 500);
});

app.get('/auth/status', async (c) => {
  const count = await (await db(c.env)).admins.estimatedDocumentCount();
  return c.json({ needsSetup: count === 0 });
});

app.post('/auth/setup', async (c) => {
  const body = z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(10) }).parse(await c.req.json());
  const d = await db(c.env);
  if ((await d.admins.countDocuments({}, { limit: 1 })) > 0) throw new HTTPException(403, { message: 'Already set up' });
  await ensureIndexes(d);
  const admin = { _id: new ObjectId(), email: body.email.toLowerCase(), name: body.name, passwordHash: await hashPassword(body.password), role: 'owner' as const, createdAt: new Date() };
  await d.admins.insertOne(admin);
  const token = await signToken({ sub: admin._id.toHexString(), email: admin.email, role: admin.role }, c.env.AUTH_SECRET);
  return c.json({ token, user: { email: admin.email, name: admin.name, role: admin.role } });
});

app.post('/auth/login', async (c) => {
  const body = z.object({ email: z.string(), password: z.string() }).parse(await c.req.json());
  const admin = await (await db(c.env)).admins.findOne({ email: body.email.toLowerCase() });
  if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) throw new HTTPException(401, { message: 'Wrong email or password' });
  const token = await signToken({ sub: admin._id.toHexString(), email: admin.email, role: admin.role }, c.env.AUTH_SECRET);
  return c.json({ token, user: { email: admin.email, name: admin.name, role: admin.role } });
});

app.use('*', async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer /, '');
  const user = token ? await verifyToken(token, c.env.AUTH_SECRET) : null;
  if (!user) throw new HTTPException(401, { message: 'Sign in required' });
  c.set('user', user);
  await next();
});

app.get('/auth/me', async (c) => {
  const admin = await (await db(c.env)).admins.findOne({ _id: oid(c.get('user').sub) }, { projection: { passwordHash: 0 } });
  if (!admin) throw new HTTPException(401, { message: 'Account removed' });
  return c.json({ email: admin.email, name: admin.name, role: admin.role, storefrontUrl: c.env.STOREFRONT_URL ?? '' });
});

app.get('/team', async (c) => c.json(await (await db(c.env)).admins.find({}, { projection: { passwordHash: 0 } }).toArray()));

app.post('/team', async (c) => {
  if (c.get('user').role !== 'owner') throw new HTTPException(403, { message: 'Owners only' });
  const body = z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(10) }).parse(await c.req.json());
  const doc = { _id: new ObjectId(), email: body.email.toLowerCase(), name: body.name, passwordHash: await hashPassword(body.password), role: 'staff' as const, createdAt: new Date() };
  await (await db(c.env)).admins.insertOne(doc);
  return c.json({ id: doc._id.toHexString() }, 201);
});

// Stores
app.get('/stores', async (c) => c.json(await (await db(c.env)).stores.find().sort({ createdAt: 1 }).toArray()));

app.post('/stores', async (c) => {
  const input = storeInput.parse(await c.req.json());
  const doc = { _id: new ObjectId(), ...input, createdAt: new Date() };
  await (await db(c.env)).stores.insertOne(doc);
  return c.json(doc, 201);
});

app.get('/stores/:id', async (c) => {
  const store = await (await db(c.env)).stores.findOne({ _id: oid(c.req.param('id')) });
  if (!store) throw new HTTPException(404, { message: 'Store not found' });
  return c.json(store);
});

app.put('/stores/:id', async (c) => {
  const input = storeInput.partial().parse(await c.req.json());
  const r = await (await db(c.env)).stores.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: input }, { returnDocument: 'after' });
  if (!r) throw new HTTPException(404, { message: 'Store not found' });
  return c.json(r);
});

// Products
app.get('/products', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId ?? '') };
  if (q.status) filter.status = q.status;
  if (q.q) filter.title = { $regex: escapeRegex(q.q), $options: 'i' };
  const { limit, skip } = page(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([
    d.products.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
    d.products.countDocuments(filter),
  ]);
  return c.json({ items, total });
});

app.post('/products', async (c) => {
  const body = await c.req.json();
  const input = productInput.parse(body);
  const now = new Date();
  const doc = { _id: new ObjectId(), storeId: oid(String(body.storeId ?? '')), ...input, createdAt: now, updatedAt: now };
  await (await db(c.env)).products.insertOne(doc);
  return c.json(doc, 201);
});

app.get('/products/:id', async (c) => {
  const p = await (await db(c.env)).products.findOne({ _id: oid(c.req.param('id')) });
  if (!p) throw new HTTPException(404, { message: 'Product not found' });
  return c.json(p);
});

app.put('/products/:id', async (c) => {
  const input = productInput.partial().parse(await c.req.json());
  const r = await (await db(c.env)).products.findOneAndUpdate(
    { _id: oid(c.req.param('id')) },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!r) throw new HTTPException(404, { message: 'Product not found' });
  return c.json(r);
});

app.delete('/products/:id', async (c) => {
  await (await db(c.env)).products.updateOne({ _id: oid(c.req.param('id')) }, { $set: { status: 'archived', updatedAt: new Date() } });
  return c.json({ ok: true });
});

// Orders
app.get('/orders', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId ?? '') };
  if (q.status) filter.status = q.status;
  if (q.q) {
    const n = Number(q.q.replace('#', ''));
    filter.$or = [{ 'customer.email': { $regex: escapeRegex(q.q), $options: 'i' } }, { 'customer.name': { $regex: escapeRegex(q.q), $options: 'i' } }, ...(n ? [{ number: n }] : [])];
  }
  const { limit, skip } = page(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([
    d.orders.find(filter, { projection: { timeline: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    d.orders.countDocuments(filter),
  ]);
  return c.json({ items, total });
});

app.get('/orders/:id', async (c) => {
  const o = await (await db(c.env)).orders.findOne({ _id: oid(c.req.param('id')) });
  if (!o) throw new HTTPException(404, { message: 'Order not found' });
  return c.json(o);
});

app.post('/orders/:id/status', async (c) => {
  const body = z.object({ status: z.enum(ORDER_STATUSES), note: z.string().optional(), notify: z.boolean().optional() }).parse(await c.req.json());
  return c.json(await c.env.ORDERS.updateStatus({ orderId: c.req.param('id'), ...body, by: c.get('user').email }));
});

app.post('/orders/:id/refund', async (c) => {
  const body = z.object({ amount: z.number().int().positive().optional() }).parse(await c.req.json());
  return c.json(await c.env.ORDERS.refund({ orderId: c.req.param('id'), amount: body.amount, by: c.get('user').email }));
});

app.post('/orders/:id/note', async (c) => {
  const body = z.object({ note: z.string().min(1) }).parse(await c.req.json());
  return c.json(await c.env.ORDERS.addNote({ orderId: c.req.param('id'), note: body.note, by: c.get('user').email }));
});

// Customers
app.get('/customers', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId ?? '') };
  if (q.q) filter.email = { $regex: escapeRegex(q.q), $options: 'i' };
  const { limit, skip } = page(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([d.customers.find(filter).sort({ lastOrderAt: -1 }).skip(skip).limit(limit).toArray(), d.customers.countDocuments(filter)]);
  return c.json({ items, total });
});

// Emails
app.get('/emails', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = {};
  if (q.direction) filter.direction = q.direction;
  if (q.storeId) filter.storeId = oid(q.storeId);
  const { limit, skip } = page(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([
    d.emails.find(filter, { projection: { html: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    d.emails.countDocuments(filter),
  ]);
  return c.json({ items, total });
});

app.get('/emails/:id', async (c) => {
  const r = await (await db(c.env)).emails.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: { read: true } }, { returnDocument: 'after' });
  if (!r) throw new HTTPException(404, { message: 'Email not found' });
  return c.json(r);
});

app.post('/emails/send', async (c) => {
  const body = z.object({ storeId: z.string().optional(), to: z.string().email(), subject: z.string().min(1), text: z.string().min(1) }).parse(await c.req.json());
  return c.json(await c.env.EMAIL.send({ ...body, template: 'custom' }));
});

// Dashboard
app.get('/stats', async (c) => {
  const storeId = oid(c.req.query('storeId') ?? '');
  const since = new Date(Date.now() - 30 * 86400_000);
  const d = await db(c.env);
  const paid = ['paid', 'fulfilled', 'delivered'];
  const [daily, byStatus, products, customers] = await Promise.all([
    d.orders
      .aggregate<{ _id: string; revenue: number; orders: number }>([
        { $match: { storeId, status: { $in: paid }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    d.orders.aggregate<{ _id: string; count: number }>([{ $match: { storeId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    d.products.countDocuments({ storeId, status: 'active' }),
    d.customers.countDocuments({ storeId }),
  ]);
  return c.json({
    revenue30d: daily.reduce((s, x) => s + x.revenue, 0),
    orders30d: daily.reduce((s, x) => s + x.orders, 0),
    daily,
    byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.count])),
    activeProducts: products,
    customers,
  });
});

export default {
  fetch: app.fetch,
};
