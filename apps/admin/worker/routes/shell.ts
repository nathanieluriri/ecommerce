import { z } from 'zod';
import { db } from '@shop/core/db';
import { escapeRegex, oid, router } from '../lib';

export const shell = router();

shell.get('/search', async (c) => {
  const storeId = oid(c.req.query('storeId'));
  const q = (c.req.query('q') ?? '').trim().slice(0, 80);
  const d = await db(c.env);
  const rx = { $regex: escapeRegex(q), $options: 'i' };
  const n = Number(q.replace('#', ''));
  const recent = !q;
  const [orders, products, customers, discounts] = await Promise.all([
    d.orders
      .find(recent ? { storeId } : { storeId, $or: [{ 'customer.email': rx }, { 'customer.name': rx }, ...(n ? [{ number: n }] : [])] }, { projection: { number: 1, status: 1, total: 1, currency: 1, 'customer.email': 1, 'customer.name': 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
    d.products.find(recent ? { storeId } : { storeId, $or: [{ title: rx }, { sku: q }, { tags: rx }] }, { projection: { title: 1, status: 1, slug: 1 } }).sort({ updatedAt: -1 }).limit(5).toArray(),
    recent ? [] : d.customers.find({ storeId, $or: [{ email: rx }, { name: rx }] }, { projection: { email: 1, name: 1, orders: 1 } }).limit(5).toArray(),
    d.discounts.find(recent ? { storeId } : { storeId, code: rx }, { projection: { code: 1, active: 1 } }).sort({ createdAt: -1 }).limit(recent ? 3 : 5).toArray(),
  ]);
  return c.json({ orders, products, customers, discounts });
});

shell.get('/alerts', async (c) => {
  const storeId = oid(c.req.query('storeId'));
  const d = await db(c.env);
  const store = await d.stores.findOne({ _id: storeId });
  const since = new Date(Date.now() - 14 * 86400_000);
  const [paid, oversold, reviews, inbox, failed, low] = await Promise.all([
    d.orders.find({ storeId, status: 'paid', createdAt: { $gte: since } }, { projection: { number: 1, total: 1, currency: 1, createdAt: 1, 'customer.name': 1, 'customer.email': 1 } }).sort({ createdAt: -1 }).limit(10).toArray(),
    d.orders.find({ storeId, status: 'paid', flags: 'oversold' }, { projection: { number: 1, createdAt: 1 } }).limit(5).toArray(),
    d.reviews.find({ storeId, status: 'pending' }, { projection: { name: 1, rating: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    d.emails.find({ direction: 'in', read: false }, { projection: { from: 1, subject: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    d.emails.find({ storeId, direction: 'out', status: 'failed', createdAt: { $gte: since } }, { projection: { to: 1, subject: 1, error: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
    d.products.find({ storeId, status: 'active', stock: { $lte: store?.lowStockThreshold ?? 5 } }, { projection: { title: 1, stock: 1, updatedAt: 1 } }).limit(5).toArray(),
  ]);
  const items = [
    ...paid.map((o) => ({ id: `paid:${o._id}`, source: 'Orders', at: o.createdAt, title: `Order #${o.number} is ready to ship`, body: `${o.customer.name ?? o.customer.email ?? 'A customer'} paid. Pack it and mark it shipped.`, to: `/orders/${o._id}` })),
    ...oversold.map((o) => ({ id: `oversold:${o._id}`, source: 'Inventory', at: o.createdAt, title: `Order #${o.number} oversold`, body: 'Stock went below zero. Check inventory before shipping.', to: `/orders/${o._id}` })),
    ...reviews.map((r) => ({ id: `review:${r._id}`, source: 'Reviews', at: r.createdAt, title: `${r.rating}-star review from ${r.name}`, body: 'Waiting for your approval before it shows on the shop.', to: '/reviews' })),
    ...inbox.map((m) => ({ id: `mail:${m._id}`, source: 'Inbox', at: m.createdAt, title: m.subject, body: `From ${m.from}`, to: '/emails' })),
    ...failed.map((m) => ({ id: `failed:${m._id}`, source: 'Emails', at: m.createdAt, title: `Email to ${m.to} failed`, body: m.error ?? m.subject, to: '/emails?tab=out' })),
    ...low.map((p) => ({ id: `low:${p._id}:${p.stock}`, source: 'Inventory', at: p.updatedAt, title: `${p.title} is low on stock`, body: `${p.stock} left`, to: `/products/${p._id}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  return c.json({ items });
});

shell.post('/products/bulk', async (c) => {
  const body = z.object({ ids: z.array(z.string()).min(1).max(200), status: z.enum(['active', 'draft', 'archived']) }).parse(await c.req.json());
  const r = await (await db(c.env)).products.updateMany({ _id: { $in: body.ids.map((id) => oid(id)) } }, { $set: { status: body.status, updatedAt: new Date() } });
  return c.json({ updated: r.modifiedCount });
});
