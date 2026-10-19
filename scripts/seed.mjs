import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI (in .env or the environment).');
  process.exit(1);
}

const client = await new MongoClient(uri).connect();
const db = client.db(process.env.MONGODB_DB || 'shop');
const now = new Date();

const demo = [
  { slug: 'classic-demo', name: 'Classic Demo', theme: 'classic', accent: '#2e2a6b', tagline: 'Everyday goods, shipped fast.' },
  { slug: 'minimal-demo', name: 'Atelier', theme: 'minimal', accent: '#111111', tagline: 'A small collection of considered things.' },
  { slug: 'bold-demo', name: 'LOUD', theme: 'bold', accent: '#ff3d00', tagline: 'New drops every week' },
];

const catalog = [
  { title: 'Field Watch', img: 'photo-1523275335684-37898b6baf30', price: 12900, cat: 'accessories', options: [{ name: 'Strap', values: ['Leather', 'Steel'] }], prices: [12900, 15900] },
  { title: 'Studio Headphones', img: 'photo-1505740420928-5e560c06d30e', price: 8900, compareAt: 11900, cat: 'audio' },
  { title: 'Runner Sneaker', img: 'photo-1542291026-7eec264c27ff', price: 11000, cat: 'footwear', options: [{ name: 'Size', values: ['40', '41', '42', '43'] }] },
  { title: 'Round Sunglasses', img: 'photo-1572635196237-14b3f281503f', price: 4500, cat: 'accessories' },
];
const categories = [
  { slug: 'accessories', name: 'Accessories' },
  { slug: 'audio', name: 'Audio' },
  { slug: 'footwear', name: 'Footwear' },
];

const variantsFor = (item) => {
  if (!item.options) return [];
  return item.options[0].values.map((value, i) => ({
    id: `v${i + 1}`,
    options: [value],
    price: item.prices?.[i] ?? item.price,
    stock: i === 0 ? 2 : 12,
    sku: `${item.title.slice(0, 3).toUpperCase()}-${value.toUpperCase().slice(0, 3)}`,
  }));
};

for (const d of demo) {
  const existing = await db.collection('stores').findOne({ slug: d.slug });
  if (existing) {
    console.log(`skip ${d.slug} (exists)`);
    continue;
  }
  const storeId = new ObjectId();
  await db.collection('stores').insertOne({
    _id: storeId,
    slug: d.slug,
    name: d.name,
    domains: [],
    currency: 'usd',
    theme: d.theme,
    themeSettings: { accent: d.accent, tagline: d.tagline, announcement: 'Free shipping on orders over $100. Use WELCOME10 for 10% off.' },
    emailFrom: 'orders@example.com',
    supportEmail: 'help@example.com',
    lowStockThreshold: 5,
    abandonedCartEmails: true,
    shippingFlat: 800,
    freeShippingOver: 10000,
    active: true,
    createdAt: now,
  });
  const catIds = {};
  for (const [i, cat] of categories.entries()) {
    catIds[cat.slug] = new ObjectId();
    await db.collection('categories').insertOne({ _id: catIds[cat.slug], storeId, ...cat, sort: i });
  }
  await db.collection('products').insertMany(
    catalog.map((item, i) => {
      const variants = variantsFor(item);
      return {
        _id: new ObjectId(),
        storeId,
        slug: item.title.toLowerCase().replace(/\s+/g, '-'),
        title: item.title,
        description: `${item.title} from ${d.name}. Replace this with your own copy.`,
        images: [`https://images.unsplash.com/${item.img}?w=900&q=70`],
        price: variants.length ? Math.min(...variants.map((v) => v.price)) : item.price,
        ...(item.compareAt ? { compareAt: item.compareAt } : {}),
        stock: variants.length ? variants.reduce((s, v) => s + v.stock, 0) : 25,
        options: item.options ?? [],
        variants,
        categoryIds: [catIds[item.cat]],
        status: 'active',
        tags: [item.cat],
        createdAt: new Date(now.getTime() - i * 1000),
        updatedAt: now,
      };
    }),
  );
  await db.collection('discounts').insertOne({ _id: new ObjectId(), storeId, code: 'WELCOME10', type: 'percent', value: 10, usageCount: 0, active: true, createdAt: now });
  console.log(`seeded ${d.slug}`);
}

