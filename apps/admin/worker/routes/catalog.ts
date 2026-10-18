import { categoryInput, productFields, productInput, variantProblem, type Product } from '@shop/core';
import { db, ObjectId } from '@shop/core/db';
import { escapeRegex, fail, oid, paging, patch, router } from '../lib';

export const catalog = router();

type ProductBody = { price?: number; stock?: number; variants?: { price: number; stock: number }[]; categoryIds?: string[] };

// Variant products keep a product-level price (the lowest) and stock (the total) so listings can sort and filter on them.
function normalize<T extends ProductBody>(input: T) {
  const out: Record<string, unknown> = { ...input };
  if (input.variants?.length) {
    out.price = Math.min(...input.variants.map((v) => v.price));
    out.stock = input.variants.reduce((s, v) => s + v.stock, 0);
  }
  if (input.categoryIds) out.categoryIds = input.categoryIds.map((id) => new ObjectId(id));
  return out as Omit<T, 'categoryIds'> & { categoryIds?: ObjectId[] };
}

catalog.get('/products', async (c) => {
  const q = c.req.query();
  const filter: Record<string, unknown> = { storeId: oid(q.storeId) };
  if (q.status) filter.status = q.status;
  if (q.category) filter.categoryIds = oid(q.category);
  if (q.lowStock) filter.stock = { $lte: Number(q.lowStock) };
  if (q.q) filter.$or = [{ title: { $regex: escapeRegex(q.q), $options: 'i' } }, { sku: q.q }, { 'variants.sku': q.q }];
  const { limit, skip } = paging(q);
  const d = await db(c.env);
  const [items, total] = await Promise.all([d.products.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(), d.products.countDocuments(filter)]);
  return c.json({ items, total });
});

catalog.post('/products', async (c) => {
  const body = await c.req.json();
  const input = normalize(productInput.parse(body));
  const now = new Date();
  const doc = { _id: new ObjectId(), storeId: oid(String(body.storeId ?? '')), ...input, categoryIds: input.categoryIds ?? [], createdAt: now, updatedAt: now } as Product;
  await (await db(c.env)).products.insertOne(doc, { ignoreUndefined: true });
  return c.json(doc, 201);
});

catalog.get('/products/:id', async (c) => {
  const p = await (await db(c.env)).products.findOne({ _id: oid(c.req.param('id')) });
  if (!p) fail(404, 'Product not found');
  return c.json(p);
});

catalog.put('/products/:id', async (c) => {
  const d = await db(c.env);
  const id = oid(c.req.param('id'));
  const existing = await d.products.findOne({ _id: id });
  if (!existing) fail(404, 'Product not found');
  const body = await c.req.json();
  const unset: Record<string, ''> = {};
  for (const key of ['compareAt', 'sku']) {
    if (body[key] === null) {
      unset[key] = '';
      delete body[key];
    }
  }
  const input = normalize(patch(productFields, body));
  const problem = variantProblem({ options: input.options ?? existing!.options, variants: input.variants ?? existing!.variants });
  if (problem) fail(400, problem);
  const r = await d.products.findOneAndUpdate(
    { _id: id },
    { $set: { ...input, updatedAt: new Date() }, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: 'after', ignoreUndefined: true },
  );
  return c.json(r);
});

catalog.post('/products/:id/duplicate', async (c) => {
  const d = await db(c.env);
  const p = await d.products.findOne({ _id: oid(c.req.param('id')) });
  if (!p) fail(404, 'Product not found');
  const now = new Date();
  const copy = { ...p!, _id: new ObjectId(), slug: `${p!.slug}-copy-${now.getTime().toString(36)}`, title: `${p!.title} (copy)`, status: 'draft' as const, ratingAvg: undefined, ratingCount: undefined, createdAt: now, updatedAt: now };
  await d.products.insertOne(copy, { ignoreUndefined: true });
  return c.json(copy, 201);
});

catalog.delete('/products/:id', async (c) => {
  await (await db(c.env)).products.updateOne({ _id: oid(c.req.param('id')) }, { $set: { status: 'archived', updatedAt: new Date() } });
  return c.json({ ok: true });
});

catalog.get('/categories', async (c) => {
  const storeId = oid(c.req.query('storeId'));
  const d = await db(c.env);
  const [categories, counts] = await Promise.all([
    d.categories.find({ storeId }).sort({ sort: 1, name: 1 }).toArray(),
    d.products.aggregate<{ _id: ObjectId; n: number }>([{ $match: { storeId, status: { $ne: 'archived' } } }, { $unwind: '$categoryIds' }, { $group: { _id: '$categoryIds', n: { $sum: 1 } } }]).toArray(),
  ]);
  const byId = new Map(counts.map((x) => [x._id.toHexString(), x.n]));
  return c.json(categories.map((cat) => ({ ...cat, productCount: byId.get(cat._id.toHexString()) ?? 0 })));
});

catalog.post('/categories', async (c) => {
  const body = await c.req.json();
  const doc = { _id: new ObjectId(), storeId: oid(String(body.storeId ?? '')), ...categoryInput.parse(body) };
  await (await db(c.env)).categories.insertOne(doc, { ignoreUndefined: true });
  return c.json(doc, 201);
});

catalog.put('/categories/:id', async (c) => {
  const r = await (await db(c.env)).categories.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: patch(categoryInput, await c.req.json()) }, { returnDocument: 'after', ignoreUndefined: true });
  if (!r) fail(404, 'Category not found');
  return c.json(r);
});

catalog.delete('/categories/:id', async (c) => {
  const id = oid(c.req.param('id'));
  const d = await db(c.env);
  await d.products.updateMany({ categoryIds: id }, { $pull: { categoryIds: id } });
  await d.categories.deleteOne({ _id: id });
  return c.json({ ok: true });
});

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

catalog.post('/media', async (c) => {
  if (!c.env.MEDIA) fail(400, 'Image uploads need the MEDIA R2 bucket binding');
  const form = await c.req.formData();
  const file = form.get('file');
  const storeId = oid(String(form.get('storeId') ?? '')).toHexString();
  if (!(file instanceof File)) fail(400, 'No file');
  const f = file as File;
  const ext = IMAGE_TYPES[f.type];
  if (!ext) fail(415, 'Use a JPEG, PNG, WebP, GIF or AVIF image');
  if (f.size > 10 * 1024 * 1024) fail(413, 'Images must be under 10 MB');
  const key = `${storeId}/${crypto.randomUUID()}.${ext}`;
  await c.env.MEDIA!.put(key, f.stream(), { httpMetadata: { contentType: f.type } });
  return c.json({ url: `/media/${key}` }, 201);
});
