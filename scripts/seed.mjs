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

const images = ['photo-1523275335684-37898b6baf30', 'photo-1505740420928-5e560c06d30e', 'photo-1542291026-7eec264c27ff', 'photo-1572635196237-14b3f281503f'];
const titles = ['Field Watch', 'Studio Headphones', 'Runner Sneaker', 'Round Sunglasses'];

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
    themeSettings: { accent: d.accent, tagline: d.tagline, announcement: 'Free shipping on orders over $100' },
    emailFrom: 'orders@example.com',
    shippingFlat: 800,
    freeShippingOver: 10000,
    active: true,
    createdAt: now,
  });
  await db.collection('products').insertMany(
    titles.map((title, i) => ({
      _id: new ObjectId(),
      storeId,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      description: `${title} from ${d.name}. Replace this with your own copy.`,
      images: [`https://images.unsplash.com/${images[i]}?w=900&q=70`],
      price: [12900, 8900, 11000, 4500][i],
      compareAt: i === 1 ? 11900 : undefined,
      stock: 25,
      status: 'active',
      tags: [],
      createdAt: new Date(now.getTime() - i * 1000),
      updatedAt: now,
    })),
  );
  console.log(`seeded ${d.slug}`);
}

await client.close();
