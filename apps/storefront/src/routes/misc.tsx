import { Hono } from 'hono';
import { z } from 'zod';
import { db, ObjectId } from '@shop/core/db';
import { page, type Env, type Vars } from '../app';

export const misc = new Hono<{ Bindings: Env; Variables: Vars }>();

const back = (referer: string | undefined, notice: string) => {
  const url = new URL(referer ?? '/', 'http://x');
  url.searchParams.set('notice', notice);
  return `${url.pathname}${url.search}`;
};

misc.post('/subscribe', async (c) => {
  const store = c.get('store');
  const form = await c.req.parseBody();
  const email = z.string().trim().toLowerCase().email().max(200).safeParse(form.email);
  if (!email.success) return c.redirect(back(c.req.header('referer'), 'Please enter a valid email.'), 303);
  await (await db(c.env)).subscribers.updateOne(
    { storeId: store._id, email: email.data },
    { $set: { status: 'subscribed' }, $setOnInsert: { _id: new ObjectId(), token: crypto.randomUUID().replace(/-/g, ''), createdAt: new Date() } },
    { upsert: true },
  );
  return c.redirect(back(c.req.header('referer'), 'Thanks for subscribing!'), 303);
});

misc.get('/unsubscribe', async (c) => {
  const { Page } = c.get('theme');
  const token = c.req.query('t') ?? '';
  const r = token ? await (await db(c.env)).subscribers.updateOne({ token, storeId: c.get('store')._id }, { $set: { status: 'unsubscribed' } }) : null;
  return page(
    c,
    'Unsubscribe',
    <Page title={r?.matchedCount ? 'You are unsubscribed' : 'Link not recognised'}>
      <p class="muted">{r?.matchedCount ? 'You will not get any more newsletters from us.' : 'This unsubscribe link is not valid for this store.'}</p>
    </Page>,
    { meta: { noindex: true } },
  );
});

misc.post('/unsubscribe', async (c) => {
  const token = c.req.query('t') ?? '';
  if (token) await (await db(c.env)).subscribers.updateOne({ token, storeId: c.get('store')._id }, { $set: { status: 'unsubscribed' } });
  return c.text('Unsubscribed');
});

misc.get('/robots.txt', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(`User-agent: *\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\nDisallow: /orders/\nDisallow: /search\nSitemap: ${origin}/sitemap.xml\n`);
});

misc.get('/sitemap.xml', async (c) => {
  const store = c.get('store');
  const origin = new URL(c.req.url).origin;
  const products = await (await db(c.env)).products
    .find({ storeId: store._id, status: 'active' }, { projection: { slug: 1, updatedAt: 1 } })
    .limit(5000)
    .toArray();
  const urls = [
    `<url><loc>${origin}/</loc></url>`,
    `<url><loc>${origin}/products</loc></url>`,
    ...c.get('categories').map((cat) => `<url><loc>${origin}/collections/${cat.slug}</loc></url>`),
    ...products.map((p) => `<url><loc>${origin}/products/${p.slug}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`),
  ];
  return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, 200, {
    'content-type': 'application/xml; charset=utf-8',
  });
});
