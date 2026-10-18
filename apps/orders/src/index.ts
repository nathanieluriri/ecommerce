import { WorkerEntrypoint } from 'cloudflare:workers';
import { cartInput, type Binding, type CartInput, type EmailService, type Order, type OrderStatus, type OrdersService } from '@shop/core';
import { db, nextOrderNumber, ObjectId, type Collections, type DbEnv } from '@shop/core/db';
import { cryptoProvider, stripeClient, type Stripe } from '@shop/core/stripe';

export interface Env extends DbEnv {
  EMAIL: Binding<EmailService>;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PENDING_TTL_HOURS?: string;
}

const NOTIFY_ON: OrderStatus[] = ['fulfilled', 'delivered', 'cancelled'];

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function loadOrder(c: Collections, orderId: string): Promise<Order> {
  const order = await c.orders.findOne({ _id: new ObjectId(orderId) });
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

async function markPaid(env: Env, ctx: ExecutionContext, session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  const c = await db(env);
  const now = new Date();
  const details = session.customer_details;
  const shipping = session.collected_information?.shipping_details ?? null;
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  // Conditional on pending so a retried webhook never double-counts stock.
  const order = await c.orders.findOneAndUpdate(
    { _id: new ObjectId(orderId), status: 'pending' },
    {
      $set: {
        status: 'paid',
        stripePaymentIntentId: paymentIntent,
        'customer.email': details?.email ?? undefined,
        'customer.name': details?.name ?? shipping?.name ?? undefined,
        'customer.phone': details?.phone ?? undefined,
        shippingAddress: shipping?.address
          ? {
              line1: shipping.address.line1 ?? undefined,
              line2: shipping.address.line2 ?? undefined,
              city: shipping.address.city ?? undefined,
              state: shipping.address.state ?? undefined,
              postalCode: shipping.address.postal_code ?? undefined,
              country: shipping.address.country ?? undefined,
            }
          : undefined,
        updatedAt: now,
      },
      $push: { timeline: { at: now, status: 'paid', note: 'Payment received via Stripe' } },
    },
    { returnDocument: 'after', ignoreUndefined: true },
  );
  if (!order) return;

  await c.products.bulkWrite(
    order.items.map((i) => ({ updateOne: { filter: { _id: i.productId }, update: { $inc: { stock: -i.quantity } } } })),
  );
  if (order.customer.email) {
    await c.customers.updateOne(
      { storeId: order.storeId, email: order.customer.email.toLowerCase() },
      {
        $inc: { orders: 1, totalSpent: order.total },
        $set: { name: order.customer.name, lastOrderAt: now },
        $setOnInsert: { _id: new ObjectId(), createdAt: now },
      },
      { upsert: true, ignoreUndefined: true },
    );
    ctx.waitUntil(
      env.EMAIL.send({ storeId: order.storeId.toHexString(), to: order.customer.email, template: 'order_confirmation', data: { order } }).then(() => undefined),
    );
  }
}

async function setStatusFromStripe(env: Env, filter: Record<string, unknown>, status: OrderStatus, note: string) {
  const c = await db(env);
  const now = new Date();
  await c.orders.updateOne(filter, { $set: { status, updatedAt: now }, $push: { timeline: { at: now, status, note } } });
}

export default class extends WorkerEntrypoint<Env> implements OrdersService {
  async createCheckout(raw: CartInput) {
    const input = cartInput.parse(raw);
    const c = await db(this.env);
    const store = await c.stores.findOne({ _id: new ObjectId(input.storeId), active: true });
    if (!store) throw new HttpError(404, 'Store not found');

    const ids = input.items.map((i) => new ObjectId(i.productId));
    const products = await c.products.find({ _id: { $in: ids }, storeId: store._id, status: 'active' }).toArray();
    const byId = new Map(products.map((p) => [p._id.toHexString(), p]));

    const items = input.items.map((line) => {
      const p = byId.get(line.productId);
      if (!p) throw new HttpError(400, 'A product in your cart is no longer available');
      if (p.stock < line.quantity) throw new HttpError(409, `Only ${p.stock} of ${p.title} left`);
      return { productId: p._id, title: p.title, image: p.images[0], price: p.price, quantity: line.quantity };
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = store.freeShippingOver != null && subtotal >= store.freeShippingOver ? 0 : store.shippingFlat;
    const now = new Date();
    const order: Order = {
      _id: new ObjectId(),
      storeId: store._id,
      number: await nextOrderNumber(c, store._id.toHexString()),
      status: 'pending',
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      currency: store.currency,
      customer: { email: input.email },
      timeline: [{ at: now, status: 'pending', note: 'Checkout started' }],
      createdAt: now,
      updatedAt: now,
    };
    await c.orders.insertOne(order);

    const stripe = stripeClient(this.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.email,
      client_reference_id: order._id.toHexString(),
      metadata: { orderId: order._id.toHexString(), storeId: store._id.toHexString() },
      payment_intent_data: { metadata: { orderId: order._id.toHexString() } },
      line_items: items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: store.currency,
          unit_amount: i.price,
          product_data: { name: i.title, images: i.image ? [i.image] : undefined },
        },
      })),
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'NG', 'DE', 'FR', 'NL', 'AU'] },
      shipping_options: [{ shipping_rate_data: { display_name: shipping ? 'Standard' : 'Free shipping', type: 'fixed_amount', fixed_amount: { amount: shipping, currency: store.currency } } }],
      phone_number_collection: { enabled: true },
      success_url: input.successUrl.replace('{ORDER_ID}', order._id.toHexString()),
      cancel_url: input.cancelUrl,
    });
    await c.orders.updateOne({ _id: order._id }, { $set: { stripeSessionId: session.id } });
    return { orderId: order._id.toHexString(), url: session.url! };
  }

  async updateStatus({ orderId, status, note, by, notify = true }: Parameters<OrdersService['updateStatus']>[0]) {
    const c = await db(this.env);
    const now = new Date();
    const order = await c.orders.findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: { status, updatedAt: now }, $push: { timeline: { at: now, status, note: note || `Marked ${status}`, by } } },
      { returnDocument: 'after' },
    );
    if (!order) throw new HttpError(404, 'Order not found');
    if (notify && order.customer.email && NOTIFY_ON.includes(status)) {
      this.ctx.waitUntil(
        this.env.EMAIL.send({ storeId: order.storeId.toHexString(), to: order.customer.email, template: 'order_status', data: { order, note } }).then(() => undefined),
      );
    }
    return { ok: true as const };
  }

  async addNote({ orderId, note, by }: { orderId: string; note: string; by?: string }) {
    const c = await db(this.env);
    const r = await c.orders.updateOne({ _id: new ObjectId(orderId) }, { $push: { timeline: { at: new Date(), note, by } } });
    if (!r.matchedCount) throw new HttpError(404, 'Order not found');
    return { ok: true as const };
  }

  async refund({ orderId, amount, by }: { orderId: string; amount?: number; by?: string }) {
    const c = await db(this.env);
    const order = await loadOrder(c, orderId);
    if (!order.stripePaymentIntentId) throw new HttpError(400, 'Order has no payment to refund');
    const stripe = stripeClient(this.env.STRIPE_SECRET_KEY);
    const refund = await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, amount });
    const full = !amount || amount >= order.total;
    const now = new Date();
    await c.orders.updateOne(
      { _id: order._id },
      {
        $set: { ...(full ? { status: 'refunded' as const } : {}), updatedAt: now },
        $push: { timeline: { at: now, status: full ? 'refunded' : undefined, note: `Refunded ${amount ?? order.total} (${refund.id})`, by } },
      },
      { ignoreUndefined: true },
    );
    if (order.customer.email) {
      this.ctx.waitUntil(
        this.env.EMAIL.send({ storeId: order.storeId.toHexString(), to: order.customer.email, template: 'order_refunded', data: { order } }).then(() => undefined),
      );
    }
    return { ok: true as const, refundId: refund.id };
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/stripe/webhook') {
      const stripe = stripeClient(this.env.STRIPE_SECRET_KEY);
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(
          await request.text(),
          request.headers.get('stripe-signature') ?? '',
          this.env.STRIPE_WEBHOOK_SECRET,
          undefined,
          cryptoProvider,
        );
      } catch {
        return new Response('Bad signature', { status: 400 });
      }
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          if (event.data.object.payment_status !== 'unpaid') await markPaid(this.env, this.ctx, event.data.object);
          break;
        case 'checkout.session.expired':
          await setStatusFromStripe(this.env, { stripeSessionId: event.data.object.id, status: 'pending' }, 'cancelled', 'Checkout expired');
          break;
        case 'checkout.session.async_payment_failed':
          await setStatusFromStripe(this.env, { stripeSessionId: event.data.object.id, status: 'pending' }, 'cancelled', 'Payment failed');
          break;
        case 'charge.refunded': {
          const charge = event.data.object;
          if (charge.refunded && typeof charge.payment_intent === 'string') {
            await setStatusFromStripe(this.env, { stripePaymentIntentId: charge.payment_intent, status: { $ne: 'refunded' } }, 'refunded', 'Refunded in Stripe');
          }
          break;
        }
      }
      return Response.json({ received: true });
    }
    return new Response('shop-orders', { status: url.pathname === '/' ? 200 : 404 });
  }

  async scheduled() {
    const c = await db(this.env);
    const cutoff = new Date(Date.now() - Number(this.env.PENDING_TTL_HOURS ?? 24) * 3600_000);
    const now = new Date();
    await c.orders.updateMany(
      { status: 'pending', createdAt: { $lt: cutoff } },
      { $set: { status: 'cancelled', updatedAt: now }, $push: { timeline: { at: now, status: 'cancelled', note: 'Abandoned checkout' } } },
    );
  }
}