const maisonExists = await db.collection('stores').findOne({ slug: 'maison-de-chantal' });
if (maisonExists) console.log('skip maison-de-chantal (exists)');
else {
  const storeId = new ObjectId();
  await db.collection('stores').insertOne({
    _id: storeId,
    slug: 'maison-de-chantal',
    name: 'Maison de Chantal',
    domains: [],
    currency: 'gbp',
    theme: 'maison',
    themeSettings: { accent: '#5a1028', announcement: 'Thoughtful comfort, delivered across the UK' },
    emailFrom: 'hello@example.com',
    supportEmail: 'hello@example.com',
    lowStockThreshold: 5,
    abandonedCartEmails: true,
    shippingFlat: 395,
    freeShippingOver: 5000,
    shippingCountries: ['GB'],
    active: true,
    createdAt: now,
  });
  const cats = [
    ['sleep', 'Sleep', 'Bedding and pillowcases for deeper, softer sleep.'],
    ['nightwear', 'Nightwear', 'Satin, bamboo and silk, cut for the evening hours.'],
    ['home-scent', 'Home Scent', 'Diffusers, candles and melts that settle the room.'],
    ['cosy-extras', 'Cosy Extras', 'Slippers, throws and cushions that complete the room.'],
    ['gift-sets', 'Gift Sets', 'Thoughtful bundles, wrapped and ready to give.'],
  ];
  const catIds = {};
  for (const [i, [slug, name, description]] of cats.entries()) {
    catIds[slug] = new ObjectId();
    await db.collection('categories').insertOne({ _id: catIds[slug], storeId, slug, name, description, sort: i });
  }
  const P = (title, cat, price, description, extra = {}) => ({ title, cat, price, description, ...extra });
  const items = [
    P('Burgundy Satin Slip', 'nightwear', 3800, 'A bias-cut satin slip in deep burgundy, finished with a scalloped lace hem and a small embroidered crescent. Adjustable straps, a soft drape and a quiet sheen.', { images: ['/maison/nightwear-illustration.webp'], options: [{ name: 'Length', values: ['Knee', 'Long'] }], prices: [3800, 4600] }),
    P('Striped Satin Pyjama Set', 'nightwear', 1500, 'Our signature burgundy and cream stripe in soft satin, with contrast piping and the Maison crescent on the pocket.', { images: ['/maison/sleepwear-bedroom.webp'], options: [{ name: 'Style', values: ['Short', 'Long'] }], prices: [1500, 1900] }),
    P('Satin Wrap Robe', 'nightwear', 3400, 'A calf-length satin robe in burgundy with cream piping, a generous tie belt and deep pockets.', { images: ['/maison/sleepwear-bedroom.webp'] }),
    P('Long Nightgown', 'nightwear', 3200, 'A floor-length nightgown with thin straps and lace at the hem, for slow mornings as much as quiet nights.'),
    P('Bamboo Sheet Set', 'sleep', 2200, 'Cool, breathable bamboo sheets that soften with every wash. Includes a fitted sheet, flat sheet and two pillowcases.', { options: [{ name: 'Size', values: ['Double', 'King'] }], prices: [2200, 2800] }),
    P('Mulberry Silk Pillowcase', 'sleep', 2400, 'Pure mulberry silk, gentle on hair and skin. Hidden envelope closure.'),
    P('Fresh Linen Reed Diffuser', 'home-scent', 1800, 'Clean cotton and soft linen in a 200ml diffuser. Quietly scents a bedroom for weeks.'),
    P('Vanilla and Oud Wax Melts', 'home-scent', 800, 'Warm vanilla over a low note of oud. A refillable evening ritual.'),
    P('Velvet Cushion Covers', 'cosy-extras', 2000, 'A set of two velvet covers in deep plum, with a hidden zip.'),
    P('Crescent Slippers', 'cosy-extras', 1600, 'Plush cream slippers embroidered with the Maison crescent.', { images: ['/maison/sleepwear-bedroom.webp'], options: [{ name: 'Size', values: ['S (3-4)', 'M (5-6)', 'L (7-8)'] }] }),
    P('Sunday Reset Gift Set', 'gift-sets', 4500, 'A three-piece set for a calmer Sunday evening: silk pillowcase, wax melts and a handwritten card, wrapped in our cream box.'),
    P('The Evening Ritual Bundle', 'gift-sets', 6200, 'Satin pyjamas, a reed diffuser and crescent slippers, presented together for someone who deserves a quieter evening.'),
  ];
  await db.collection('products').insertMany(
    items.map((item, i) => {
      const variants = item.options
        ? item.options[0].values.map((value, j) => ({ id: `v${j + 1}`, options: [value], price: item.prices?.[j] ?? item.price, stock: 12, sku: `MDC-${String(i + 1).padStart(2, '0')}-${j + 1}` }))
        : [];
      return {
        _id: new ObjectId(),
        storeId,
        slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
        title: item.title,
        description: item.description,
        images: item.images ?? [],
        price: variants.length ? Math.min(...variants.map((v) => v.price)) : item.price,
        stock: variants.length ? variants.reduce((n, v) => n + v.stock, 0) : 20,
        sku: variants.length ? undefined : `MDC-${String(i + 1).padStart(2, '0')}`,
        options: item.options ?? [],
        variants,
        categoryIds: [catIds[item.cat]],
        status: 'active',
        tags: [item.cat],
        createdAt: new Date(now.getTime() - i * 1000),
        updatedAt: now,
      };
    }),
    { ignoreUndefined: true },
  );
  await db.collection('discounts').insertOne({ _id: new ObjectId(), storeId, code: 'CALM10', type: 'percent', value: 10, usageCount: 0, active: true, createdAt: now });
  console.log('seeded maison-de-chantal');
}

await client.close();
