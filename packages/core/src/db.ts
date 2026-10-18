import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Admin, Customer, EmailRecord, Order, Product, Store } from './types';

let client: MongoClient | undefined;
let connecting: Promise<MongoClient> | undefined;

// Workers reuse module state across requests in the same isolate, so one client per isolate.
async function getClient(uri: string): Promise<MongoClient> {
  if (client) return client;
  connecting ??= new MongoClient(uri, { maxPoolSize: 1, minPoolSize: 0, serverSelectionTimeoutMS: 8000 })
    .connect()
    .then((c) => (client = c))
    .catch((err) => {
      connecting = undefined;
      throw err;
    });
  return connecting;
}

export interface DbEnv {
  MONGODB_URI: string;
  MONGODB_DB?: string;
}

export interface Collections {
  db: Db;
  stores: Collection<Store>;
  products: Collection<Product>;
  orders: Collection<Order>;
  customers: Collection<Customer>;
  emails: Collection<EmailRecord>;
  admins: Collection<Admin>;
  counters: Collection<{ _id: string; seq: number }>;
}

export async function db(env: DbEnv): Promise<Collections> {
  const d = (await getClient(env.MONGODB_URI)).db(env.MONGODB_DB || 'shop');
  return {
    db: d,
    stores: d.collection('stores'),
    products: d.collection('products'),
    orders: d.collection('orders'),
    customers: d.collection('customers'),
    emails: d.collection('emails'),
    admins: d.collection('admins'),
    counters: d.collection('counters'),
  };
}

export async function nextOrderNumber(c: Collections, storeId: string): Promise<number> {
  const r = await c.counters.findOneAndUpdate(
    { _id: storeId },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return 1000 + (r?.seq ?? 1);
}

export async function ensureIndexes(c: Collections): Promise<void> {
  await Promise.all([
    c.stores.createIndex({ slug: 1 }, { unique: true }),
    c.stores.createIndex({ domains: 1 }),
    c.products.createIndex({ storeId: 1, slug: 1 }, { unique: true }),
    c.products.createIndex({ storeId: 1, status: 1, createdAt: -1 }),
    c.orders.createIndex({ storeId: 1, createdAt: -1 }),
    c.orders.createIndex({ stripeSessionId: 1 }, { sparse: true }),
    c.orders.createIndex({ status: 1, createdAt: 1 }),
    c.customers.createIndex({ storeId: 1, email: 1 }, { unique: true }),
    c.emails.createIndex({ direction: 1, createdAt: -1 }),
    c.admins.createIndex({ email: 1 }, { unique: true }),
  ]);
}

export { ObjectId } from 'mongodb';
