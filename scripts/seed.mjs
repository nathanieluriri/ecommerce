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

await client.close();
