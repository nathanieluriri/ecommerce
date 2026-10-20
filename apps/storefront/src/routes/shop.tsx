import { Hono } from 'hono';
import type { Filter, Sort } from 'mongodb';
import { reviewInput, type Product, type Store } from '@shop/core';
import { db, ObjectId } from '@shop/core/db';
import { escapeRegex, isId, notFound, page, type AppContext, type Env, type Vars } from '../app';
import { ListingControls } from '../themes/shared';

export const shop = new Hono<{ Bindings: Env; Variables: Vars }>();

const PAGE_SIZE = 24;

const SORTS: Record<string, Sort> = {
  new: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
};

async function listing(c: AppContext, opts: { title: string; description?: string; filter: Filter<Product>; path: string; q?: string }) {
  const store = c.get('store');
  const { Page, ProductGrid } = c.get('theme');
  const sort = SORTS[c.req.query('sort') ?? ''] ? c.req.query('sort')! : 'new';
  const n = Math.max(1, Number(c.req.query('page')) || 1);
  const d = await db(c.env);
  const filter: Filter<Product> = { storeId: store._id, status: 'active', ...opts.filter };
  const [products, total] = await Promise.all([
    d.products.find(filter).sort(SORTS[sort]!).skip((n - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
    d.products.countDocuments(filter),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return page(
    c,
    opts.title,
    <Page title={opts.title}>
      {opts.description ? <p class="muted">{opts.description}</p> : null}
      <ListingControls sort={sort} path={opts.path} q={opts.q} page={n} pages={pages} />
      {products.length ? <ProductGrid store={store} products={products} /> : <p class="muted">Nothing here yet.</p>}
    </Page>,
    { meta: { description: opts.description, noindex: Boolean(opts.q) } },
  );
}

shop.get('/', async (c) => {
  const store = c.get('store');
  const theme = c.get('theme');
  const { Home } = theme;
  const d = await db(c.env);
  const active = { storeId: store._id, status: 'active' as const };
  const rows = theme.homeCollections ? c.get('categories').slice(0, theme.homeCollections) : [];
  const [products, featured, sections] = await Promise.all([
    d.products.find(active).sort({ createdAt: -1 }).limit(12).toArray(),
    theme.homeCollections ? d.products.find({ ...active, tags: { $in: ['Featured', 'featured'] } }).sort({ updatedAt: -1 }).limit(8).toArray() : [],
    Promise.all(rows.map(async (category) => ({ category, products: await d.products.find({ ...active, categoryIds: category._id }).sort({ ratingCount: -1, createdAt: -1 }).limit(8).toArray() }))),
  ]);
  return page(c, undefined, <Home store={store} products={products} categories={c.get('categories')} featured={featured} sections={sections.filter((s) => s.products.length)} />, {
    meta: { jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: store.name, url: new URL(c.req.url).origin } },
  });
});

shop.get('/products', (c) => listing(c, { title: 'Shop all', filter: {}, path: '/products' }));

shop.get('/collections/:slug', (c) => {
  const category = c.get('categories').find((cat) => cat.slug === c.req.param('slug'));
  if (!category) return notFound(c);
  return listing(c, { title: category.name, description: category.description, filter: { categoryIds: category._id }, path: `/collections/${category.slug}` });
});

shop.get('/search', (c) => {
  const q = (c.req.query('q') ?? '').trim().slice(0, 100);
  const rx = { $regex: escapeRegex(q), $options: 'i' };
  return listing(c, {
    title: q ? `Results for "${q}"` : 'Search',
    filter: q ? { $or: [{ title: rx }, { tags: rx }, { description: rx }] } : {},
    path: '/search',
    q,
  });
});

async function hasPurchased(c: AppContext, store: Store, productId: ObjectId, email: string) {
  return Boolean(
    await (await db(c.env)).orders.findOne(
      { storeId: store._id, 'customer.email': { $regex: `^${escapeRegex(email)}$`, $options: 'i' }, 'items.productId': productId, status: { $in: ['paid', 'fulfilled', 'delivered'] } },
      { projection: { _id: 1 } },
    ),
  );
}

function productJsonLd(c: AppContext, store: Store, product: Product) {
  const origin = new URL(c.req.url).origin;
  const abs = (u: string) => (u.startsWith('/') ? `${origin}${u}` : u);
  const prices = product.variants.length ? product.variants.map((v) => v.price) : [product.price];
  const inStock = product.variants.length ? product.variants.some((v) => v.stock > 0) : product.stock > 0;
  const digits = 10 ** (['jpy', 'krw', 'vnd'].includes(store.currency) ? 0 : 2);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description.slice(0, 500),
    image: product.images.map(abs),
    sku: product.sku,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: store.currency.toUpperCase(),
      lowPrice: Math.min(...prices) / digits,
      highPrice: Math.max(...prices) / digits,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${origin}/products/${product.slug}`,
    },
    ...(product.ratingCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } } : {}),
  };
}

shop.get('/products/:slug', async (c) => {
  const store = c.get('store');
  const { ProductPage } = c.get('theme');
  const d = await db(c.env);
  const product = await d.products.findOne({ storeId: store._id, slug: c.req.param('slug'), status: 'active' });
  if (!product) return notFound(c);
  const customer = c.get('customer');
  const [reviews, purchased, already] = await Promise.all([
    d.reviews.find({ productId: product._id, status: 'approved' }).sort({ createdAt: -1 }).limit(20).toArray(),
    customer ? hasPurchased(c, store, product._id, customer) : false,
    customer ? d.reviews.findOne({ productId: product._id, email: customer }, { projection: { _id: 1 } }) : null,
  ]);
  return page(
    c,
    product.title,
    <ProductPage store={store} product={product} reviews={reviews} canReview={purchased && !already} signedIn={Boolean(customer)} image={Math.max(0, Number(c.req.query('img')) || 0)} />,
    { meta: { description: product.description.slice(0, 160), image: product.images[0], jsonLd: productJsonLd(c, store, product) } },
  );
});

shop.post('/products/:slug/reviews', async (c) => {
  const store = c.get('store');
  const customer = c.get('customer');
  const slug = c.req.param('slug');
  if (!customer) return c.redirect('/account', 303);
  const d = await db(c.env);
  const product = await d.products.findOne({ storeId: store._id, slug, status: 'active' });
  if (!product) return notFound(c);
  const form = await c.req.parseBody();
  const parsed = reviewInput.safeParse({ rating: Number(form.rating), title: String(form.title ?? '').trim() || undefined, body: String(form.body ?? '').trim(), name: String(form.name ?? '').trim() });
  if (!parsed.success) return c.redirect(`/products/${slug}?notice=${encodeURIComponent('Please fill in a rating, your name and a review.')}#reviews`, 303);
  if (!(await hasPurchased(c, store, product._id, customer))) return c.redirect(`/products/${slug}?notice=${encodeURIComponent('Only customers who bought this can review it.')}`, 303);
  await d.reviews.updateOne(
    { productId: product._id, email: customer },
    { $setOnInsert: { _id: new ObjectId(), storeId: store._id, productId: product._id, email: customer, ...parsed.data, verified: true, status: 'pending', createdAt: new Date() } },
    { upsert: true, ignoreUndefined: true },
  );
  return c.redirect(`/products/${slug}?notice=${encodeURIComponent('Thanks! Your review will appear once it is approved.')}`, 303);
});

shop.get('/review/:productId', async (c) => {
  const id = c.req.param('productId');
  if (!isId(id)) return notFound(c);
  const p = await (await db(c.env)).products.findOne({ _id: new ObjectId(id), storeId: c.get('store')._id }, { projection: { slug: 1 } });
  return p ? c.redirect(`/products/${p.slug}#reviews`) : notFound(c);
});
