import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { db, ensureIndexes, ObjectId, scoped } from '@shop/core/db';
import { hashPassword, signToken, verifyPassword, verifyToken } from '@shop/core/auth';
import { fail, oid, type AppEnv, type Env } from './lib';
import { catalog } from './routes/catalog';
import { sales } from './routes/sales';
import { marketing } from './routes/marketing';
import { stores } from './routes/stores';

const app = new Hono<AppEnv>().basePath('/api');

app.use('*', (_c, next) => scoped(next));

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError) return c.json({ error: err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '), issues: err.issues }, 400);
  if ((err as { code?: number }).code === 11000) return c.json({ error: 'Something with that handle or code already exists' }, 409);
  console.error(err);
  return c.json({ error: err.message.replace(/^Error: /, '') || 'Server error' }, 500);
});

const credentials = z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(10) });

app.get('/auth/status', async (c) => {
  const count = await (await db(c.env)).admins.estimatedDocumentCount();
  return c.json({ needsSetup: count === 0 });
});

app.post('/auth/setup', async (c) => {
  const body = credentials.parse(await c.req.json());
  const d = await db(c.env);
  if ((await d.admins.countDocuments({}, { limit: 1 })) > 0) fail(403, 'Already set up');
  await ensureIndexes(d);
  const admin = { _id: new ObjectId(), email: body.email.toLowerCase(), name: body.name, passwordHash: await hashPassword(body.password), role: 'owner' as const, createdAt: new Date() };
  await d.admins.insertOne(admin);
  const token = await signToken({ sub: admin._id.toHexString(), email: admin.email, role: admin.role }, c.env.AUTH_SECRET);
  return c.json({ token, user: { email: admin.email, name: admin.name, role: admin.role } });
});

app.post('/auth/login', async (c) => {
  const body = z.object({ email: z.string(), password: z.string() }).parse(await c.req.json());
  const admin = await (await db(c.env)).admins.findOne({ email: body.email.toLowerCase() });
  if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) fail(401, 'Wrong email or password');
  const token = await signToken({ sub: admin!._id.toHexString(), email: admin!.email, role: admin!.role }, c.env.AUTH_SECRET);
  return c.json({ token, user: { email: admin!.email, name: admin!.name, role: admin!.role } });
});

app.use('*', async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer /, '');
  const user = token ? await verifyToken(token, c.env.AUTH_SECRET) : null;
  if (!user || user.role === 'customer' || user.role === 'login') fail(401, 'Sign in required');
  c.set('user', user!);
  await next();
});

app.get('/auth/me', async (c) => {
  const admin = await (await db(c.env)).admins.findOne({ _id: oid(c.get('user').sub) }, { projection: { passwordHash: 0 } });
  if (!admin) fail(401, 'Account removed');
  return c.json({ email: admin!.email, name: admin!.name, role: admin!.role, storefrontUrl: c.env.STOREFRONT_URL ?? '', media: Boolean(c.env.MEDIA) });
});

app.post('/auth/password', async (c) => {
  const body = z.object({ current: z.string(), next: z.string().min(10) }).parse(await c.req.json());
  const d = await db(c.env);
  const admin = await d.admins.findOne({ _id: oid(c.get('user').sub) });
  if (!admin || !(await verifyPassword(body.current, admin.passwordHash))) fail(400, 'Current password is wrong');
  await d.admins.updateOne({ _id: admin!._id }, { $set: { passwordHash: await hashPassword(body.next) } });
  return c.json({ ok: true });
});

app.route('/', stores);
app.route('/', catalog);
app.route('/', sales);
app.route('/', marketing);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/media/')) {
      if (!env.MEDIA) return new Response('Not found', { status: 404 });
      const obj = await env.MEDIA.get(url.pathname.slice('/media/'.length));
      if (!obj) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('cache-control', 'public, max-age=31536000, immutable');
      return new Response(obj.body, { headers });
    }
    return app.fetch(request, env, ctx);
  },
};
