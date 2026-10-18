import { z } from 'zod';
import type { Sort } from 'mongodb';
import { discountInput, fulfillmentInput, ORDER_STATUSES } from '@shop/core';
import { db, ObjectId } from '@shop/core/db';
import { csv, escapeRegex, fail, oid, paging, patch, router } from '../lib';

export const sales = router();

function orderFilter(q: Record<string, string | undefined>) {
  const filter: Record<string, unknown> = { storeId: oid(q.storeId) };
  if (q.status) filter.status = q.status;
  if (q.flag) filter.flags = q.flag;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: new Date(q.from) } : {}), ...(q.to ? { $lte: new Date(`${q.to}T23:59:59Z`) } : {}) };
  if (q.q) {
    const n = Number(q.q.replace('#', ''));
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ 'customer.email': rx }, { 'customer.name': rx }, ...(n ? [{ number: n }] : [])];
  }
  return filter;
}

sales.get('/orders', async (c) => {
  const q = c.req.query();
  const filter = orderFilter(q);
  const { limit, skip } = paging(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([
    d.orders.find(filter, { projection: { timeline: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    d.orders.countDocuments(filter),
  ]);
  return c.json({ items, total });
});

sales.get('/orders/export', async (c) => {
  const orders = await (await db(c.env)).orders.find(orderFilter(c.req.query())).sort({ createdAt: -1 }).limit(20000).toArray();
  const rows = [
    ['Order', 'Date', 'Status', 'Customer', 'Email', 'Items', 'Subtotal', 'Discount', 'Code', 'Shipping', 'Total', 'Refunded', 'Currency', 'Country', 'Tracking'],
    ...orders.map((o) => [
      o.number,
      o.createdAt.toISOString(),
      o.status,
      o.customer.name,
      o.customer.email,
      o.items.map((i) => `${i.quantity}x ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ''}`).join('; '),
      o.subtotal / 100,
      (o.discount ?? 0) / 100,
      o.discountCode,
      o.shipping / 100,
      o.total / 100,
      (o.refundedAmount ?? 0) / 100,
      o.currency.toUpperCase(),
      o.shippingAddress?.country,
      o.fulfillment?.trackingNumber,
    ]),
  ];
  return c.body(csv(rows), 200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="orders.csv"' });
});

sales.get('/orders/:id', async (c) => {
  const o = await (await db(c.env)).orders.findOne({ _id: oid(c.req.param('id')) });
  if (!o) fail(404, 'Order not found');
  return c.json(o);
});

sales.get('/orders/:id/emails', async (c) =>
  c.json(await (await db(c.env)).emails.find({ orderId: oid(c.req.param('id')) }, { projection: { html: 0, text: 0 } }).sort({ createdAt: -1 }).toArray()),
);

sales.post('/orders/:id/status', async (c) => {
  const body = z
    .object({ status: z.enum(ORDER_STATUSES), note: z.string().max(2000).optional(), notify: z.boolean().optional(), fulfillment: fulfillmentInput.optional() })
    .parse(await c.req.json());
  return c.json(await c.env.ORDERS.updateStatus({ orderId: oid(c.req.param('id')).toHexString(), ...body, by: c.get('user').email }));
});

sales.post('/orders/:id/refund', async (c) => {
  const body = z.object({ amount: z.number().int().positive().optional() }).parse(await c.req.json());
  return c.json(await c.env.ORDERS.refund({ orderId: oid(c.req.param('id')).toHexString(), amount: body.amount, by: c.get('user').email }));
});

sales.post('/orders/:id/note', async (c) => {
  const body = z.object({ note: z.string().min(1).max(2000) }).parse(await c.req.json());
  return c.json(await c.env.ORDERS.addNote({ orderId: oid(c.req.param('id')).toHexString(), note: body.note, by: c.get('user').email }));
});

sales.get('/discounts', async (c) => c.json(await (await db(c.env)).discounts.find({ storeId: oid(c.req.query('storeId')) }).sort({ createdAt: -1 }).toArray()));

sales.post('/discounts', async (c) => {
  const body = await c.req.json();
  const input = discountInput.parse(body);
  if (input.type === 'percent' && input.value > 100) fail(400, 'A percentage cannot be over 100');
  const doc = { _id: new ObjectId(), storeId: oid(String(body.storeId ?? '')), ...input, usageCount: 0, createdAt: new Date() };
  await (await db(c.env)).discounts.insertOne(doc, { ignoreUndefined: true });
  return c.json(doc, 201);
});

sales.put('/discounts/:id', async (c) => {
  const r = await (await db(c.env)).discounts.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: patch(discountInput, await c.req.json()) }, { returnDocument: 'after', ignoreUndefined: true });
  if (!r) fail(404, 'Discount not found');
  return c.json(r);
});

sales.delete('/discounts/:id', async (c) => {
  await (await db(c.env)).discounts.deleteOne({ _id: oid(c.req.param('id')) });
  return c.json({ ok: true });
});

sales.get('/customers', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId) };
  if (q.q) filter.$or = [{ email: { $regex: escapeRegex(q.q), $options: 'i' } }, { name: { $regex: escapeRegex(q.q), $options: 'i' } }];
  const { limit, skip } = paging(q);
  const sort: Sort = q.sort === 'spent' ? { totalSpent: -1 } : { lastOrderAt: -1 };
  const d = await db(c.env);
  const [items, total] = await Promise.all([d.customers.find(filter).sort(sort).skip(skip).limit(limit).toArray(), d.customers.countDocuments(filter)]);
  return c.json({ items, total });
});

