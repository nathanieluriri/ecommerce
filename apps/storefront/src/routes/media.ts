import { Hono } from 'hono';
import type { Env } from '../app';

export const media = new Hono<{ Bindings: Env }>();

media.get('/*', async (c) => {
  if (!c.env.MEDIA) return c.notFound();
  const key = c.req.path.replace(/^\/media\//, '');
  if (!key || key.includes('..')) return c.notFound();
  const cache = caches.default;
  const hit = await cache.match(c.req.raw);
  if (hit) return hit;
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  const res = new Response(obj.body, { headers });
  c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()));
  return res;
});
