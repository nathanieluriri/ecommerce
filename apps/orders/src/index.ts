import { WorkerEntrypoint } from 'cloudflare:workers';
import {
  cartInput,
  priceCart,
  type Binding,
  type CartInput,
  type EmailService,
  type Order,
  type OrdersService,
  type OrderStatus,
  type Store,
} from '@shop/core';
import { db, nextOrderNumber, ObjectId, scoped, type Collections, type DbEnv } from '@shop/core/db';
import { cryptoProvider, stripeClient, type Stripe } from '@shop/core/stripe';

export interface Env extends DbEnv {
  EMAIL: Binding<EmailService>;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PENDING_TTL_HOURS?: string;
}

const DEFAULT_COUNTRIES = ['US', 'CA', 'GB', 'IE', 'NG', 'GH', 'KE', 'ZA', 'DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'SE', 'AU', 'NZ'];
const NOTIFY_ON: OrderStatus[] = ['fulfilled', 'delivered', 'cancelled'];

const absolute = (url: string | undefined, origin: string) => (!url ? undefined : url.startsWith('/') ? `${origin}${url}` : url);

async function loadOrder(c: Collections, orderId: string): Promise<Order> {
  const order = await c.orders.findOne({ _id: new ObjectId(orderId) });
  if (!order) throw new Error('Order not found');
  return order;
}

function sendLater(env: Env, ctx: ExecutionContext, input: Parameters<EmailService['send']>[0]) {
  ctx.waitUntil(
    env.EMAIL.send(input).then(
      () => undefined,
      (err: unknown) => console.error('email failed', input.template, err),
    ),
  );
}

async function decrementStock(c: Collections, store: Store, order: Order) {
  const threshold = store.lowStockThreshold ?? 5;
  const low: { title: string; stock: number }[] = [];
  let oversold = false;
  for (const item of order.items) {
    const filter = item.variantId ? { _id: item.productId, 'variants.id': item.variantId } : { _id: item.productId };
    const update = item.variantId ? { $inc: { 'variants.$.stock': -item.quantity } } : { $inc: { stock: -item.quantity } };
    const p = await c.products.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    if (!p) continue;
    const left = item.variantId ? (p.variants.find((v) => v.id === item.variantId)?.stock ?? 0) : p.stock;
    const before = left + item.quantity;
    if (left < 0) oversold = true;
    if (before > threshold && left <= threshold) low.push({ title: item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title, stock: left });
  }
  return { low, oversold };
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
  const store = await c.stores.findOne({ _id: order.storeId });
  if (!store) return;

  const { low, oversold } = await decrementStock(c, store, order);
  if (oversold) {
    await c.orders.updateOne(
      { _id: order._id },
      { $addToSet: { flags: 'oversold' }, $push: { timeline: { at: now, note: 'Stock went below zero with this order. Check inventory before fulfilling.' } } },
    );
  }
  if (order.discountCode) await c.discounts.updateOne({ storeId: order.storeId, code: order.discountCode }, { $inc: { usageCount: 1 } });

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
    sendLater(env, ctx, { storeId: store._id.toHexString(), to: order.customer.email, template: 'order_confirmation', orderId: order._id.toHexString() });
  }
  const alertTo = store.notifyEmail ?? store.supportEmail;
  if (low.length && alertTo) sendLater(env, ctx, { storeId: store._id.toHexString(), to: alertTo, template: 'low_stock', items: low });
}

async function expireCheckout(env: Env, ctx: ExecutionContext, session: Stripe.Checkout.Session, note: string) {
  const c = await db(env);
  const now = new Date();
  const order = await c.orders.findOneAndUpdate(
    { stripeSessionId: session.id, status: 'pending' },
    { $set: { status: 'cancelled', updatedAt: now }, $push: { timeline: { at: now, status: 'cancelled', note } } },
    { returnDocument: 'after' },
  );
  const recovery = session.after_expiration?.recovery?.url;
  const email = session.customer_details?.email ?? session.customer_email ?? order?.customer.email;
  if (!order || !recovery || !email || order.recoveryEmailSent) return;
  const store = await c.stores.findOne({ _id: order.storeId });
  if (!store?.abandonedCartEmails) return;
  await c.orders.updateOne({ _id: order._id }, { $set: { recoveryEmailSent: true, 'customer.email': email } });
  sendLater(env, ctx, { storeId: store._id.toHexString(), to: email, template: 'abandoned_checkout', orderId: order._id.toHexString(), link: recovery });
}