sales.get('/customers/lookup', async (c) => {
  const email = c.req.query('email') ?? '';
  const customer = await (await db(c.env)).customers.findOne({ storeId: oid(c.req.query('storeId')), email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } }, { projection: { _id: 1, orders: 1 } });
  return c.json(customer);
});

sales.get('/customers/:id', async (c) => {
  const d = await db(c.env);
  const customer = await d.customers.findOne({ _id: oid(c.req.param('id')) });
  if (!customer) fail(404, 'Customer not found');
  const [orders, subscriber] = await Promise.all([
    d.orders
      .find({ storeId: customer!.storeId, 'customer.email': { $regex: `^${escapeRegex(customer!.email)}$`, $options: 'i' } }, { projection: { timeline: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
    d.subscribers.findOne({ storeId: customer!.storeId, email: customer!.email.toLowerCase() }),
  ]);
  return c.json({ customer, orders, subscribed: subscriber?.status === 'subscribed' });
});

sales.get('/stats', async (c) => {
  const storeId = oid(c.req.query('storeId'));
  const days = Math.min(365, Math.max(7, Number(c.req.query('days')) || 30));
  const since = new Date(Date.now() - days * 86400_000);
  const d = await db(c.env);
  const store = await d.stores.findOne({ _id: storeId });
  const paid = ['paid', 'fulfilled', 'delivered', 'refunded'];
  const [daily, byStatus, top, refunds, products, customers, lowStock, pendingReviews, oversold] = await Promise.all([
    d.orders
      .aggregate<{ _id: string; revenue: number; orders: number }>([
        { $match: { storeId, status: { $in: paid }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: { $subtract: ['$total', { $ifNull: ['$refundedAmount', 0] }] } }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    d.orders.aggregate<{ _id: string; count: number }>([{ $match: { storeId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    d.orders
      .aggregate<{ _id: ObjectId; title: string; quantity: number; revenue: number }>([
        { $match: { storeId, status: { $in: paid }, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', title: { $first: '$items.title' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    d.orders.aggregate<{ total: number }>([{ $match: { storeId, createdAt: { $gte: since }, refundedAmount: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: '$refundedAmount' } } }]).toArray(),
    d.products.countDocuments({ storeId, status: 'active' }),
    d.customers.countDocuments({ storeId }),
    d.products.countDocuments({ storeId, status: 'active', stock: { $lte: store?.lowStockThreshold ?? 5 } }),
    d.reviews.countDocuments({ storeId, status: 'pending' }),
    d.orders.countDocuments({ storeId, flags: 'oversold', status: 'paid' }),
  ]);
  const revenue = daily.reduce((s, x) => s + x.revenue, 0);
  const orders = daily.reduce((s, x) => s + x.orders, 0);
  return c.json({
    days,
    revenue,
    orders,
    aov: orders ? Math.round(revenue / orders) : 0,
    refunds: refunds[0]?.total ?? 0,
    daily,
    top,
    byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.count])),
    activeProducts: products,
    customers,
    lowStock,
    pendingReviews,
    oversold,
  });
});
