import { z } from 'zod';

export const THEMES = ['classic', 'minimal', 'bold', 'maison', 'market'] as const;
export const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'delivered', 'cancelled', 'refunded'] as const;
export const COPY_TEMPLATES = ['order_confirmation', 'order_shipped', 'order_status', 'order_refunded', 'abandoned_checkout'] as const;

const slug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes');
const money = z.number().int().min(0);
const image = z.string().min(1).max(2000).refine((s) => s.startsWith('/media/') || /^https?:\/\//.test(s), 'must be a URL or /media/ path');
const objectId = z.string().regex(/^[a-f0-9]{24}$/);

const copy = z.object({ subject: z.string().max(200).optional(), intro: z.string().max(2000).optional() });

export const storeInput = z.object({
  slug,
  name: z.string().min(1).max(120),
  domains: z.array(z.string().min(1)).default([]),
  currency: z.string().length(3).transform((s) => s.toLowerCase()),
  theme: z.enum(THEMES),
  themeSettings: z
    .object({
      accent: z.string().default('#2e2a6b'),
      logoUrl: z.string().optional(),
      tagline: z.string().optional(),
      announcement: z.string().optional(),
    })
    .default({ accent: '#2e2a6b' }),
  emailFrom: z.string().email(),
  supportEmail: z.string().email().optional(),
  notifyEmail: z.string().email().optional(),
  lowStockThreshold: z.number().int().min(0).max(10000).optional(),
  abandonedCartEmails: z.boolean().optional(),
  emailCopy: z.partialRecord(z.enum(COPY_TEMPLATES), copy).optional(),
  content: z
    .object({
      heroTitle: z.string().max(120).optional(),
      heroText: z.string().max(400).optional(),
      features: z.array(z.object({ title: z.string().min(1).max(80), text: z.string().max(300) })).max(8).optional(),
      promises: z.array(z.object({ title: z.string().min(1).max(80), text: z.string().max(300) })).max(8).optional(),
      faq: z.array(z.object({ q: z.string().min(1).max(200), a: z.string().min(1).max(2000) })).max(20).optional(),
    })
    .optional(),
  shippingFlat: money.default(0),
  freeShippingOver: money.optional(),
  shippingCountries: z.array(z.string().length(2).transform((s) => s.toUpperCase())).optional(),
  active: z.boolean().default(true),
});

export const variantInput = z.object({
  id: z.string().regex(/^[a-z0-9]{1,16}$/i),
  options: z.array(z.string().min(1).max(60)),
  price: money,
  compareAt: money.optional(),
  stock: z.number().int().min(0),
  sku: z.string().max(80).optional(),
});

export const productFields = z.object({
  slug,
  title: z.string().min(1).max(200),
  description: z.string().max(20000).default(''),
  images: z.array(image).max(20).default([]),
  price: money,
  compareAt: money.optional(),
  stock: z.number().int().min(0).default(0),
  sku: z.string().max(80).optional(),
  options: z.array(z.object({ name: z.string().min(1).max(40), values: z.array(z.string().min(1).max(60)).min(1) })).max(3).default([]),
  variants: z.array(variantInput).max(300).default([]),
  categoryIds: z.array(objectId).default([]),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
});

export function variantProblem(p: { options: { values: string[] }[]; variants: { id: string; options: string[] }[] }): string | null {
  if (p.variants.some((v) => v.options.length !== p.options.length)) return 'Every variant needs one value per option';
  if (p.variants.some((v) => v.options.some((value, i) => !p.options[i]!.values.includes(value)))) return 'A variant uses a value its option does not list';
  if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length) return 'Variant ids must be unique';
  if (new Set(p.variants.map((v) => v.options.join('\u0000'))).size !== p.variants.length) return 'Two variants have the same options';
  return null;
}

export const productInput = productFields.superRefine((p, ctx) => {
  const problem = variantProblem(p);
  if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['variants'] });
});

export const categoryInput = z.object({
  slug,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  image: image.optional(),
  sort: z.number().int().default(0),
});

export const discountInput = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((s) => s.toUpperCase()),
  type: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.number().int().min(0),
  minSubtotal: money.optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  usageLimit: z.number().int().min(1).optional(),
  active: z.boolean().default(true),
});

export const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(4000),
  name: z.string().min(1).max(80),
});

export const cartInput = z.object({
  storeId: objectId,
  items: z
    .array(z.object({ productId: objectId, variantId: z.string().max(16).optional(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  email: z.string().email().optional(),
  discountCode: z.string().max(40).optional(),
  origin: z.string().url(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const fulfillmentInput = z.object({
  carrier: z.string().max(60).optional(),
  trackingNumber: z.string().max(120).optional(),
  trackingUrl: z.string().url().optional(),
});

export type StoreInput = z.infer<typeof storeInput>;
export type ProductInput = z.infer<typeof productInput>;
export type CartInput = z.infer<typeof cartInput>;
export type FulfillmentInput = z.infer<typeof fulfillmentInput>;
