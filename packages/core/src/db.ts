import { MongoClient, type Db, type Collection } from 'mongodb';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Admin, Customer, EmailRecord, Order, Product, Store } from './types';

// Workers tie a socket to the request that opened it, so a client can't be shared across requests.
const scope = new AsyncLocalStorage<{ client?: Promise<MongoClient> }>();

export async function scoped<T>(fn: () => Promise<T>): Promise<T> {
  if (scope.getStore()) return fn();
  const store: { client?: Promise<MongoClient> } = {};
  try {
    return await scope.run(store, fn);
  } finally {
    store.client?.then((c) => c.close()).catch(() => undefined);
  }
}

function getClient(uri: string): Promise<MongoClient> {
  const store = scope.getStore();
  if (!store) throw new Error('db() must run inside scoped()');
  store.client ??= new MongoClient(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 8000 }).connect();
  return store.client;
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
