# Plan

A multi-storefront e-commerce platform that runs entirely on Cloudflare Workers, with MongoDB Atlas as the database and Stripe for payments.

## Goals

1. One codebase serves any number of storefronts. Each storefront is a `stores` document with its own domain, name, currency and **theme**. Five stores with five different designs is five documents, not five deployments.
2. Themes are swappable from the admin at runtime. Adding a new design is adding one folder under `apps/storefront/src/themes/` and registering it.
3. An admin dashboard that follows the Plaspool admin design (dark topbar, light icon rail, grey page, white cards, indigo accent, same tokens).
4. Orders are owned by a dedicated **orders worker**. Emails are owned by a dedicated **email worker** (Cloudflare Email Workers for inbound, `send_email` binding or Resend for outbound).
5. Stripe Checkout for payments, Stripe webhooks for confirmation, refunds from the admin.
6. Cheap to run: Workers free tier where possible, no Next.js (OpenNext blew the 10ms CPU budget on Plaspool), no queues, no paid add-ons. Workers talk to each other through **service bindings** (free, in-process RPC).

## Architecture

```
                 ┌───────────────────────┐
 shoppers ──────▶│  storefront (Hono SSR)│──┐  service binding (RPC)
 shop-a.com      │  host -> store -> theme│  │
 shop-b.com      └───────────────────────┘  ▼
                                      ┌──────────────┐   ┌──────────────┐
 Stripe ── webhook ──────────────────▶│ orders worker │──▶│ email worker │◀── inbound mail
                                      └──────────────┘   └──────────────┘    (Email Routing)
                 ┌───────────────────────┐  ▲                   ▲
 staff ─────────▶│ admin (React SPA +    │──┘───────────────────┘
                 │ Hono /api, one worker)│
                 └───────────────────────┘
                          │ all workers
                          ▼
                    MongoDB Atlas (mongodb driver over nodejs_compat TCP)
```

## Repository layout (npm workspaces)

| Path | What it is |
| --- | --- |
| `packages/core` | Shared code: Mongo client, collection types, zod schemas, money helpers, auth (PBKDF2 + HMAC tokens), Stripe client factory, RPC interface types |
| `apps/orders` | `WorkerEntrypoint` RPC: `createCheckout`, `getOrder`, `updateStatus`, `refund`. `fetch` handles `POST /stripe/webhook`. `scheduled` expires abandoned pending orders |
| `apps/email` | `email()` handler stores and forwards inbound mail. RPC `send()` renders a template, sends it, logs it to `emails` |
| `apps/storefront` | Hono JSX server rendering. Resolves the store by hostname (or `?store=` in dev), loads its theme, renders home, product, cart, checkout redirect, order confirmation |
| `apps/admin` | Vite + React SPA built into Workers static assets, plus a Hono `/api` in the same worker: auth, stores, products, orders, customers, emails, settings |

## Data model (MongoDB)

- `stores` `{ slug, name, domains[], currency, theme, themeSettings{ accent, logoUrl, tagline }, emailFrom, active }`
- `products` `{ storeId, slug, title, description, images[], price (minor units), compareAt, stock, status: draft|active|archived, tags[] }`
- `orders` `{ storeId, number, status, paymentStatus, items[], subtotal, shipping, total, currency, customer{email,name}, shippingAddress, stripeSessionId, stripePaymentIntentId, timeline[] }`
- `customers` `{ storeId, email, name, orders, totalSpent }`
- `emails` `{ storeId?, direction: in|out, from, to, subject, text, html, status, template, error }`
- `admins` `{ email, name, passwordHash, role }`
- `counters` `{ _id: storeId, seq }` for human order numbers

Money is always integer minor units (cents), matching Stripe.

## Order lifecycle

1. Storefront posts cart -> orders `createCheckout` -> validates prices and stock server side, inserts `pending` order, creates a Stripe Checkout Session with `metadata.orderId`, returns the URL.
2. Stripe calls `POST /stripe/webhook` on the orders worker. Signature verified with `constructEventAsync` (Web Crypto). `checkout.session.completed` -> `paid`, stock decremented, customer upserted, confirmation email sent through the email binding. `checkout.session.expired` -> `cancelled`. `charge.refunded` -> `refunded`.
3. Admin moves orders through `paid -> fulfilled -> delivered`, or refunds. Each status change appends to `timeline` and can notify the customer.
4. Hourly cron cancels `pending` orders older than 24h.

## Steps (one commit each)

1. Plan, root workspace, tooling, README
2. `packages/core`
3. `apps/email`
4. `apps/orders`
5. `apps/storefront` with three themes (classic, minimal, bold)
6. `apps/admin` API
7. `apps/admin` UI in the Plaspool admin design
8. Seed script, deploy docs, verification (typecheck, builds, `wrangler deploy --dry-run`)

## Known constraints

- MongoDB connects over TCP with SCRAM auth; the first request in a fresh isolate pays for that handshake. The client is cached at module scope so warm requests reuse it. On the free plan's 10ms CPU limit a cold connection can exceed the budget; the Workers Paid plan ($5/month) removes that concern.
- Cloudflare's `send_email` binding only delivers to verified addresses unless the account has Email Service sending enabled. The email worker falls back to Resend (free tier) when `RESEND_API_KEY` is set.
