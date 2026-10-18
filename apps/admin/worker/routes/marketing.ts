import { z } from 'zod';
import { db, ObjectId, type Collections } from '@shop/core/db';
import { csv, escapeRegex, fail, oid, paging, router } from '../lib';

export const marketing = router();

async function refreshRating(d: Collections, productId: ObjectId) {
  const [agg] = await d.reviews
    .aggregate<{ avg: number; count: number }>([{ $match: { productId, status: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
    .toArray();
  await d.products.updateOne(
    { _id: productId },
    agg ? { $set: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.count } } : { $unset: { ratingAvg: '', ratingCount: '' } },
  );
}

marketing.get('/reviews', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId) };
  if (q.status) filter.status = q.status;
  const { limit, skip } = paging(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([d.reviews.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(), d.reviews.countDocuments(filter)]);
  const products = await d.products.find({ _id: { $in: [...new Set(items.map((r) => r.productId))] } }, { projection: { title: 1, slug: 1 } }).toArray();
  const byId = new Map(products.map((p) => [p._id.toHexString(), p]));
  return c.json({ items: items.map((r) => ({ ...r, product: byId.get(r.productId.toHexString()) ?? null })), total });
});

marketing.put('/reviews/:id', async (c) => {
  const { status } = z.object({ status: z.enum(['pending', 'approved', 'rejected']) }).parse(await c.req.json());
  const d = await db(c.env);
  const r = await d.reviews.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: { status } }, { returnDocument: 'after' });
  if (!r) fail(404, 'Review not found');
  await refreshRating(d, r!.productId);
  return c.json(r);
});

marketing.delete('/reviews/:id', async (c) => {
  const d = await db(c.env);
  const r = await d.reviews.findOneAndDelete({ _id: oid(c.req.param('id')) });
  if (r) await refreshRating(d, r.productId);
  return c.json({ ok: true });
});

marketing.get('/subscribers', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId) };
  if (q.status) filter.status = q.status;
  if (q.q) filter.email = { $regex: escapeRegex(q.q), $options: 'i' };
  const { limit, skip } = paging(q);
  const d = await db(c.env);
  const [items, total, subscribed] = await Promise.all([
    d.subscribers.find(filter, { projection: { token: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    d.subscribers.countDocuments(filter),
    d.subscribers.countDocuments({ storeId: filter.storeId as ObjectId, status: 'subscribed' }),
  ]);
  return c.json({ items, total, subscribed });
});

marketing.get('/subscribers/export', async (c) => {
  const subs = await (await db(c.env)).subscribers.find({ storeId: oid(c.req.query('storeId')), status: 'subscribed' }).sort({ createdAt: 1 }).toArray();
  return c.body(csv([['Email', 'Subscribed at'], ...subs.map((s) => [s.email, s.createdAt.toISOString()])]), 200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': 'attachment; filename="subscribers.csv"',
  });
});

marketing.post('/subscribers', async (c) => {
  const body = z.object({ storeId: z.string(), emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(5000) }).parse(await c.req.json());
  const storeId = oid(body.storeId);
  const ops = body.emails.map((email) => ({
    updateOne: {
      filter: { storeId, email },
      update: { $setOnInsert: { _id: new ObjectId(), status: 'subscribed' as const, token: crypto.randomUUID().replace(/-/g, ''), createdAt: new Date() } },
      upsert: true,
    },
  }));
  const r = await (await db(c.env)).subscribers.bulkWrite(ops, { ordered: false });
  return c.json({ added: r.upsertedCount });
});

marketing.delete('/subscribers/:id', async (c) => {
  await (await db(c.env)).subscribers.deleteOne({ _id: oid(c.req.param('id')) });
  return c.json({ ok: true });
});

marketing.get('/broadcasts', async (c) => c.json(await (await db(c.env)).broadcasts.find({ storeId: oid(c.req.query('storeId')) }, { projection: { text: 0 } }).sort({ createdAt: -1 }).limit(50).toArray()));

marketing.post('/broadcasts', async (c) => {
  const body = z.object({ storeId: z.string(), subject: z.string().min(1).max(200), text: z.string().min(1).max(50000) }).parse(await c.req.json());
  const storeId = oid(body.storeId);
  const d = await db(c.env);
  const audience = await d.subscribers.countDocuments({ storeId, status: 'subscribed' });
  if (!audience) fail(400, 'This store has no subscribers yet');
  const doc = { _id: new ObjectId(), storeId, subject: body.subject, text: body.text, status: 'queued' as const, sent: 0, failed: 0, createdBy: c.get('user').email, createdAt: new Date() };
  await d.broadcasts.insertOne(doc);
  return c.json({ ...doc, audience }, 201);
});

marketing.get('/emails', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = {};
  if (q.direction) filter.direction = q.direction;
  if (q.storeId) filter.storeId = oid(q.storeId);
  if (q.status) filter.status = q.status;
  if (q.q) filter.$or = [{ subject: { $regex: escapeRegex(q.q), $options: 'i' } }, { from: { $regex: escapeRegex(q.q), $options: 'i' } }, { to: { $regex: escapeRegex(q.q), $options: 'i' } }];
  const { limit, skip } = paging(q);
  const d = await db(c.env);
  const [items, total, unread] = await Promise.all([
    d.emails.find(filter, { projection: { html: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    d.emails.countDocuments(filter),
    d.emails.countDocuments({ direction: 'in', read: false }),
  ]);
  return c.json({ items, total, unread });
});

marketing.get('/emails/:id', async (c) => {
  const r = await (await db(c.env)).emails.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: { read: true } }, { returnDocument: 'after' });
  if (!r) fail(404, 'Email not found');
  return c.json(r);
});

marketing.post('/emails/send', async (c) => {
  const body = z.object({ storeId: z.string().optional(), to: z.string().email(), subject: z.string().min(1).max(200), text: z.string().min(1).max(50000) }).parse(await c.req.json());
  return c.json(await c.env.EMAIL.send({ ...body, template: 'custom' }));
});
