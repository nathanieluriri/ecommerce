import { formatMoney, type Order, type Product, type Store } from '@shop/core';
import type { CartView } from './types';

export const money = (store: Store, n: number) => formatMoney(n, store.currency);

export function AddToCart({ product, label = 'Add to cart', className = 'btn' }: { product: Product; label?: string; className?: string }) {
  if (product.stock <= 0) return <button class={className} disabled>Sold out</button>;
  return (
    <form method="post" action="/cart/add" class="add-form">
      <input type="hidden" name="productId" value={product._id.toHexString()} />
      <input type="number" name="quantity" value="1" min="1" max={String(Math.min(product.stock, 99))} aria-label="Quantity" />
      <button class={className} type="submit">{label}</button>
    </form>
  );
}

export function CartTable({ store, cart, error }: { store: Store; cart: CartView; error?: string }) {
  if (!cart.lines.length)
    return (
      <div class="empty">
        <p>Your cart is empty.</p>
        <a class="btn" href="/">Keep shopping</a>
      </div>
    );
  return (
    <div class="cart">
      {error ? <p class="error">{error}</p> : null}
      <form method="post" action="/cart/update">
        <table class="cart-table">
          <tbody>
            {cart.lines.map(({ product, quantity }) => (
              <tr>
                <td class="cart-img">{product.images[0] ? <img src={product.images[0]} alt="" /> : null}</td>
                <td><a href={`/products/${product.slug}`}>{product.title}</a><div class="muted">{money(store, product.price)}</div></td>
                <td><input type="number" min="0" max="99" name={`q_${product._id.toHexString()}`} value={String(quantity)} aria-label="Quantity" /></td>
                <td class="num">{money(store, product.price * quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button class="btn btn-ghost" type="submit">Update cart</button>
      </form>
      <dl class="totals">
        <dt>Subtotal</dt><dd>{money(store, cart.subtotal)}</dd>
        <dt>Shipping</dt><dd>{cart.shipping ? money(store, cart.shipping) : 'Free'}</dd>
        <dt class="total">Total</dt><dd class="total">{money(store, cart.total)}</dd>
      </dl>
      <form method="post" action="/checkout" class="checkout-form">
        <input type="email" name="email" placeholder="Email for receipt (optional)" />
        <button class="btn" type="submit">Checkout securely</button>
      </form>
    </div>
  );
}

export function OrderSummary({ store, order }: { store: Store; order: Order }) {
  const done = order.status !== 'pending';
  return (
    <div class="order-done">
      <h1>{done ? 'Thank you!' : 'Confirming your payment...'}</h1>
      <p class="muted">
        Order #{order.number}. {done ? 'A confirmation email is on its way.' : 'This page refreshes in a moment.'}
      </p>
      {done ? null : <meta http-equiv="refresh" content="3" />}
      <ul class="order-lines">
        {order.items.map((i) => (
          <li><span>{i.title} &times; {i.quantity}</span><span>{money(store, i.price * i.quantity)}</span></li>
        ))}
        <li class="total"><span>Total</span><span>{money(store, order.total)}</span></li>
      </ul>
      <a class="btn" href="/">Continue shopping</a>
    </div>
  );
}

export function Head({ store, title, css }: { store: Store; title?: string; css: string }) {
  return (
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title ? `${title} | ${store.name}` : store.name}</title>
      <meta name="description" content={store.themeSettings.tagline ?? store.name} />
      <style dangerouslySetInnerHTML={{ __html: `:root{--accent:${store.themeSettings.accent}}${BASE_CSS}${css}` }} />
    </head>
  );
}

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}body{margin:0}img{max-width:100%;display:block}
.add-form{display:flex;gap:.5rem}.add-form input{width:4.5rem}
.cart-table{width:100%;border-collapse:collapse}.cart-table td{padding:.75rem .5rem;vertical-align:middle}
.cart-img img{width:64px;height:64px;object-fit:cover}.cart-table input{width:4rem}.num{text-align:right}
.totals{display:grid;grid-template-columns:1fr auto;gap:.4rem 1rem;max-width:22rem;margin:1.5rem 0 1rem auto}.totals dd{margin:0;text-align:right}.total{font-weight:700}
.checkout-form{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}.checkout-form input{min-width:16rem}
.order-lines li{display:flex;justify-content:space-between;padding:.5rem 0}.order-lines{list-style:none;padding:0;max-width:28rem}
.error{color:#b42318}.empty{text-align:center;padding:4rem 0}`;
