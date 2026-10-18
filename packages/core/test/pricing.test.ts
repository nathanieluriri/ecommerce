import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { discountProblem, parseCartCookie, priceCart, serializeCart, type Discount, type Product, type Store } from '../src';

const store = { shippingFlat: 800, freeShippingOver: 10000, currency: 'usd' } as Store;

function product(over: Partial<Product> = {}): Product {
  return {
    _id: new ObjectId(),
    storeId: new ObjectId(),
    slug: 'p',
    title: 'Mug',
    description: '',
    images: [],
    price: 2000,
    stock: 10,
    options: [],
    variants: [],
    categoryIds: [],
    status: 'active',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function discount(over: Partial<Discount> = {}): Discount {
  return { _id: new ObjectId(), storeId: new ObjectId(), code: 'SAVE', type: 'percent', value: 10, usageCount: 0, active: true, createdAt: new Date(), ...over };
}

describe('priceCart', () => {
  it('charges flat shipping under the free threshold', () => {
    const p = product();
    const r = priceCart(store, [p], [{ productId: p._id.toHexString(), quantity: 2 }]);
    expect(r).toMatchObject({ subtotal: 4000, shipping: 800, total: 4800, problems: [] });
  });

  it('gives free shipping at the threshold', () => {
    const p = product({ price: 5000 });
    expect(priceCart(store, [p], [{ productId: p._id.toHexString(), quantity: 2 }]).shipping).toBe(0);
  });

  it('prices variants and requires one to be chosen', () => {
    const p = product({ options: [{ name: 'Size', values: ['S', 'L'] }], variants: [{ id: 'a', options: ['S'], price: 1500, stock: 3 }, { id: 'b', options: ['L'], price: 2500, stock: 0 }] });
    const id = p._id.toHexString();
    const r = priceCart(store, [p], [{ productId: id, variantId: 'a', quantity: 1 }, { productId: id, variantId: 'b', quantity: 1 }, { productId: id, quantity: 1 }]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ unitPrice: 1500, variantTitle: 'S' });
    expect(r.problems).toEqual(['Mug is sold out', 'Choose an option for Mug']);
  });

  it('clamps quantity to stock', () => {
    const p = product({ stock: 2 });
    const r = priceCart(store, [p], [{ productId: p._id.toHexString(), quantity: 5 }]);
    expect(r.lines[0]?.quantity).toBe(2);
    expect(r.problems[0]).toBe('Only 2 of Mug left');
  });

  it('applies percent, fixed and free-shipping discounts', () => {
    const p = product();
    const req = [{ productId: p._id.toHexString(), quantity: 2 }];
    expect(priceCart(store, [p], req, discount()).total).toBe(4000 - 400 + 800);
    expect(priceCart(store, [p], req, discount({ type: 'fixed', value: 9999 })).discount).toBe(4000);
    expect(priceCart(store, [p], req, discount({ type: 'free_shipping', value: 0 })).shipping).toBe(0);
  });

  it('reports why a discount does not apply', () => {
    const p = product();
    const r = priceCart(store, [p], [{ productId: p._id.toHexString(), quantity: 1 }], discount({ minSubtotal: 5000 }));
    expect(r.discount).toBe(0);
    expect(r.discountError).toMatch(/minimum/);
  });
});

describe('discountProblem', () => {
  it('checks dates and usage', () => {
    const now = new Date('2026-06-01');
    expect(discountProblem(discount({ endsAt: new Date('2026-01-01') }), 0, now)).toMatch(/expired/);
    expect(discountProblem(discount({ startsAt: new Date('2027-01-01') }), 0, now)).toMatch(/not active yet/);
    expect(discountProblem(discount({ usageLimit: 1, usageCount: 1 }), 0, now)).toMatch(/redeemed/);
    expect(discountProblem(discount(), 0, now)).toBeNull();
  });
});

describe('cart cookie', () => {
  it('round-trips and drops junk', () => {
    const id = new ObjectId().toHexString();
    const cart = parseCartCookie(`${id}:2,${id}.ab1:120,bad:1,${id}.x$:1`);
    expect([...cart]).toEqual([[id, 2], [`${id}.ab1`, 99]]);
    expect(serializeCart(cart)).toBe(`${id}:2,${id}.ab1:99`);
  });
});
