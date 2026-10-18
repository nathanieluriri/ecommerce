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

- MongoDB connects over TCP with SCRAM auth. Workers bind a socket to the request that opened it, so each request opens its own client (`scoped()` in `packages/core/src/db.ts`) and closes it afterwards. That adds a connection handshake per request; the free plan's 10ms CPU limit can be tight on a cold isolate, and the Workers Paid plan ($5/month) removes that concern.
- Cloudflare's `send_email` binding only delivers to verified addresses unless the account has Email Service sending enabled. The email worker falls back to Resend (free tier) when `RESEND_API_KEY` is set.

# Phase 2: the full feature set

Everything below stays on free or already-paid infrastructure: R2 (10 GB free) for images, cron triggers instead of Queues, no new paid services.

## Catalogue
- **Variants**: products get `options` (e.g. Size, Colour) and `variants` (each with its own price, compare-at price, stock and SKU). A product without variants keeps product-level price and stock.
- **Categories** (`categories` collection), products carry `categoryIds`. Storefront category pages and nav.
- **Images in R2**: admin uploads to a `MEDIA` bucket; both the admin and the storefront serve `/media/*` from it with immutable caching.
- **Reviews** (`reviews` collection): customers who bought a product can review it; admin moderates; approved reviews update `ratingAvg` / `ratingCount` on the product.

## Pricing and checkout
- One pure pricing function in `@shop/core` (`priceCart`) used by both the storefront cart and the orders worker, so the price shown is the price charged.
- **Discount codes** (`discounts` collection): percentage, fixed amount or free shipping; minimum subtotal, start/end dates, usage limit. Applied in the cart, re-validated at checkout, charged through a one-off Stripe coupon, usage counted when the order is paid.
- Oversell protection: stock is re-checked at checkout and at payment; an order that oversells is flagged on its timeline.

## Orders
- Fulfilment with carrier, tracking number and tracking URL, included in the shipping email.
- Partial refunds tracked as `refundedAmount`; status becomes `refunded` only when fully refunded.
- Abandoned checkout recovery: Stripe's recovery URL is emailed when a checkout with a known email expires (per-store switch).
- Low-stock alert email to the store's notification address when a paid order drops stock under the threshold.
- Printable packing slip and CSV export in the admin.

## Customers
- Passwordless accounts on the storefront: magic link by email, signed session cookie, order history, order tracking page.
- Newsletter sign-up with one-click unsubscribe; admin broadcasts to subscribers, sent in batches by the email worker's cron (stays within Workers subrequest limits without Queues).

## Email
- New templates: shipped (with tracking), abandoned checkout, low stock, magic link, broadcast.
- Per-store copy overrides (subject and intro line) for customer-facing templates, edited in the admin.

## Storefront
- Category pages, search, variant picker (works without JavaScript), reviews with stars, discount code box, account pages, newsletter form.
- SEO: per-page meta and Open Graph tags, Product JSON-LD, `sitemap.xml`, `robots.txt`.
- Themes gain a shared `ProductGrid` and `Page` wrapper so new pages work in every design.

## Admin
- Categories, discounts, reviews moderation, subscribers and broadcasts, email copy, store notification settings.
- Product editor with options/variants, category picker and R2 image uploads.
- Order fulfilment dialog, packing slip, CSV export, refunds shown against the total.
- Analytics: average order value, top products, refunds.

## Quality
- Vitest unit tests for pricing, discounts, auth tokens and cart parsing.
- End-to-end run against a local MongoDB with signed Stripe test events, as in phase 1.

## Steps (one commit each)
1. Core: types, schemas, pricing, tests
2. Email worker: new templates, copy overrides, broadcasts
3. Orders worker: variants, discounts, fulfilment, partial refunds, recovery, low stock
4. Storefront: theme refactor, categories, search, variants, discounts, reviews, accounts, newsletter, SEO, media
5. Admin API
6. Admin UI
7. Seed, docs, end-to-end verification
