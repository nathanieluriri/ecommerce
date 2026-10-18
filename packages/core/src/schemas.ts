import { z } from 'zod';

export const THEMES = ['classic', 'minimal', 'bold'] as const;
export const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'delivered', 'cancelled', 'refunded'] as const;

const slug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes');

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
  shippingFlat: z.number().int().min(0).default(0),
  freeShippingOver: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
});

export const productInput = z.object({
  slug,
  title: z.string().min(1).max(200),
  description: z.string().max(20000).default(''),
  images: z.array(z.string().url()).default([]),
  price: z.number().int().min(0),
  compareAt: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
});

export const cartInput = z.object({
  storeId: z.string().length(24),
  items: z
    .array(z.object({ productId: z.string().length(24), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  email: z.string().email().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type StoreInput = z.infer<typeof storeInput>;
export type ProductInput = z.infer<typeof productInput>;
export type CartInput = z.infer<typeof cartInput>;
