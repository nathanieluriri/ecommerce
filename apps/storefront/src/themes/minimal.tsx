import type { Theme } from './types';
import { BuyBox, Gallery, Head, Newsletter, Notice, Price, Reviews, SearchForm, Stars } from './shared';

const css = `body{font-family:"Iowan Old Style",Georgia,serif;color:#111;background:#fff;line-height:1.5}
a{color:inherit;text-decoration:none}.wrap{max-width:960px;margin:0 auto;padding:0 24px}
header{display:flex;justify-content:space-between;align-items:baseline;padding:40px 0 16px;gap:1rem}
.logo{font-size:1.1rem;letter-spacing:.3em;text-transform:uppercase}.logo img{height:28px}
.sans{font-family:ui-sans-serif,system-ui;font-size:.75rem;letter-spacing:.15em;text-transform:uppercase}
nav.top{display:flex;gap:1.5rem;align-items:baseline}nav.top a{border-bottom:1px solid transparent}nav.top a:hover{border-color:#111}
.cats-bar{display:flex;gap:1.5rem;padding:0 0 48px;flex-wrap:wrap}
.intro{font-size:1.6rem;max-width:36rem;margin:0 0 72px;font-style:italic}
.list{border-top:1px solid #111;margin-bottom:48px}.row{display:grid;grid-template-columns:120px 1fr auto;gap:24px;align-items:center;padding:20px 0;border-bottom:1px solid #ddd}
.row img,.row .ph{width:120px;height:150px;object-fit:cover;background:#f2f2f2}.row h3{font-weight:400;font-size:1.25rem;margin:0}
.price{font-family:ui-sans-serif,system-ui;font-size:.9rem}.compare{text-decoration:line-through;color:#999;margin-left:.5rem;font-family:ui-sans-serif,system-ui;font-size:.9rem}
.btn{background:#111;color:#fff;border:1px solid #111;padding:.75rem 1.6rem;font-family:ui-sans-serif,system-ui;font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;display:inline-block}
.btn-ghost{background:#fff;color:#111}.btn[disabled]{opacity:.4}
input,select,textarea{padding:.6rem;border:0;border-bottom:1px solid #111;background:transparent;border-radius:0}
.pdp{display:grid;grid-template-columns:3fr 2fr;gap:56px}.pdp h1{font-weight:400;font-size:2.2rem;margin:0 0 1rem}
.pdp .desc{white-space:pre-line;color:#444}.muted{color:#777;font-size:.9rem}
.cart-table tr{border-bottom:1px solid #ddd}h1,h2,h3{font-weight:400}.notice{background:#111}
footer{margin-top:96px;padding:32px 0;border-top:1px solid #111;display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap}
footer nav{display:flex;flex-direction:column;gap:.5rem}
@media(max-width:700px){.pdp{grid-template-columns:1fr}.row{grid-template-columns:80px 1fr}.row img,.row .ph{width:80px;height:100px}.row .price-wrap{grid-column:2}}`;

export const minimal: Theme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Editorial and monochrome: serif type, a single-column index and lots of white space.',
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => (
    <html lang="en">
      <Head store={store} title={title} css={css} meta={meta} url={url} />
      <body>
        <Notice text={notice} />
        <div class="wrap">
          <header>
            <a class="logo" href="/">{store.themeSettings.logoUrl ? <img src={store.themeSettings.logoUrl} alt={store.name} /> : store.name}</a>
            <nav class="top sans">
              <SearchForm />
              <a href="/account">{customer ? 'Account' : 'Sign in'}</a>
              <a href="/cart">Bag {cartCount}</a>
            </nav>
          </header>
          <nav class="cats-bar sans">
            <a href="/products">Everything</a>
            {categories.map((cat) => <a href={`/collections/${cat.slug}`}>{cat.name}</a>)}
          </nav>
          <main>{children}</main>
          <footer class="sans">
            <nav>
              <span>{store.name}</span>
              <a href="/track">Track an order</a>
              {store.supportEmail ? <a href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a> : null}
            </nav>
            <Newsletter />
          </footer>
        </div>
      </body>
    </html>
  ),
  ProductGrid: ({ store, products }) => (
    <div class="list">
      {products.map((p) => (
        <a class="row" href={`/products/${p.slug}`}>
          {p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <div class="ph" />}
          <h3>{p.title}</h3>
          <Price store={store} product={p} />
        </a>
      ))}
    </div>
  ),
  Home: ({ store, products }) => (
    <>
      <p class="intro">{store.themeSettings.tagline ?? 'A small collection of considered things.'}</p>
      {minimal.ProductGrid({ store, products })}
      <p><a class="btn btn-ghost" href="/products">See everything</a></p>
    </>
  ),
  ProductPage: (props) => (
    <>
      <div class="pdp">
        <Gallery product={props.product} image={props.image} />
        <div>
          <h1>{props.product.title}</h1>
          <p><Price store={props.store} product={props.product} /> <Stars value={props.product.ratingAvg} count={props.product.ratingCount} /></p>
          <p class="desc">{props.product.description}</p>
          <BuyBox store={props.store} product={props.product} label="Add to bag" />
        </div>
      </div>
      <Reviews {...props} />
    </>
  ),
  Page: ({ title, children }) => (
    <>
      {title ? <h1>{title}</h1> : null}
      {children}
    </>
  ),
};
