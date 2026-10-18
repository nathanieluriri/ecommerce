import type { Theme } from './types';
import { BuyBox, Gallery, Head, Newsletter, Notice, Price, Reviews, SearchForm, Stars } from './shared';

const css = `body{font-family:"Arial Black",Impact,system-ui,sans-serif;background:#fffbe6;color:#000}
a{color:inherit;text-decoration:none}.wrap{max-width:1280px;margin:0 auto;padding:0 16px}
.ticker{background:#000;color:#fffbe6;overflow:hidden;white-space:nowrap;padding:.5rem 0;font-size:.9rem}
.ticker span{display:inline-block;padding-left:100%;animation:tick 18s linear infinite}@keyframes tick{to{transform:translateX(-100%)}}
header{display:flex;align-items:center;gap:1rem;padding:16px 0;border-bottom:4px solid #000}
.logo{font-size:2rem;text-transform:uppercase;letter-spacing:-.04em;margin-right:auto}.logo img{height:44px}
.cart-link{border:3px solid #000;padding:.4rem .9rem;background:var(--accent);color:#fff;box-shadow:4px 4px 0 #000}
.cats{padding:12px 0;border-bottom:4px solid #000;text-transform:uppercase}.cats a:hover{background:var(--accent);color:#fff}
.mega{font-size:clamp(3rem,11vw,9rem);line-height:.85;text-transform:uppercase;letter-spacing:-.05em;margin:32px 0}
.mega em{font-style:normal;color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-bottom:64px}
.tile{border:4px solid #000;background:#fff;box-shadow:8px 8px 0 #000;display:block;transition:transform .1s,box-shadow .1s}
.tile:hover{transform:translate(-3px,-3px);box-shadow:11px 11px 0 #000}.tile img,.tile .ph{aspect-ratio:4/5;width:100%;object-fit:cover;border-bottom:4px solid #000;background:var(--accent)}
.tile .info{display:flex;justify-content:space-between;padding:12px;text-transform:uppercase;gap:8px}
.price{background:var(--accent);color:#fff;padding:0 .4rem}.compare{text-decoration:line-through;margin-left:.4rem;opacity:.6}
.btn{text-transform:uppercase;background:#000;color:#fffbe6;border:3px solid #000;padding:.8rem 1.4rem;cursor:pointer;box-shadow:4px 4px 0 var(--accent);display:inline-block}
.btn:active{transform:translate(4px,4px);box-shadow:none}.btn-ghost{background:#fff;color:#000}.btn[disabled]{opacity:.4}
input,select,textarea{font-family:system-ui;border:3px solid #000;padding:.6rem;background:#fff}
.pdp{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:32px 0}.gallery-main{border:4px solid #000;box-shadow:10px 10px 0 #000}
.pdp h1{font-size:clamp(2rem,5vw,4rem);text-transform:uppercase;line-height:.9;margin:0 0 1rem}.pdp .desc{font-family:system-ui;line-height:1.6;white-space:pre-line}
.box{border:4px solid #000;background:#fff;padding:24px;margin:32px 0;box-shadow:8px 8px 0 #000}.muted{font-family:system-ui;opacity:.7}
.review,.reviews p,.order-lines,.cart-table{font-family:system-ui}.cart-table tr{border-bottom:3px solid #000}.notice{background:#000;color:#fffbe6}
footer{border-top:4px solid #000;padding:32px 0;display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;text-transform:uppercase}
footer nav{display:flex;flex-direction:column;gap:.5rem}
@media(max-width:760px){.pdp{grid-template-columns:1fr}}`;

export const bold: Theme = {
  id: 'bold',
  name: 'Bold',
  description: 'Neo-brutalist: heavy borders, hard shadows, oversized type and a scrolling ticker.',
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => (
    <html lang="en">
      <Head store={store} title={title} css={css} meta={meta} url={url} />
      <body>
        {store.themeSettings.announcement ? <div class="ticker"><span>{store.themeSettings.announcement}</span></div> : null}
        <Notice text={notice} />
        <div class="wrap">
          <header>
            <a class="logo" href="/">{store.themeSettings.logoUrl ? <img src={store.themeSettings.logoUrl} alt={store.name} /> : store.name}</a>
            <SearchForm />
            <a href="/account">{customer ? 'ACCOUNT' : 'SIGN IN'}</a>
            <a class="cart-link" href="/cart">Cart [{cartCount}]</a>
          </header>
          <nav class="cats">
            <a href="/products">All</a>
            {categories.map((cat) => <a href={`/collections/${cat.slug}`}>{cat.name}</a>)}
          </nav>
          <main>{children}</main>
          <footer>
            <nav>
              <span>{store.name} / {new Date().getFullYear()}</span>
              <a href="/track">Track order</a>
              <a href="/account">Account</a>
            </nav>
            <Newsletter />
          </footer>
        </div>
      </body>
    </html>
  ),
  ProductGrid: ({ store, products }) => (
    <div class="grid">
      {products.map((p) => (
        <a class="tile" href={`/products/${p.slug}`}>
          {p.images[0] ? <img src={p.images[0]} alt={p.title} loading="lazy" /> : <div class="ph" />}
          <div class="info"><span>{p.title}</span><Price store={store} product={p} /></div>
        </a>
      ))}
    </div>
  ),
  Home: ({ store, products }) => {
    const words = (store.themeSettings.tagline ?? 'New drops every week').split(' ');
    const last = words.pop();
    return (
      <>
        <h1 class="mega">{words.join(' ')} <em>{last}</em></h1>
        {bold.ProductGrid({ store, products })}
      </>
    );
  },
  ProductPage: (props) => (
    <>
      <div class="pdp">
        <Gallery product={props.product} image={props.image} />
        <div>
          <h1>{props.product.title}</h1>
          <p><Price store={props.store} product={props.product} /> <Stars value={props.product.ratingAvg} count={props.product.ratingCount} /></p>
          <BuyBox store={props.store} product={props.product} label="Grab it" />
          <p class="desc">{props.product.description}</p>
        </div>
      </div>
      <div class="box"><Reviews {...props} /></div>
    </>
  ),
  Page: ({ title, children }) => (
    <div class="box">
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
};
