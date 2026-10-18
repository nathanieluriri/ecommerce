import { raw } from 'hono/html';
import { formatMoney, lineKey, type Order, type PricedCart, type Product, type Review, type Store } from '@shop/core';
import type { PageMeta } from './types';

export const money = (store: Store, n: number) => formatMoney(n, store.currency);

export function priceRange(product: Product): { min: number; max: number; compareAt?: number } {
  if (!product.variants.length) return { min: product.price, max: product.price, compareAt: product.compareAt };
  const prices = product.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export const inStock = (p: Product) => (p.variants.length ? p.variants.some((v) => v.stock > 0) : p.stock > 0);

export function Price({ store, product }: { store: Store; product: Product }) {
  const r = priceRange(product);
  return (
    <span class="price-wrap">
      <span class="price">{r.min !== r.max ? `From ${money(store, r.min)}` : money(store, r.min)}</span>
      {r.compareAt && r.compareAt > r.min ? <span class="compare">{money(store, r.compareAt)}</span> : null}
    </span>
  );
}

export function Stars({ value, count }: { value?: number; count?: number }) {
  if (!count) return null;
  const full = Math.round(value ?? 0);
  return (
    <span class="stars" title={`${(value ?? 0).toFixed(1)} out of 5`}>
      <span aria-hidden="true">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      <span class="muted"> ({count})</span>
    </span>
  );
}

export function BuyBox({ store, product, label = 'Add to cart' }: { store: Store; product: Product; label?: string }) {
  if (!inStock(product)) return <button class="btn" disabled>Sold out</button>;
  const id = product._id.toHexString();
  return (
    <form method="post" action="/cart/add" class="buy">
      <input type="hidden" name="productId" value={id} />
      {product.variants.length ? (
        <label class="field">
          <span>{product.options.map((o) => o.name).join(' / ')}</span>
          <select name="variantId" required>
            {product.variants.map((v) => (
              <option value={v.id} disabled={v.stock <= 0}>
                {v.options.join(' / ')} · {money(store, v.price)}
                {v.stock <= 0 ? ' (sold out)' : v.stock <= 3 ? ` (only ${v.stock} left)` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : product.stock <= 3 ? (
        <p class="muted">Only {product.stock} left</p>
      ) : null}
      <div class="buy-row">
        <input type="number" name="quantity" value="1" min="1" max="99" aria-label="Quantity" />
        <button class="btn" type="submit">{label}</button>
      </div>
    </form>
  );
}

export function Gallery({ product, image }: { product: Product; image: number }) {
  if (!product.images.length) return <div class="ph gallery-main" />;
  const current = product.images[image] ?? product.images[0]!;
  return (
    <div class="gallery">
      <img class="gallery-main" src={current} alt={product.title} />
      {product.images.length > 1 ? (
        <div class="thumbs">
          {product.images.map((src, i) => (
            <a href={`?img=${i}`} aria-label={`Image ${i + 1}`} class={i === image ? 'on' : ''}>
              <img src={src} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Reviews({ product, reviews, canReview, signedIn }: { product: Product; reviews: Review[]; canReview: boolean; signedIn: boolean }) {
  return (
    <section class="reviews" id="reviews">
      <h2>Reviews</h2>
      {product.ratingCount ? (
        <p>
          <Stars value={product.ratingAvg} count={product.ratingCount} /> {product.ratingAvg?.toFixed(1)} out of 5
        </p>
      ) : (
        <p class="muted">No reviews yet.</p>
      )}
      {reviews.map((r) => (
        <article class="review">
          <div class="stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          {r.title ? <strong>{r.title}</strong> : null}
          <p>{r.body}</p>
          <p class="muted">
            {r.name}
            {r.verified ? ' · Verified purchase' : ''} · {r.createdAt.toLocaleDateString('en', { month: 'short', year: 'numeric' })}
          </p>
        </article>
      ))}
      {canReview ? (
        <form method="post" action={`/products/${product.slug}/reviews`} class="stack review-form">
          <h3>Write a review</h3>
          <label class="field">
            <span>Rating</span>
            <select name="rating" required>
              {[5, 4, 3, 2, 1].map((n) => <option value={String(n)}>{'★'.repeat(n)} ({n})</option>)}
            </select>
          </label>
          <label class="field"><span>Your name</span><input name="name" required maxlength={80} /></label>
          <label class="field"><span>Title</span><input name="title" maxlength={120} /></label>
          <label class="field"><span>Review</span><textarea name="body" rows={4} required maxlength={4000} /></label>
          <button class="btn" type="submit">Submit review</button>
        </form>
      ) : !signedIn ? (
        <p class="muted"><a href="/account">Sign in</a> to review products you have bought.</p>
      ) : null}
    </section>
  );
}

export function CartView({ store, cart, discountCode, email }: { store: Store; cart: PricedCart; discountCode?: string; email?: string }) {
  if (!cart.lines.length)
    return (
      <div class="empty">
        {cart.problems.map((p) => <p class="error">{p}</p>)}
        <p>Your cart is empty.</p>
        <a class="btn" href="/products">Keep shopping</a>
      </div>
    );
  return (
    <div class="cart">
      {cart.problems.map((p) => <p class="error">{p}</p>)}
      <form method="post" action="/cart/update">
        <table class="cart-table">
          <tbody>
            {cart.lines.map((l) => {
              const key = lineKey(l.product._id.toHexString(), l.variant?.id);
              return (
                <tr>
                  <td class="cart-img">{l.product.images[0] ? <img src={l.product.images[0]} alt="" /> : null}</td>
                  <td>
                    <a href={`/products/${l.product.slug}`}>{l.product.title}</a>
                    {l.variantTitle ? <div class="muted">{l.variantTitle}</div> : null}
                    <div class="muted">{money(store, l.unitPrice)}</div>
                  </td>
                  <td><input type="number" min="0" max="99" name={`q_${key}`} value={String(l.quantity)} aria-label="Quantity" /></td>
                  <td class="num">{money(store, l.lineTotal)}</td>
                  <td><button class="link" type="submit" name="remove" value={key} aria-label={`Remove ${l.product.title}`}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button class="btn btn-ghost" type="submit">Update cart</button>
      </form>
      <div class="cart-bottom">
        <form method="post" action="/cart/discount" class="discount-form">
          {cart.discountCode ? (
            <p>
              Code <strong>{cart.discountCode}</strong> applied.{' '}
              <button class="link" type="submit" name="code" value="">Remove</button>
            </p>
          ) : (
            <>
              <input name="code" placeholder="Discount code" value={discountCode ?? ''} aria-label="Discount code" />
              <button class="btn btn-ghost" type="submit">Apply</button>
            </>
          )}
          {cart.discountError ? <p class="error">{cart.discountError}</p> : null}
        </form>
        <dl class="totals">
          <dt>Subtotal</dt><dd>{money(store, cart.subtotal)}</dd>
          {cart.discount ? (<><dt>Discount</dt><dd>-{money(store, cart.discount)}</dd></>) : null}
          <dt>Shipping</dt><dd>{cart.shipping ? money(store, cart.shipping) : 'Free'}</dd>
          <dt class="total">Total</dt><dd class="total">{money(store, cart.total)}</dd>
        </dl>
      </div>
      {store.freeShippingOver && !cart.freeShipping ? (
        <p class="muted right">Add {money(store, store.freeShippingOver - (cart.subtotal - cart.discount))} more for free shipping.</p>
      ) : null}
      <form method="post" action="/checkout" class="checkout-form">
        <input type="email" name="email" placeholder="Email for your receipt" value={email ?? ''} />
        <button class="btn" type="submit">Checkout securely</button>
      </form>
    </div>
  );
}

const STATUS_TEXT: Record<Order['status'], string> = {
  pending: 'Awaiting payment',
  paid: 'Preparing your order',
  fulfilled: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function OrderSummary({ store, order, thanks = false, reviewable = false }: { store: Store; order: Order; thanks?: boolean; reviewable?: boolean }) {
  const pending = order.status === 'pending';
  const f = order.fulfillment;
  return (
    <div class="order-done">
      {thanks ? <h1>{pending ? 'Confirming your payment...' : 'Thank you!'}</h1> : <h1>Order #{order.number}</h1>}
      <p class="muted">
        {thanks ? `Order #${order.number}. ` : ''}
        Status: <strong>{STATUS_TEXT[order.status]}</strong>
        {thanks && !pending ? '. A confirmation email is on its way.' : ''}
      </p>
      {thanks && pending ? <meta http-equiv="refresh" content="3" /> : null}
      {f?.trackingNumber ? (
        <p>
          {f.carrier ?? 'Tracking'}: {f.trackingUrl ? <a href={f.trackingUrl}>{f.trackingNumber}</a> : f.trackingNumber}
        </p>
      ) : null}
      <ul class="order-lines">
        {order.items.map((i) => (
          <li>
            <span>
              {i.title}
              {i.variantTitle ? ` (${i.variantTitle})` : ''} × {i.quantity}
              {reviewable ? <a class="small" href={`/review/${i.productId.toHexString()}`}> Review</a> : null}
            </span>
            <span>{money(store, i.price * i.quantity)}</span>
          </li>
        ))}
        {order.discount ? <li><span>Discount {order.discountCode}</span><span>-{money(store, order.discount)}</span></li> : null}
        <li><span>Shipping</span><span>{order.shipping ? money(store, order.shipping) : 'Free'}</span></li>
        <li class="total"><span>Total</span><span>{money(store, order.total)}</span></li>
        {order.refundedAmount ? <li><span>Refunded</span><span>-{money(store, order.refundedAmount)}</span></li> : null}
      </ul>
    </div>
  );
}

export function ListingControls({ sort, path, q, page, pages }: { sort: string; path: string; q?: string; page: number; pages: number }) {
  const href = (p: number) => `${path}?${new URLSearchParams({ ...(q ? { q } : {}), sort, page: String(p) })}`;
  return (
    <div class="listing-bar">
      <form method="get" action={path} class="sort">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        <label>
          Sort{' '}
          <select name="sort" onchange="this.form.submit()">
            {[['new', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['rating', 'Top rated']].map(([v, l]) => (
              <option value={v} selected={sort === v}>{l}</option>
            ))}
          </select>
        </label>
        <noscript><button class="btn btn-ghost" type="submit">Go</button></noscript>
      </form>
      {pages > 1 ? (
        <nav class="pager" aria-label="Pages">
          {page > 1 ? <a href={href(page - 1)}>Previous</a> : null}
          <span class="muted">Page {page} of {pages}</span>
          {page < pages ? <a href={href(page + 1)}>Next</a> : null}
        </nav>
      ) : null}
    </div>
  );
}

export function Newsletter() {
  return (
    <form method="post" action="/subscribe" class="newsletter">
      <label for="nl-email">Get news and offers by email</label>
      <div class="buy-row">
        <input id="nl-email" type="email" name="email" placeholder="you@example.com" required />
        <button class="btn" type="submit">Subscribe</button>
      </div>
    </form>
  );
}

export function SearchForm({ q = '' }: { q?: string }) {
  return (
    <form method="get" action="/search" class="search" role="search">
      <input type="search" name="q" value={q} placeholder="Search" aria-label="Search products" />
    </form>
  );
}

export function Notice({ text }: { text?: string }) {
  return text ? <div class="notice" role="status">{text}</div> : null;
}

export function Head({ store, title, css, meta, url }: { store: Store; title?: string; css: string; meta?: PageMeta; url: string }) {
  const fullTitle = title ? `${title} | ${store.name}` : store.name;
  const description = meta?.description ?? store.themeSettings.tagline ?? store.name;
  const u = new URL(url);
  const canonical = `${u.origin}${u.pathname}`;
  const image = meta?.image ? (meta.image.startsWith('/') ? `${u.origin}${meta.image}` : meta.image) : undefined;
  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {meta?.noindex ? <meta name="robots" content="noindex" /> : null}
      <meta property="og:site_name" content={store.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      {image ? <meta property="og:image" content={image} /> : null}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      {meta?.jsonLd ? <script type="application/ld+json">{raw(JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c'))}</script> : null}
      <style>{raw(`:root{--accent:${/^#[0-9a-f]{3,8}$/i.test(store.themeSettings.accent) ? store.themeSettings.accent : '#2e2a6b'}}${BASE_CSS}${css}`)}</style>
    </head>
  );
}

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}body{margin:0}img{max-width:100%;display:block}
input,select,textarea,button{font:inherit;color:inherit}textarea{width:100%}
.stack{display:flex;flex-direction:column;gap:.75rem}.field{display:flex;flex-direction:column;gap:.3rem}.field select,.field input{max-width:28rem}
.buy{display:flex;flex-direction:column;gap:.75rem;margin:1rem 0}.buy-row{display:flex;gap:.5rem}.buy-row input[type=number]{width:4.5rem}
.gallery{display:flex;flex-direction:column;gap:.5rem}.gallery-main{width:100%;aspect-ratio:1;object-fit:cover}.thumbs{display:flex;gap:.4rem;flex-wrap:wrap}.thumbs img{width:64px;height:64px;object-fit:cover;opacity:.6}.thumbs a.on img,.thumbs img:hover{opacity:1}
.stars{color:#e3a008;letter-spacing:1px}.reviews{margin:3rem 0}.review{padding:1rem 0;border-bottom:1px solid rgba(0,0,0,.08)}.review p{margin:.3rem 0}.review-form{max-width:32rem;margin-top:1.5rem}
.cart-table{width:100%;border-collapse:collapse}.cart-table td{padding:.75rem .5rem;vertical-align:middle}
.cart-img img{width:64px;height:64px;object-fit:cover}.cart-table input{width:4rem}.num{text-align:right}.right{text-align:right}
.link{background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;font-size:1.1em}.small{font-size:.85em}
.cart-bottom{display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;margin-top:1.5rem;align-items:flex-start}
.discount-form{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}.discount-form .error{width:100%;margin:0}
.totals{display:grid;grid-template-columns:1fr auto;gap:.4rem 1rem;min-width:16rem;margin:0}.totals dd{margin:0;text-align:right}.total{font-weight:700}
.checkout-form{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:1rem}.checkout-form input{min-width:16rem}
.order-lines li{display:flex;justify-content:space-between;gap:1rem;padding:.5rem 0}.order-lines{list-style:none;padding:0;max-width:32rem}
.error{color:#b42318}.empty{text-align:center;padding:4rem 0}
.notice{background:var(--accent);color:#fff;padding:.75rem 1rem;text-align:center}
.listing-bar{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin:0 0 1.5rem}.pager{display:flex;gap:1rem;align-items:center}
.newsletter{display:flex;flex-direction:column;gap:.5rem;max-width:26rem}.newsletter input{flex:1;min-width:0}
.search input{min-width:10rem;max-width:14rem}
.orders-list{list-style:none;padding:0}.orders-list li{display:flex;justify-content:space-between;gap:1rem;padding:.75rem 0;border-bottom:1px solid rgba(0,0,0,.08)}
.cats{display:flex;gap:1rem;flex-wrap:wrap}
@media(max-width:640px){.search{display:none}.cart-table td{padding:.5rem .25rem}}`;
