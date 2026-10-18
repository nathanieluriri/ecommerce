import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Binding, EmailService, OrdersService } from '@shop/core';
import { ObjectId, type DbEnv } from '@shop/core/db';
import type { TokenPayload } from '@shop/core/auth';

export interface Env extends DbEnv {
  ASSETS: Fetcher;
  ORDERS: Binding<OrdersService>;
  EMAIL: Binding<EmailService>;
  MEDIA?: R2Bucket;
  AUTH_SECRET: string;
  STOREFRONT_URL?: string;
}

export type AppEnv = { Bindings: Env; Variables: { user: TokenPayload } };

export const router = () => new Hono<AppEnv>();

export const fail = (status: 400 | 401 | 403 | 404 | 409 | 413 | 415, message: string): never => {
  throw new HTTPException(status, { message });
};

export const oid = (id: string | undefined) => {
  if (!id || !/^[a-f0-9]{24}$/.test(id)) fail(400, 'Bad id');
  return new ObjectId(id);
};

export const paging = (q: Record<string, string | undefined>) => {
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 25));
  const skip = Math.max(0, (Number(q.page) || 1) - 1) * limit;
  return { limit, skip };
};

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// .partial() still fills .default() values, which would overwrite fields the caller didn't send.
export function patch<T extends z.ZodObject>(schema: T, body: Record<string, unknown>) {
  const parsed = schema.partial().parse(body) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => k in body)) as Partial<z.infer<T>>;
}

export function csv(rows: (string | number | undefined | null)[][]): string {
  const cell = (v: string | number | undefined | null) => {
    const s = v == null ? '' : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}
