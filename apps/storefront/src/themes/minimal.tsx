import type { Theme } from './types';
import { AddToCart, CartTable, Head, money, OrderSummary } from './shared';

const css = `body{font-family:"Iowan Old Style",Georgia,serif;color:#111;background:#fff;line-height:1.5}
a{color:inherit;text-decoration:none}.wrap{max-width:960px;margin:0 auto;padding:0 24px}
header{display:flex;justify-content:space-between;align-items:baseline;padding:40px 0 56px}
.logo{font-size:1.1rem;letter-spacing:.3em;text-transform:uppercase}.logo img{height:28px}
nav a{font-family:ui-sans-serif,system-ui;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase;border-bottom:1px solid #111}
.intro{font-size:1.6rem;max-width:36rem;margin:0 0 72px;font-style:italic}
.list{border-top:1px solid #111}.row{display:grid;grid-template-columns:120px 1fr auto;gap:24px;align-items:center;padding:20px 0;border-bottom:1px solid #ddd}
.row img,.row .ph{width:120px;height:150px;object-fit:cover;background:#f2f2f2}.row h3{font-weight:400;font-size:1.25rem;margin:0}
.price{font-family:ui-sans-serif,system-ui;font-size:.9rem}.compare{text-decoration:line-through;color:#999;margin-left:.5rem}
.btn{background:#111;color:#fff;border:1px solid #111;padding:.75rem 1.6rem;font:inherit;font-family:ui-sans-serif,system-ui;font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;display:inline-block}
.btn-ghost{background:#fff;color:#111}.btn[disabled]{opacity:.4}
input{font:inherit;padding:.6rem;border:0;border-bottom:1px solid #111;background:transparent}
.pdp{display:grid;grid-template-columns:3fr 2fr;gap:56px}.pdp h1{font-weight:400;font-size:2.2rem;margin:0 0 1rem}
.pdp .desc{white-space:pre-line;color:#444}.muted{color:#777;font-size:.9rem}
.cart-table tr{border-bottom:1px solid #ddd}h1{font-weight:400}
footer{margin-top:96px;padding:32px 0;border-top:1px solid #111;font-size:.8rem;font-family:ui-sans-serif,system-ui;letter-spacing:.1em;text-transform:uppercase}
@media(max-width:700px){.pdp{grid-template-columns:1fr}.row{grid-template-columns:80px 1fr}.row img,.row .ph{width:80px;height:100px}.row .price{grid-column:2}}`;

export const minimal: Theme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Editorial and monochrome: serif type, a single-column index and lots of white space.',
  Layout: ({ store, title, cartCount, children }) => (
    <html lang="en">
      <Head store={store} title={title} css={css} />
      <body>
        <div class="wrap">
          <header>
            <a class="logo" href="/">{store.themeSettings.logoUrl ? <img src={store.themeSettings.logoUrl} alt={store.name} /> : store.name}</a>
            <nav><a href="/cart">Bag {cartCount}</a></nav>
          </header>
          <main>{children}</main>
          <footer>{store.name}{store.supportEmail ? ` / ${store.supportEmail}` : ''}</footer>
        </div>
      </body>
    </html>
  ),
  Home: ({ store, products }) => (
    <>
      <p class="intro">{store.themeSettings.tagline ?? 'A small collection of considered things.'}</p>
      <div class="list">
        {products.map((p) => (
          <a class="row" href={`/products/${p.slug}`}>
            {p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <div class="ph" />}
            <h3>{p.title}</h3>
            <span class="price">{money(store, p.price)}</span>
          </a>
        ))}
      </div>
    </>
  ),
  ProductPage: ({ store, product }) => (
    <div class="pdp">
      <div>{product.images.map((src) => <img src={src} alt={product.title} style="margin-bottom:16px" />)}</div>
      <div>
        <h1>{product.title}</h1>
        <p class="price">{money(store, product.price)}{product.compareAt ? <span class="compare">{money(store, product.compareAt)}</span> : null}</p>
        <p class="desc">{product.description}</p>
        <AddToCart product={product} label="Add to bag" />
      </div>
    </div>
  ),
  Cart: (p) => <><h1>Bag</h1><CartTable {...p} /></>,
  OrderComplete: (p) => <OrderSummary {...p} />,
  NotFound: () => <><h1>Nothing here.</h1><a class="btn" href="/">Return</a></>,
};
