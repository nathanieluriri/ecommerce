import type { Discount, Product, Store, Variant } from './types';

export interface CartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface PricedLine {
  product: Product;
  variant?: Variant;
  variantTitle?: string;
  unitPrice: number;
  compareAt?: number;
  quantity: number;
  available: number;
  lineTotal: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  discountError?: string;
  freeShipping: boolean;
  shipping: number;
  total: number;
  problems: string[];
}

export const variantTitle = (product: Product, variant: Variant) =>
  product.options.length ? variant.options.join(' / ') : '';

export const lineKey = (productId: string, variantId?: string) => (variantId ? `${productId}.${variantId}` : productId);

export function parseLineKey(key: string): { productId: string; variantId?: string } | null {
  const [productId, variantId] = key.split('.');
  if (!productId || !/^[a-f0-9]{24}$/.test(productId)) return null;
  if (variantId !== undefined && !/^[a-z0-9]{1,16}$/i.test(variantId)) return null;
  return { productId, variantId };
}

export function parseCartCookie(raw: string | undefined): Map<string, number> {
  const cart = new Map<string, number>();
  for (const part of (raw ?? '').split(',')) {
    const [key, q] = part.split(':');
    const qty = Math.floor(Number(q));
    if (key && parseLineKey(key) && qty > 0) cart.set(key, Math.min(qty, 99));
  }
  return cart;
}

export function serializeCart(cart: Map<string, number>): string {
  return [...cart].filter(([, q]) => q > 0).map(([k, q]) => `${k}:${q}`).join(',');
}

export function stockOf(product: Product, variantId?: string): number {
  if (!product.variants.length) return product.stock;
  return product.variants.find((v) => v.id === variantId)?.stock ?? 0;
}

export function discountProblem(d: Discount, subtotal: number, now = new Date()): string | null {
  if (!d.active) return 'This code is not active';
  if (d.startsAt && now < d.startsAt) return 'This code is not active yet';
  if (d.endsAt && now > d.endsAt) return 'This code has expired';
  if (d.usageLimit != null && d.usageCount >= d.usageLimit) return 'This code has been fully redeemed';
  if (d.minSubtotal && subtotal < d.minSubtotal) return 'Your cart does not meet the minimum for this code';
  return null;
}

export function priceCart(store: Store, products: Product[], requests: CartRequest[], discount?: Discount | null): PricedCart {
  const byId = new Map(products.map((p) => [p._id.toHexString(), p]));
  const lines: PricedLine[] = [];
  const problems: string[] = [];

  for (const r of requests) {
    const product = byId.get(r.productId);
    if (!product || product.status !== 'active') {
      problems.push('An item in your cart is no longer available');
      continue;
    }
    let variant: Variant | undefined;
    if (product.variants.length) {
      variant = product.variants.find((v) => v.id === r.variantId);
      if (!variant) {
        problems.push(`Choose an option for ${product.title}`);
        continue;
      }
    }
    const available = variant ? variant.stock : product.stock;
    const quantity = Math.min(r.quantity, Math.max(available, 0));
    if (quantity < r.quantity) problems.push(available > 0 ? `Only ${available} of ${product.title} left` : `${product.title} is sold out`);
    if (quantity <= 0) continue;
    const unitPrice = variant ? variant.price : product.price;
    lines.push({
      product,
      variant,
      variantTitle: variant ? variantTitle(product, variant) : undefined,
      unitPrice,
      compareAt: variant ? variant.compareAt : product.compareAt,
      quantity,
      available,
      lineTotal: unitPrice * quantity,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  let discountAmount = 0;
  let freeShipping = false;
  let discountError: string | undefined;
  let discountCode: string | undefined;

  if (discount) {
    const problem = discountProblem(discount, subtotal);
    if (problem) discountError = problem;
    else {
      discountCode = discount.code;
      if (discount.type === 'percent') discountAmount = Math.round((subtotal * Math.min(discount.value, 100)) / 100);
      else if (discount.type === 'fixed') discountAmount = Math.min(discount.value, subtotal);
      else freeShipping = true;
    }
  }

  const qualifiesFree = store.freeShippingOver != null && subtotal - discountAmount >= store.freeShippingOver;
  const shipping = !lines.length || freeShipping || qualifiesFree ? 0 : store.shippingFlat;
  return {
    lines,
    subtotal,
    discount: discountAmount,
    discountCode,
    discountError,
    freeShipping: freeShipping || qualifiesFree,
    shipping,
    total: subtotal - discountAmount + shipping,
    problems,
  };
}
