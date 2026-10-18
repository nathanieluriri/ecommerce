import { raw } from 'hono/html';
import type { Theme } from './types';
import { AddToCart, CartTable, Head, money, OrderSummary } from './shared';

const css = `body{font-family:Inter,system-ui,sans-serif;color:#1f1d3a;background:#f7f7fb}
a{color:inherit}.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.announce{background:var(--accent);color:#fff;text-align:center;font-size:.85rem;padding:.5rem}
header{background:#fff;border-bottom:1px solid #e6e5f0}header .wrap{display:flex;align-items:center;justify-content:space-between;height:68px}
.logo{font-weight:800;font-size:1.25rem;text-decoration:none;color:var(--accent)}.logo img{height:36px}
.cart-link{text-decoration:none;font-weight:600;background:#eeedf5;color:var(--accent);padding:.5rem .9rem;border-radius:999px}
.hero{background:linear-gradient(135deg,var(--accent),#0c0a2a);color:#fff;border-radius:20px;padding:56px 40px;margin:28px 0}
.hero h1{font-size:clamp(2rem,4vw,3rem);margin:0 0 .5rem}.hero p{opacity:.85;margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px;margin-bottom:56px}
.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,60,.06);text-decoration:none;transition:transform .15s}
.card:hover{transform:translateY(-3px)}.card .ph{aspect-ratio:1;background:#eeedf5;object-fit:cover;width:100%}.card .info{padding:14px 16px}
.card h3{font-size:1rem;margin:0 0 .3rem}.price{font-weight:700;color:var(--accent)}.compare{text-decoration:line-through;color:#8a88a6;margin-left:.4rem;font-weight:400}
.btn{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:.7rem 1.2rem;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
.btn-ghost{background:#eeedf5;color:var(--accent)}.btn[disabled]{opacity:.5}
input{font:inherit;padding:.6rem .7rem;border:1px solid #d9d8e8;border-radius:10px}
.pdp{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:40px 0}.pdp img{border-radius:16px;width:100%}
.pdp h1{margin:0 0 .5rem}.pdp .desc{line-height:1.6;color:#4a4868;white-space:pre-line}
.panel{background:#fff;border-radius:16px;padding:28px;margin:32px 0}.muted{color:#6b6987;font-size:.9rem}
.cart-table tr{border-bottom:1px solid #eeedf5}
footer{border-top:1px solid #e6e5f0;padding:28px 0;color:#6b6987;font-size:.85rem;background:#fff}
@media(max-width:760px){.pdp{grid-template-columns:1fr}.hero{padding:36px 24px}}`;

export const classic: Theme = {
  id: 'classic',
  name: 'Classic',
  description: 'Rounded cards, gradient hero and a soft indigo palette, modelled on Plaspool.',
  Layout: ({ store, title, cartCount, children }) => (
    <html lang="en">
      <Head store={store} title={title} css={css} />
      <body>
        {store.themeSettings.announcement ? <div class="announce">{store.themeSettings.announcement}</div> : null}
        <header>
          <div class="wrap">
            <a class="logo" href="/">{store.themeSettings.logoUrl ? <img src={store.themeSettings.logoUrl} alt={store.name} /> : store.name}</a>
            <a class="cart-link" href="/cart">Cart ({cartCount})</a>
          </div>
        </header>
        <main class="wrap">{children}</main>
        <footer><div class="wrap">{raw('&copy;')} {new Date().getFullYear()} {store.name}</div></footer>
      </body>
    </html>
  ),
  Home: ({ store, products }) => (
    <>
      <section class="hero">
        <h1>{store.name}</h1>
        <p>{store.themeSettings.tagline ?? 'Fresh picks, shipped fast.'}</p>
      </section>
      <div class="grid">
        {products.map((p) => (
          <a class="card" href={`/products/${p.slug}`}>
            {p.images[0] ? <img class="ph" src={p.images[0]} alt={p.title} loading="lazy" /> : <div class="ph" />}
            <div class="info">
              <h3>{p.title}</h3>
              <span class="price">{money(store, p.price)}</span>
              {p.compareAt ? <span class="compare">{money(store, p.compareAt)}</span> : null}
            </div>
          </a>
        ))}
      </div>
    </>
  ),
  ProductPage: ({ store, product }) => (
    <div class="pdp">
      <div>{product.images[0] ? <img src={product.images[0]} alt={product.title} /> : null}</div>
      <div>
        <h1>{product.title}</h1>
        <p class="price">{money(store, product.price)}{product.compareAt ? <span class="compare">{money(store, product.compareAt)}</span> : null}</p>
        <AddToCart product={product} />
        <p class="desc">{product.description}</p>
      </div>
    </div>
  ),
  Cart: (p) => <div class="panel"><h1>Your cart</h1><CartTable {...p} /></div>,
  OrderComplete: (p) => <div class="panel"><OrderSummary {...p} /></div>,
  NotFound: () => <div class="panel"><h1>Not found</h1><a class="btn" href="/">Back to the shop</a></div>,
};
