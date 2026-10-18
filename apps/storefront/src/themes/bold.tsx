import type { Theme } from './types';
import { AddToCart, CartTable, Head, money, OrderSummary } from './shared';

const css = `body{font-family:"Arial Black",Impact,system-ui,sans-serif;background:#fffbe6;color:#000}
a{color:inherit;text-decoration:none}.wrap{max-width:1280px;margin:0 auto;padding:0 16px}
.ticker{background:#000;color:#fffbe6;overflow:hidden;white-space:nowrap;padding:.5rem 0;font-size:.9rem}
.ticker span{display:inline-block;padding-left:100%;animation:tick 18s linear infinite}@keyframes tick{to{transform:translateX(-100%)}}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:4px solid #000}
.logo{font-size:2rem;text-transform:uppercase;letter-spacing:-.04em}.logo img{height:44px}
.cart-link{border:3px solid #000;padding:.4rem .9rem;background:var(--accent);color:#fff;box-shadow:4px 4px 0 #000}
.mega{font-size:clamp(3rem,11vw,9rem);line-height:.85;text-transform:uppercase;letter-spacing:-.05em;margin:32px 0}
.mega em{font-style:normal;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-bottom:64px}
.tile{border:4px solid #000;background:#fff;box-shadow:8px 8px 0 #000;display:block;transition:transform .1s,box-shadow .1s}
.tile:hover{transform:translate(-3px,-3px);box-shadow:11px 11px 0 #000}.tile img,.tile .ph{aspect-ratio:4/5;width:100%;object-fit:cover;border-bottom:4px solid #000;background:var(--accent)}
.tile .info{display:flex;justify-content:space-between;padding:12px;text-transform:uppercase;gap:8px}
.price{background:var(--accent);color:#fff;padding:0 .4rem}.compare{text-decoration:line-through;margin-left:.4rem;opacity:.6}
.btn{font:inherit;text-transform:uppercase;background:#000;color:#fffbe6;border:3px solid #000;padding:.8rem 1.4rem;cursor:pointer;box-shadow:4px 4px 0 var(--accent);display:inline-block}
.btn:active{transform:translate(4px,4px);box-shadow:none}.btn-ghost{background:#fff;color:#000}.btn[disabled]{opacity:.4}
input{font:inherit;font-family:system-ui;border:3px solid #000;padding:.6rem}
.pdp{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:32px 0}.pdp img{border:4px solid #000;box-shadow:10px 10px 0 #000}
.pdp h1{font-size:clamp(2rem,5vw,4rem);text-transform:uppercase;line-height:.9;margin:0 0 1rem}.pdp .desc{font-family:system-ui;line-height:1.6;white-space:pre-line}
.box{border:4px solid #000;background:#fff;padding:24px;margin:32px 0;box-shadow:8px 8px 0 #000}.muted{font-family:system-ui;opacity:.7}
.cart-table tr{border-bottom:3px solid #000}
footer{border-top:4px solid #000;padding:24px 0;text-transform:uppercase}
@media(max-width:760px){.pdp{grid-template-columns:1fr}}`;

export const bold: Theme = {
  id: 'bold',
  name: 'Bold',
  description: 'Neo-brutalist: heavy borders, hard shadows, oversized type and a scrolling ticker.',
  Layout: ({ store, title, cartCount, children }) => (
    <html lang="en">
      <Head store={store} title={title} css={css} />
      <body>
        {store.themeSettings.announcement ? <div class="ticker"><span>{store.themeSettings.announcement}</span></div> : null}
        <div class="wrap">
          <header>
            <a class="logo" href="/">{store.themeSettings.logoUrl ? <img src={store.themeSettings.logoUrl} alt={store.name} /> : store.name}</a>
            <a class="cart-link" href="/cart">Cart [{cartCount}]</a>
          </header>
          <main>{children}</main>
          <footer>{store.name} / {new Date().getFullYear()}</footer>
        </div>
      </body>
    </html>
  ),
  Home: ({ store, products }) => {
    const words = (store.themeSettings.tagline ?? 'New drops every week').split(' ');
    const last = words.pop();
    return (
      <>
        <h1 class="mega">{words.join(' ')} <em>{last}</em></h1>
        <div class="grid">
          {products.map((p) => (
            <a class="tile" href={`/products/${p.slug}`}>
              {p.images[0] ? <img src={p.images[0]} alt={p.title} loading="lazy" /> : <div class="ph" />}
              <div class="info"><span>{p.title}</span><span class="price">{money(store, p.price)}</span></div>
            </a>
          ))}
        </div>
      </>
    );
  },
  ProductPage: ({ store, product }) => (
    <div class="pdp">
      <div>{product.images[0] ? <img src={product.images[0]} alt={product.title} /> : null}</div>
      <div>
        <h1>{product.title}</h1>
        <p><span class="price">{money(store, product.price)}</span>{product.compareAt ? <span class="compare">{money(store, product.compareAt)}</span> : null}</p>
        <AddToCart product={product} label="Grab it" />
        <p class="desc">{product.description}</p>
      </div>
    </div>
  ),
  Cart: (p) => <div class="box"><h1>Cart</h1><CartTable {...p} /></div>,
  OrderComplete: (p) => <div class="box"><OrderSummary {...p} /></div>,
  NotFound: () => <h1 class="mega">404 <em>gone</em></h1>,
};
