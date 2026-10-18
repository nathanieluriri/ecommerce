import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order, Store } from '@shop/core';
import { render } from '../src/templates';

const store = { _id: new ObjectId(), name: 'Atelier', themeSettings: { accent: '#111' }, emailCopy: { order_shipped: { subject: 'Shipped #{number} for {name}' } } } as unknown as Store;
const order = {
  number: 1042,
  currency: 'usd',
  status: 'fulfilled',
  items: [{ title: 'Mug <b>', variantTitle: 'Blue', price: 1500, quantity: 2 }],
  subtotal: 3000,
  discount: 300,
  discountCode: 'SAVE10',
  shipping: 0,
  total: 2700,
  customer: { name: 'Ada Lovelace' },
  fulfillment: { carrier: 'UPS', trackingNumber: '1Z999', trackingUrl: 'https://ups.example/1Z999', at: new Date() },
} as unknown as Order;

describe('email templates', () => {
  it('uses per-store copy with placeholders', () => {
    expect(render('order_shipped', store, { order }).subject).toBe('Shipped #1042 for Ada');
  });

  it('falls back to default copy and shows tracking and discount', () => {
    const r = render('order_shipped', { ...store, emailCopy: {} } as Store, { order });
    expect(r.subject).toBe('Order #1042 is on its way');
    expect(r.html).toContain('1Z999');
    expect(r.html).toContain('SAVE10');
    expect(r.html).toContain('Mug &lt;b&gt;');
  });

  it('adds an unsubscribe link to broadcasts', () => {
    const r = render('broadcast', store, { subject: 'News', text: 'Hello\n\nWorld', unsubscribeUrl: 'https://s.example/unsubscribe?t=x' });
    expect(r.html).toContain('Unsubscribe');
    expect(r.text).toContain('https://s.example/unsubscribe?t=x');
  });

  it('refuses order templates without an order', () => {
    expect(() => render('order_confirmation', store, {})).toThrow();
  });
});
