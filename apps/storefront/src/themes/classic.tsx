import { raw } from 'hono/html';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Newsletter, Notice, Price, Reviews, SearchForm, Stars } from './shared';

const css = `body{font-family:Inter,system-ui,sans-serif;color:#1f1d3a;background:#f7f7fb}
a{color:inherit}.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.announce{background:var(--accent);color:#fff;text-align:center;font-size:.85rem;padding:.5rem}
header{background:#fff;border-bottom:1px solid #e6e5f0}header .wrap{display:flex;align-items:center;gap:1.5rem;height:68px}
.logo{font-weight:800;font-size:1.25rem;text-decoration:none;color:var(--accent);margin-right:auto}.logo img{height:36px}
.nav-links{display:flex;gap:1.25rem;font-weight:500}.nav-links a{text-decoration:none}.nav-links a:hover{color:var(--accent)}
.cart-link{text-decoration:none;font-weight:600;background:#eeedf5;color:var(--accent);padding:.5rem .9rem;border-radius:999px}
.search input{border-radius:999px;padding:.45rem .9rem}
.hero{background:linear-gradient(135deg,var(--accent),#0c0a2a);color:#fff;border-radius:20px;padding:56px 40px;margin:28px 0}
.hero h1{font-size:clamp(2rem,4vw,3rem);margin:0 0 .5rem}.hero p{opacity:.85;margin:0 0 1.5rem}.hero .btn{background:#fff;color:var(--accent)}
.section-title{display:flex;justify-content:space-between;align-items:baseline;margin:2rem 0 1rem}.section-title h2{margin:0}
.cat-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.cat-tile{background:#fff;border-radius:16px;padding:22px;text-decoration:none;font-weight:600;box-shadow:0 1px 2px rgba(20,18,60,.06)}.cat-tile:hover{color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px;margin-bottom:56px}
.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,60,.06);text-decoration:none;transition:transform .15s;position:relative}
.card:hover{transform:translateY(-3px)}.card .ph{aspect-ratio:1;background:#eeedf5;object-fit:cover;width:100%}.card .info{padding:14px 16px;display:flex;flex-direction:column;gap:.25rem}
.card h3{font-size:1rem;margin:0}.price{font-weight:700;color:var(--accent)}.compare{text-decoration:line-through;color:#8a88a6;margin-left:.4rem;font-weight:400}
.badge{position:absolute;top:12px;left:12px;background:#fff;border-radius:999px;padding:.2rem .6rem;font-size:.75rem;font-weight:600}
.btn{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:.7rem 1.2rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
.btn-ghost{background:#eeedf5;color:var(--accent)}.btn[disabled]{opacity:.5}
input,select,textarea{padding:.6rem .7rem;border:1px solid #d9d8e8;border-radius:10px;background:#fff}
.pdp{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:40px 0}.gallery-main{border-radius:16px}.thumbs img{border-radius:8px}
.pdp h1{margin:0 0 .5rem}.pdp .desc{line-height:1.6;color:#4a4868;white-space:pre-line}.pdp .price{font-size:1.3rem}
.panel{background:#fff;border-radius:16px;padding:28px;margin:32px 0}.muted{color:#6b6987;font-size:.9rem}
.cart-table tr{border-bottom:1px solid #eeedf5}
footer{border-top:1px solid #e6e5f0;padding:40px 0;color:#6b6987;font-size:.9rem;background:#fff;margin-top:40px}
footer .wrap{display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap}footer nav{display:flex;flex-direction:column;gap:.4rem}
@media(max-width:860px){.nav-links{display:none}}
@media(max-width:760px){.pdp{grid-template-columns:1fr}.hero{padding:36px 24px}}`;

export const classic: Theme = {
  id: 'classic',
  name: 'Classic',
  description: 'Rounded cards, gradient hero and a soft indigo palette, modelled on Plaspool.',
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => (
    <html lang="en">
      <Head store={store} title={title} css={css} meta={meta} url={url} />
      <body>
        {store.themeSettings.announcement ? <div class="announce">{store.themeSettings.announcement}</div> : null}
        <Notice text={notice} />
        <header>
          <div class="wrap">
            <a class="logo" href="/">{store.themeSettings.logoUrl ? <img src={store.themeSettings.logoUrl} alt={store.name} /> : store.name}</a>
            <nav class="nav-links">
              <a href="/products">Shop all</a>
              {categories.slice(0, 5).map((cat) => <a href={`/collections/${cat.slug}`}>{cat.name}</a>)}
            </nav>
            <SearchForm />
            <a href="/account" class="nav-links">{customer ? 'Account' : 'Sign in'}</a>
            <a class="cart-link" href="/cart">Cart ({cartCount})</a>
          </div>
        </header>
        <main class="wrap">{children}</main>
        <footer>
          <div class="wrap">
            <div>
              <strong>{store.name}</strong>
              <p>{raw('&copy;')} {new Date().getFullYear()} {store.name}</p>
            </div>
            <nav>
              <a href="/products">Shop all</a>
              <a href="/track">Track an order</a>
              <a href="/account">Your account</a>
              {store.supportEmail ? <a href={`mailto:${store.supportEmail}`}>Contact us</a> : null}
            </nav>
            <Newsletter />
          </div>
        </footer>
      </body>
    </html>
  ),
  ProductGrid: ({ store, products }) => (
    <div class="grid">
      {products.map((p) => (
        <a class="card" href={`/products/${p.slug}`}>
          {p.images[0] ? <img class="ph" src={p.images[0]} alt={p.title} loading="lazy" /> : <div class="ph" />}
          {p.compareAt && p.compareAt > p.price ? <span class="badge">Sale</span> : null}
          <div class="info">
            <h3>{p.title}</h3>
            <Stars value={p.ratingAvg} count={p.ratingCount} />
            <Price store={store} product={p} />
          </div>
        </a>
      ))}
    </div>
  ),
  Home: ({ store, products, categories }) => (
    <>
      <section class="hero">
        <h1>{store.name}</h1>
        <p>{store.themeSettings.tagline ?? 'Fresh picks, shipped fast.'}</p>
        <a class="btn" href="/products">Shop now</a>
      </section>
      {categories.length ? (
        <>
          <div class="section-title"><h2>Shop by category</h2></div>
          <div class="cat-tiles">{categories.map((cat) => <a class="cat-tile" href={`/collections/${cat.slug}`}>{cat.name}</a>)}</div>
        </>
      ) : null}
      <div class="section-title"><h2>New arrivals</h2><a href="/products">View all</a></div>
      {classic.ProductGrid({ store, products })}
    </>
  ),
  ProductPage: (props) => (
    <>
      <div class="pdp">
        <Gallery product={props.product} image={props.image} />
        <div>
          <h1>{props.product.title}</h1>
          <p><Stars value={props.product.ratingAvg} count={props.product.ratingCount} /></p>
          <p><Price store={props.store} product={props.product} /></p>
          <BuyBox store={props.store} product={props.product} />
          <p class="desc">{props.product.description}</p>
        </div>
      </div>
      <div class="panel"><Reviews {...props} /></div>
    </>
  ),
  Page: ({ title, children }) => (
    <div class="panel">
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
};