export default class extends WorkerEntrypoint<Env> implements OrdersService {
  async createCheckout(raw: CartInput) {
    return scoped(async () => {
      const input = cartInput.parse(raw);
      const c = await db(this.env);
      const store = await c.stores.findOne({ _id: new ObjectId(input.storeId), active: true });
      if (!store) throw new Error('Store not found');

      const ids = [...new Set(input.items.map((i) => i.productId))].map((id) => new ObjectId(id));
      const [products, discount] = await Promise.all([
        c.products.find({ _id: { $in: ids }, storeId: store._id }).toArray(),
        input.discountCode ? c.discounts.findOne({ storeId: store._id, code: input.discountCode.toUpperCase() }) : null,
      ]);
      if (input.discountCode && !discount) throw new Error('That discount code does not exist');
      const priced = priceCart(store, products, input.items, discount);
      if (priced.problems.length) throw new Error(priced.problems[0]);
      if (priced.discountError) throw new Error(priced.discountError);
      if (!priced.lines.length) throw new Error('Your cart is empty');

      const now = new Date();
      const order: Order = {
        _id: new ObjectId(),
        storeId: store._id,
        number: await nextOrderNumber(c, store._id.toHexString()),
        status: 'pending',
        items: priced.lines.map((l) => ({
          productId: l.product._id,
          variantId: l.variant?.id,
          title: l.product.title,
          variantTitle: l.variantTitle || undefined,
          sku: l.variant?.sku ?? l.product.sku,
          image: l.product.images[0],
          price: l.unitPrice,
          quantity: l.quantity,
        })),
        subtotal: priced.subtotal,
        discount: priced.discount,
        discountCode: priced.discountCode,
        shipping: priced.shipping,
        total: priced.total,
        currency: store.currency,
        customer: { email: input.email },
        timeline: [{ at: now, status: 'pending', note: 'Checkout started' }],
        createdAt: now,
        updatedAt: now,
      };
      await c.orders.insertOne(order, { ignoreUndefined: true });

      const stripe = stripeClient(this.env.STRIPE_SECRET_KEY);
      const orderId = order._id.toHexString();
      let session: Stripe.Checkout.Session;
      try {
        const coupon = priced.discount
          ? await stripe.coupons.create({ amount_off: priced.discount, currency: store.currency, duration: 'once', max_redemptions: 1, name: priced.discountCode })
          : null;
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: input.email,
          client_reference_id: orderId,
          metadata: { orderId, storeId: store._id.toHexString() },
          payment_intent_data: { metadata: { orderId } },
          line_items: order.items.map((i) => ({
            quantity: i.quantity,
            price_data: {
              currency: store.currency,
              unit_amount: i.price,
              product_data: {
                name: i.variantTitle ? `${i.title} (${i.variantTitle})` : i.title,
                images: i.image ? [absolute(i.image, input.origin)!] : undefined,
              },
            },
          })),
          discounts: coupon ? [{ coupon: coupon.id }] : undefined,
          shipping_address_collection: {
            allowed_countries: (store.shippingCountries?.length ? store.shippingCountries : DEFAULT_COUNTRIES) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
          },
          shipping_options: [
            {
              shipping_rate_data: {
                display_name: priced.shipping ? 'Standard shipping' : 'Free shipping',
                type: 'fixed_amount',
                fixed_amount: { amount: priced.shipping, currency: store.currency },
              },
            },
          ],
          phone_number_collection: { enabled: true },
          after_expiration: store.abandonedCartEmails ? { recovery: { enabled: true } } : undefined,
          success_url: input.successUrl.replace('{ORDER_ID}', orderId),
          cancel_url: input.cancelUrl,
        });
      } catch (err) {
        await c.orders.deleteOne({ _id: order._id });
        throw err;
      }
      await c.orders.updateOne({ _id: order._id }, { $set: { stripeSessionId: session.id } });
      return { orderId, url: session.url! };
    });
  }

  async updateStatus({ orderId, status, note, by, notify = true, fulfillment }: Parameters<OrdersService['updateStatus']>[0]) {
    return scoped(async () => {
      const c = await db(this.env);
      const now = new Date();
      const tracking = fulfillment?.trackingNumber ? ` (${fulfillment.carrier ?? 'tracking'} ${fulfillment.trackingNumber})` : '';
      const order = await c.orders.findOneAndUpdate(
        { _id: new ObjectId(orderId) },
        {
          $set: { status, updatedAt: now, ...(fulfillment ? { fulfillment: { ...fulfillment, at: now } } : {}) },
          $push: { timeline: { at: now, status, note: (note || `Marked ${status}`) + tracking, by } },
        },
        { returnDocument: 'after', ignoreUndefined: true },
      );
      if (!order) throw new Error('Order not found');
      if (notify && order.customer.email && NOTIFY_ON.includes(status)) {
        sendLater(this.env, this.ctx, {
          storeId: order.storeId.toHexString(),
          to: order.customer.email,
          template: status === 'fulfilled' ? 'order_shipped' : 'order_status',
          orderId,
          note,
        });
      }
      return { ok: true as const };
    });
  }

  async addNote({ orderId, note, by }: { orderId: string; note: string; by?: string }) {
    return scoped(async () => {
      const c = await db(this.env);
      const r = await c.orders.updateOne({ _id: new ObjectId(orderId) }, { $push: { timeline: { at: new Date(), note, by } } }, { ignoreUndefined: true });
      if (!r.matchedCount) throw new Error('Order not found');
      return { ok: true as const };
    });
  }

  async refund({ orderId, amount, by }: { orderId: string; amount?: number; by?: string }) {
    return scoped(async () => {
      const c = await db(this.env);
      const order = await loadOrder(c, orderId);
      if (!order.stripePaymentIntentId) throw new Error('Order has no payment to refund');
      const remaining = order.total - (order.refundedAmount ?? 0);
      if (remaining <= 0) throw new Error('Order is already fully refunded');
      const value = Math.min(amount ?? remaining, remaining);
      const stripe = stripeClient(this.env.STRIPE_SECRET_KEY);
      const refund = await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, amount: value, metadata: { orderId } });
      const full = value >= remaining;
      const now = new Date();
      await c.orders.updateOne(
        { _id: order._id },
        {
          $set: { ...(full ? { status: 'refunded' as const } : {}), updatedAt: now },
          $inc: { refundedAmount: value },
          $push: { timeline: { at: now, status: full ? 'refunded' : undefined, note: `Refunded ${(value / 100).toFixed(2)} ${order.currency.toUpperCase()} (${refund.id})`, by } },
        },
        { ignoreUndefined: true },
      );
      if (order.customer.email) sendLater(this.env, this.ctx, { storeId: order.storeId.toHexString(), to: order.customer.email, template: 'order_refunded', orderId });
      return { ok: true as const, refundId: refund.id };
    });
  }

  async fetch(request: Request) {
    return scoped(async () => {
      const url = new URL(request.url);
      if (request.method !== 'POST' || url.pathname !== '/stripe/webhook') {
        return new Response('shop-orders', { status: url.pathname === '/' ? 200 : 404 });
      }
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
          await expireCheckout(this.env, this.ctx, event.data.object, 'Checkout expired');
          break;
        case 'checkout.session.async_payment_failed':
          await expireCheckout(this.env, this.ctx, event.data.object, 'Payment failed');
          break;
        case 'charge.refunded': {
          const charge = event.data.object;
          if (typeof charge.payment_intent !== 'string') break;
          const c = await db(this.env);
          const now = new Date();
          await c.orders.updateOne(
            { stripePaymentIntentId: charge.payment_intent },
            { $set: { refundedAmount: charge.amount_refunded, updatedAt: now, ...(charge.refunded ? { status: 'refunded' as const } : {}) } },
          );
          break;
        }
      }
      return Response.json({ received: true });
    });
  }

  async scheduled() {
    return scoped(async () => {
      const c = await db(this.env);
      const cutoff = new Date(Date.now() - Number(this.env.PENDING_TTL_HOURS ?? 25) * 3600_000);
      const now = new Date();
      await c.orders.updateMany(
        { status: 'pending', createdAt: { $lt: cutoff } },
        { $set: { status: 'cancelled', updatedAt: now }, $push: { timeline: { at: now, status: 'cancelled', note: 'Abandoned checkout' } } },
      );
    });
  }
}
