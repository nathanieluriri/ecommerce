import { z } from 'zod';
import { storeInput } from '@shop/core';
import { db, ObjectId } from '@shop/core/db';
import { hashPassword } from '@shop/core/auth';
import { fail, oid, patch, router } from '../lib';

export const stores = router();

stores.get('/stores', async (c) => c.json(await (await db(c.env)).stores.find().sort({ createdAt: 1 }).toArray()));

stores.post('/stores', async (c) => {
  const input = storeInput.parse(await c.req.json());
  const doc = { _id: new ObjectId(), ...input, createdAt: new Date() };
  await (await db(c.env)).stores.insertOne(doc, { ignoreUndefined: true });
  return c.json(doc, 201);
});

stores.get('/stores/:id', async (c) => {
  const store = await (await db(c.env)).stores.findOne({ _id: oid(c.req.param('id')) });
  if (!store) fail(404, 'Store not found');
  return c.json(store);
});

stores.put('/stores/:id', async (c) => {
  const input = patch(storeInput, await c.req.json());
  const r = await (await db(c.env)).stores.findOneAndUpdate({ _id: oid(c.req.param('id')) }, { $set: input }, { returnDocument: 'after', ignoreUndefined: true });
  if (!r) fail(404, 'Store not found');
  return c.json(r);
});

stores.get('/team', async (c) => c.json(await (await db(c.env)).admins.find({}, { projection: { passwordHash: 0 } }).toArray()));

stores.post('/team', async (c) => {
  if (c.get('user').role !== 'owner') fail(403, 'Owners only');
  const body = z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(10) }).parse(await c.req.json());
  const doc = { _id: new ObjectId(), email: body.email.toLowerCase(), name: body.name, passwordHash: await hashPassword(body.password), role: 'staff' as const, createdAt: new Date() };
  await (await db(c.env)).admins.insertOne(doc);
  return c.json({ id: doc._id.toHexString() }, 201);
});

stores.delete('/team/:id', async (c) => {
  if (c.get('user').role !== 'owner') fail(403, 'Owners only');
  const id = oid(c.req.param('id'));
  if (id.toHexString() === c.get('user').sub) fail(400, 'You cannot remove yourself');
  await (await db(c.env)).admins.deleteOne({ _id: id, role: 'staff' });
  return c.json({ ok: true });
});
