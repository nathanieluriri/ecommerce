# ecommerce

Multi-storefront e-commerce on Cloudflare Workers, MongoDB Atlas and Stripe. See [PLAN.md](PLAN.md) for the architecture and data model.

| Worker | Path | Job |
| --- | --- | --- |
| `shop-storefront` | `apps/storefront` | Server-rendered shop. Picks the store by hostname, renders it with that store's theme |
| `shop-orders` | `apps/orders` | Stripe Checkout, Stripe webhooks, order status, refunds, hourly cleanup of abandoned checkouts |
| `shop-email` | `apps/email` | Sends templated mail (order confirmation, status, refund, custom) and receives inbound mail from Email Routing |
| `shop-admin` | `apps/admin` | React dashboard (Plaspool admin design) plus its `/api` |

Workers call each other through service bindings, so nothing between them is public except the Stripe webhook.

## Storefronts and themes

A storefront is a document in `stores`. Create as many as you like in **Admin > Stores**, give each its domains, and point those domains at the `shop-storefront` worker. Each store picks a theme in **Admin > Storefront design**; the change is live within a minute.

Themes live in `apps/storefront/src/themes/`. There are three: `classic` (Plaspool-like), `minimal` and `bold`. To add a design:

1. Copy one of the theme files and change its markup and CSS. A theme implements `Layout`, `Home`, `ProductPage`, `Cart`, `OrderComplete` and `NotFound` (see `themes/types.ts`).
2. Register it in `themes/index.ts`.
3. Add its id to `THEMES` in `packages/core/src/schemas.ts`, `ThemeId` in `packages/core/src/types.ts` and the list in `apps/admin/src/routes/Design.tsx`.

Append `?store=<handle>` to any storefront URL to view a specific store, and `&theme=<id>` to preview a design without publishing it (`?theme=reset` clears the preview).

## Local development

Requirements: Node 22+, a MongoDB you can reach (Atlas free tier or a local `mongod`), and Stripe test keys.

```sh
npm install
```

Create `.dev.vars` in each of `apps/storefront`, `apps/orders`, `apps/email` and `apps/admin`:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
AUTH_SECRET=any-long-random-string
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Seed three demo stores (one per theme):

```sh
MONGODB_URI=... npm run seed
```

Run the workers (each in its own terminal; `wrangler dev` connects their service bindings):

```sh
cd apps/orders && npx wrangler dev -c wrangler.jsonc -c ../email/wrangler.jsonc --port 8789 --inspector-port 9331
cd apps/storefront && npx wrangler dev --port 8787 --inspector-port 9332
cd apps/admin && npm run build && npx wrangler dev --port 8788 --var STOREFRONT_URL:http://localhost:8787
```

- Storefront: http://localhost:8787/?store=classic-demo
- Admin: http://localhost:8788 (the first sign-in creates the owner account). For hot reload on the UI, run `npm run dev` in `apps/admin` as well and open http://localhost:5173.
- Stripe webhooks: `stripe listen --forward-to localhost:8789/stripe/webhook`

## Deploy

1. **MongoDB Atlas**: create a cluster and a database user. Under Network Access allow `0.0.0.0/0` (Workers have no fixed egress IPs).
2. **Secrets** (run inside each app folder):
   ```sh
   cd apps/email      && npx wrangler secret put MONGODB_URI
   cd apps/orders     && npx wrangler secret put MONGODB_URI && npx wrangler secret put STRIPE_SECRET_KEY && npx wrangler secret put STRIPE_WEBHOOK_SECRET
   cd apps/storefront && npx wrangler secret put MONGODB_URI
   cd apps/admin      && npx wrangler secret put MONGODB_URI && npx wrangler secret put AUTH_SECRET
   ```
3. **Deploy** in dependency order (email, orders, storefront, admin): `npm run deploy` from the root.
4. **Admin**: set `STOREFRONT_URL` in `apps/admin/wrangler.jsonc` to the storefront's URL (used for previews), redeploy, open the admin and create the owner account.
5. **Stripe**: add a webhook endpoint at `https://shop-orders.<your-subdomain>.workers.dev/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
6. **Domains**: for each storefront, add the domain to the store in the admin and attach it to `shop-storefront` (Workers > shop-storefront > Settings > Domains, or `routes` in its `wrangler.jsonc`).
7. **Email**:
   - Outbound: the `send_email` binding works once the sending domain is on Cloudflare with Email Routing enabled. Without Cloudflare Email Service sending it only reaches verified addresses; set `RESEND_API_KEY` as a secret on `shop-email` to send to anyone through Resend instead.
   - Inbound: in Email Routing, add a rule (or catch-all) that sends to the `shop-email` worker. Mail is stored and shown in **Admin > Emails**; set `FORWARD_TO` to also forward it to a mailbox.

## Costs

Everything fits Cloudflare's free tier at low traffic: four workers, service bindings, cron triggers, static assets and Email Routing are free. MongoDB Atlas M0 is free. Stripe charges per transaction only. Because each request opens a MongoDB connection, the Workers Paid plan ($5/month, 30s CPU) is the safer choice once real traffic arrives.
