import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Price, Reviews, Stars, money, priceRange } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';

const ICONS: Record<string, Child> = {
  truck: <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01" />,
  lock: <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" />,
  chat: <path d="M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5" />,
  globe: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
};
const ICON_ORDER = ['truck', 'lock', 'chat', 'globe', 'heart', 'star'];

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {ICONS[name] ?? ICONS.star}
    </svg>
  );
}

function iconFor(title: string, i: number) {
  const t = title.toLowerCase();
  if (/deliver|ship|post/.test(t)) return 'truck';
  if (/secur|ssl|pay|safe/.test(t)) return 'lock';
  if (/support|help|hand|team/.test(t)) return 'chat';
  if (/international|world|countr|ship to/.test(t)) return 'globe';
  if (/love|care|pick/.test(t)) return 'heart';
  return ICON_ORDER[i % ICON_ORDER.length]!;
}

function Card({ store, p }: { store: Store; p: Product }) {
  const r = priceRange(p);
  const many = p.variants.length > 1;
  return (
    <a class="card" href={`/products/${p.slug}`}>
      <span class="card__media">
        {p.images[0] ? <img src={p.images[0]} alt={p.title} loading="lazy" decoding="async" /> : <span class="card__ph" />}
        {p.images[1] ? <img class="card__alt" src={p.images[1]} alt="" loading="lazy" decoding="async" /> : null}
        {p.tags.some((t) => /10k\+|bestseller/i.test(t)) ? <span class="badge">Bestseller</span> : p.tags.includes('Highly Rated') ? <span class="badge badge--soft">Highly rated</span> : null}
      </span>
      <span class="card__body">
        <span class="card__title">{p.title}</span>
        {p.ratingCount ? <Stars value={p.ratingAvg} count={p.ratingCount} /> : null}
        <span class="card__price">
          {r.min !== r.max ? <small>From </small> : null}
          {money(store, r.min)}
        </span>
        <span class="card__cta">{many ? 'Choose options' : 'View product'}</span>
      </span>
    </a>
  );
}

function Grid({ store, products }: { store: Store; products: Product[] }) {
  return (
    <div class="grid">
      {products.map((p) => (
        <Card store={store} p={p} />
      ))}
    </div>
  );
}

function Features({ items }: { items: { title: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <section class="features">
      <div class="wrap features__in" style={`--n:${Math.min(items.length, 4)}`}>
        {items.map((f, i) => (
          <div class="feature">
            <span class="feature__icon"><Icon name={iconFor(f.title, i)} /></span>
            <span>
              <strong>{raw(f.title)}</strong>
              <span>{raw(f.text)}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const css = `
:root{--a:var(--accent);--ink:#11151c;--sub:#5b6170;--line:#e7e8ec;--bg:#fff;--soft:#f5f6f8;--r:12px;
  --rainbow:linear-gradient(90deg,#e53935,#fb8c00,#fdd835,#43a047,#00acc1,#1e88e5,#8e24aa);
  --head:'Poppins',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif}
body{font-family:var(--body);color:var(--ink);background:var(--bg);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--head);font-weight:600;line-height:1.15;letter-spacing:-.01em;margin:0}
.wrap{max-width:1280px;margin:0 auto;padding:0 20px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
:focus-visible{outline:2px solid var(--a);outline-offset:2px;border-radius:6px}
.muted{color:var(--sub);font-size:.92rem}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--a);color:#fff;border:0;border-radius:999px;padding:13px 26px;font:600 15px var(--head);cursor:pointer;transition:transform .15s,box-shadow .15s,filter .15s;box-shadow:0 6px 18px -8px var(--a)}
.btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
.btn:active{transform:none}
.btn-ghost{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}
.btn-ghost:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
.btn[disabled]{opacity:.45;cursor:not-allowed;transform:none}
.link{background:none;border:0;padding:0;color:var(--a);cursor:pointer;text-decoration:underline}
input,select,textarea{font:inherit;color:var(--ink);background:#fff;border:1.5px solid var(--line);border-radius:10px;padding:11px 13px;transition:border-color .15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--a)}

.announce{background:var(--ink);color:#fff;text-align:center;font-size:13px;font-weight:500;padding:9px 16px}
.notice{background:var(--a);color:#fff;text-align:center;padding:10px;font-weight:500}
.hdr{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.hdr__top{display:grid;grid-template-columns:auto 1fr auto;gap:28px;align-items:center;height:76px}
.logo{display:flex;align-items:center;gap:10px;font:700 18px var(--head)}
.logo img{height:54px;width:auto}
.hsearch{position:relative;max-width:620px;width:100%;justify-self:center}
.hsearch input{width:100%;padding:12px 18px 12px 46px;border-radius:999px;background:var(--soft);border-color:transparent}
.hsearch input:focus{background:#fff;border-color:var(--a)}
.hsearch svg{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--sub)}
.hacts{display:flex;align-items:center;gap:6px}
.hact{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:999px;font-weight:500;font-size:14px}
.hact:hover{background:var(--soft)}
.hact__n{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:10px;background:var(--a);color:#fff;font-size:11px;font-weight:600;padding:0 6px}
.cats{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:0 20px 10px;max-width:1280px;margin:0 auto}
.cats::-webkit-scrollbar{display:none}
.cats a{white-space:nowrap;font-size:14px;font-weight:500;color:var(--sub);padding:7px 13px;border-radius:999px}
.cats a:hover{background:var(--soft);color:var(--ink)}
.rainbow{height:3px;background:var(--rainbow)}

.hero{padding:26px 0 8px}
.slides{display:grid;grid-auto-flow:column;grid-auto-columns:100%;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;border-radius:22px;scrollbar-width:none}
.slides::-webkit-scrollbar{display:none}
.slide{scroll-snap-align:start;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:34px;padding:44px 52px;min-height:440px;background:linear-gradient(120deg,color-mix(in srgb,var(--a) 10%,#fff),#fff 70%);position:relative;overflow:hidden}
.slide::after{content:'';position:absolute;inset:auto 0 0 0;height:4px;background:var(--rainbow);opacity:.85}
.slide__eyebrow{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--a);background:#fff;padding:6px 12px;border-radius:999px;box-shadow:0 1px 0 var(--line)}
.slide h1,.slide h2{font-size:clamp(30px,4vw,50px);margin:16px 0 12px}
.slide p{color:var(--sub);max-width:30rem;margin:0 0 24px}
.slide__price{font:600 24px var(--head);margin-bottom:22px}
.slide__img{justify-self:center;width:min(100%,400px);aspect-ratio:1;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 30px 60px -30px rgba(17,21,28,.35)}
.slide__img img{width:100%;height:100%;object-fit:cover}
.dots{display:flex;justify-content:center;gap:8px;margin-top:14px}
.dots a{width:9px;height:9px;border-radius:50%;background:var(--line)}
.dots a:hover{background:var(--a)}

.features{border-bottom:1px solid var(--line)}
.features__in{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:18px;padding:26px 20px}
.feature{display:flex;gap:14px;align-items:flex-start}
.feature__icon{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:color-mix(in srgb,var(--a) 10%,#fff);color:var(--a)}
.feature strong{display:block;font:600 15px var(--head)}
.feature span span{display:block;color:var(--sub);font-size:13.5px;margin-top:2px}

.sec{padding:48px 0}
.sec__head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:22px}
.sec__head h2{font-size:clamp(22px,2.6vw,30px)}
.sec__head a{font-weight:600;color:var(--a);white-space:nowrap}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}
.tile{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;font-weight:600;font-size:14px}
.tile__img{width:100%;aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--soft);box-shadow:inset 0 0 0 1px var(--line);transition:transform .25s}
.tile:hover .tile__img{transform:translateY(-4px) scale(1.02);box-shadow:inset 0 0 0 2px var(--a)}
.tile__img img{width:100%;height:100%;object-fit:cover}

.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}
.card{display:flex;flex-direction:column;border-radius:var(--r);transition:transform .2s}
.card__media{position:relative;aspect-ratio:1;border-radius:var(--r);overflow:hidden;background:var(--soft)}
.card__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .35s,transform .5s}
.card__alt{opacity:0}
.card:hover .card__alt{opacity:1}
.card:hover .card__media img{transform:scale(1.03)}
.card__ph{position:absolute;inset:0;background:linear-gradient(135deg,var(--soft),#e9ebef)}
.badge{position:absolute;left:10px;top:10px;background:var(--ink);color:#fff;font-size:11px;font-weight:600;padding:5px 9px;border-radius:999px}
.badge--soft{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.card__body{display:flex;flex-direction:column;gap:5px;padding:12px 2px 4px}
.card__title{font-weight:500;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.7em}
.card__price{font:600 17px var(--head)}
.card__price small{font:500 13px var(--body);color:var(--sub)}
.card__cta{font-size:13px;font-weight:600;color:var(--a);opacity:0;transform:translateY(-3px);transition:.2s}
.card:hover .card__cta{opacity:1;transform:none}
.stars{color:#f5a524;font-size:13px;letter-spacing:1px}

.promises{background:var(--soft);padding:54px 0}
.promises__in{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:20px}
.promise{background:#fff;border-radius:18px;padding:28px;box-shadow:0 1px 0 var(--line)}
.promise .feature__icon{margin-bottom:16px}
.promise h3{font-size:18px;margin-bottom:6px}
.promise p{margin:0;color:var(--sub)}
.faq{max-width:860px;margin:0 auto}
.faq h2{text-align:center;font-size:clamp(22px,2.6vw,30px);margin-bottom:24px}
.faq details{border:1px solid var(--line);border-radius:14px;margin-bottom:10px;background:#fff;transition:box-shadow .2s}
.faq details[open]{box-shadow:0 10px 30px -18px rgba(17,21,28,.35)}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:18px 20px;font-weight:600}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:'+';font:500 22px var(--head);color:var(--a);transition:transform .2s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq .ans{padding:0 20px 18px;color:var(--sub)}
.faq .ans p{margin:0 0 8px}

.join{background:var(--ink);color:#fff;padding:46px 0}
.join__in{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:center}
.join h2{font-size:clamp(20px,2.4vw,28px)}
.join p{color:#b9bfcc;margin:8px 0 0}
.join form{display:flex;gap:10px}
.join input{flex:1;min-width:0;background:#1d222c;border-color:#2c3340;color:#fff}
.ftr{background:#0b0e13;color:#9aa1ae;padding:44px 0 28px;font-size:14px}
.ftr__grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:28px}
.ftr h4{color:#fff;font:600 14px var(--head);margin:0 0 14px}
.ftr ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.ftr a:hover{color:#fff}
.ftr__logo{display:inline-block;background:#fff;border-radius:16px;padding:10px;margin-bottom:12px}
.ftr__logo img{height:56px}
.ftr__base{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid #1f242d;margin-top:34px;padding-top:20px;font-size:13px}
.pay{display:flex;gap:6px;flex-wrap:wrap}
.pay span{border:1px solid #2a303b;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;color:#c9ced8}

.crumbs{font-size:13px;color:var(--sub);padding:18px 0}
.crumbs a:hover{color:var(--a)}
.pdp{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:44px;padding-bottom:44px}
.gallery-main{aspect-ratio:1;object-fit:cover;border-radius:18px;background:var(--soft)}
.thumbs{gap:8px;overflow-x:auto;flex-wrap:nowrap}
.thumbs a{flex:none}
.thumbs img{width:72px;height:72px;border-radius:10px;opacity:.6}
.pdp__info{position:sticky;top:140px;align-self:start}
.pdp h1{font-size:clamp(24px,2.8vw,34px)}
.pdp__price{font:600 28px var(--head);margin:14px 0}
.pdp__price .compare{font-size:18px;color:var(--sub);margin-left:8px;text-decoration:line-through}
.buy{gap:14px}
.buy .field span{font-weight:600;font-size:14px}
.buy select{width:100%;max-width:none}
.buy-row input[type=number]{width:84px;text-align:center}
.buy-row .btn{flex:1}
.assure{display:grid;gap:10px;margin:20px 0;padding:16px;border-radius:14px;background:var(--soft)}
.assure div{display:flex;gap:10px;align-items:center;font-size:14px}
.assure svg{color:var(--a);flex:none}
.desc{white-space:pre-line;color:#363b46;line-height:1.7}
.tabs details{border-top:1px solid var(--line)}
.tabs summary{list-style:none;cursor:pointer;padding:16px 0;font-weight:600;display:flex;justify-content:space-between}
.tabs summary::-webkit-details-marker{display:none}
.tabs summary::after{content:'+';color:var(--a);font-size:20px}
.tabs details[open] summary::after{content:'−'}
.reviews{border-top:1px solid var(--line);padding:40px 0}
.reviews h2{font-size:26px;margin-bottom:8px}
.review{padding:18px 0;border-bottom:1px solid var(--line)}

.pagehead{padding:30px 0 18px}
.pagehead h1{font-size:clamp(26px,3vw,38px)}
.inner{padding-bottom:56px}
.listing-bar{border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:22px;font-size:14px}
.pager a{font-weight:600;color:var(--a)}
.cart-table td{border-bottom:1px solid var(--line);padding:16px 8px}
.cart-table a{font-weight:600}
.cart-img img{width:76px;height:76px;border-radius:10px}
.cart-table input{width:70px;text-align:center}
.totals{font-size:15px}
.totals .total{font:600 20px var(--head)}
.checkout-form .btn{min-width:16rem}
.order-done h1{font-size:30px}
.orders-list li{border-color:var(--line)}
.empty p{font:600 20px var(--head)}
.error{color:#c62828}

@media(max-width:1000px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.features__in,.promises__in{grid-template-columns:repeat(2,1fr)}.ftr__grid{grid-template-columns:1fr 1fr}}
@media(max-width:760px){
  .hdr__top{grid-template-columns:auto 1fr;height:64px;gap:12px}
  .logo img{height:42px}
  .hsearch{grid-column:1/-1;grid-row:2;margin-bottom:10px}
  .hacts{justify-self:end}
  .hact__label{display:none}
  .slide{grid-template-columns:1fr;padding:26px 22px 30px;min-height:0;gap:18px}
  .slide__img{order:-1;width:100%;max-width:340px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .card__cta{display:none}
  .features__in{grid-template-columns:1fr;gap:14px;padding:20px}
  .promises__in{grid-template-columns:1fr}
  .tiles{grid-template-columns:repeat(3,1fr);gap:10px}
  .tile{font-size:12.5px}
  .pdp{grid-template-columns:1fr;gap:20px}
  .pdp__info{position:static}
  .join__in{grid-template-columns:1fr}
  .join form{flex-direction:column}
}
`;

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" stroke-linecap="round" />
    </svg>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <section class="sec">
      <div class="wrap faq">
        <h2>Frequently asked questions</h2>
        {items.map((f, i) => (
          <details open={i === 0}>
            <summary>{f.q}</summary>
            <div class="ans">{raw(f.a)}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export const market: Theme = {
  id: 'market',
  name: 'Market',
  description: 'Bright, fast general store: big search, product slider, category circles and product rows.',
  homeCollections: 5,
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const logo = store.themeSettings.logoUrl;
    return (
      <html lang="en-GB">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <a class="sr" href="#main">Skip to content</a>
          {store.themeSettings.announcement ? <div class="announce">{store.themeSettings.announcement}</div> : null}
          <Notice text={notice} />
          <header class="hdr">
            <div class="wrap hdr__top">
              <a class="logo" href="/" aria-label={`${store.name} home`}>
                {logo ? <img src={logo} alt={store.name} width="54" height="54" /> : store.name}
              </a>
              <form class="hsearch" method="get" action="/search" role="search">
                <SearchIcon />
                <input type="search" name="q" placeholder={`Search ${store.name}`} aria-label="Search products" />
              </form>
              <nav class="hacts" aria-label="Account">
                <a class="hact" href="/account">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke-linecap="round" /></svg>
                  <span class="hact__label">{customer ? 'Account' : 'Sign in'}</span>
                </a>
                <a class="hact" href="/cart" aria-label={`Basket, ${cartCount} items`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" stroke-linejoin="round" /><circle cx="10" cy="20.5" r="1" /><circle cx="17" cy="20.5" r="1" /></svg>
                  <span class="hact__label">Basket</span>
                  <span class="hact__n">{cartCount}</span>
                </a>
              </nav>
            </div>
            <nav class="cats" aria-label="Categories">
              <a href="/products">All products</a>
              {categories.map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
            </nav>
            <div class="rainbow" />
          </header>
          <main id="main">{children}</main>
          <section class="join">
            <div class="wrap join__in">
              <div>
                <h2>Join our list</h2>
                <p>New arrivals, helpful offers and product updates. No spam, unsubscribe any time.</p>
              </div>
              <form method="post" action="/subscribe">
                <label class="sr" for="nl">Email</label>
                <input id="nl" type="email" name="email" placeholder="Your email address" required />
                <button class="btn" type="submit">Subscribe</button>
              </form>
            </div>
          </section>
          <footer class="ftr">
            <div class="wrap">
              <div class="ftr__grid">
                <div>
                  {logo ? <span class="ftr__logo"><img src={logo} alt={store.name} /></span> : <h4>{store.name}</h4>}
                  <p>{store.themeSettings.tagline ?? ''}</p>
                </div>
                <div>
                  <h4>Shop</h4>
                  <ul>
                    {categories.slice(0, 6).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
                <div>
                  <h4>Help</h4>
                  <ul>
                    <li><a href="/track">Track an order</a></li>
                    <li><a href="/pages/faq">Delivery and FAQ</a></li>
                    <li><a href="/account">Your account</a></li>
                    {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}>Contact us</a></li> : null}
                  </ul>
                </div>
                <div>
                  <h4>More</h4>
                  <ul>
                    <li><a href="/products">All products</a></li>
                    {categories.slice(6, 11).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
              </div>
              <div class="ftr__base">
                <span>{raw('&copy;')} {new Date().getFullYear()} {store.name}</span>
                <span class="pay"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Google Pay</span></span>
              </div>
            </div>
          </footer>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories, featured, sections }) => {
    const slides = (featured?.length ? featured : products).slice(0, 5);
    const content = store.content ?? {};
    return (
      <>
        {slides.length ? (
          <section class="wrap hero">
            <div class="slides">
              {slides.map((p, i) => (
                <div class="slide" id={`slide-${i}`}>
                  <div>
                    <span class="slide__eyebrow">{i === 0 ? content.heroTitle ?? 'Featured' : 'Featured'}</span>
                    {i === 0 ? <h1>{p.title}</h1> : <h2>{p.title}</h2>}
                    <p>{p.description.split('\n').find((l) => l.trim().length > 40)?.slice(0, 160) ?? content.heroText ?? ''}</p>
                    <div class="slide__price"><Price store={store} product={p} /></div>
                    <a class="btn" href={`/products/${p.slug}`}>Shop now</a>
                  </div>
                  <div class="slide__img">{p.images[0] ? <img src={p.images[0]} alt={p.title} {...(i === 0 ? { fetchpriority: 'high' } : { loading: 'lazy' })} /> : null}</div>
                </div>
              ))}
            </div>
            {slides.length > 1 ? (
              <nav class="dots" aria-label="Featured products">
                {slides.map((p, i) => <a href={`#slide-${i}`} aria-label={`Show ${p.title}`} />)}
              </nav>
            ) : null}
          </section>
        ) : null}
        <Features items={content.features ?? []} />
        {categories.length ? (
          <section class="wrap sec">
            <div class="sec__head"><h2>Shop by category</h2><a href="/products">View all</a></div>
            <div class="tiles">
              {categories.map((c) => (
                <a class="tile" href={`/collections/${c.slug}`}>
                  <span class="tile__img">{c.image ? <img src={c.image} alt="" loading="lazy" /> : null}</span>
                  {c.name}
                </a>
              ))}
            </div>
          </section>
        ) : null}
        {(sections?.length ? sections : [{ category: null, products }]).map((s) => (
          <section class="wrap sec">
            <div class="sec__head">
              <h2>{s.category ? `Shop ${s.category.name}` : 'New in'}</h2>
              <a href={s.category ? `/collections/${s.category.slug}` : '/products'}>View all</a>
            </div>
            <Grid store={store} products={s.products} />
          </section>
        ))}
        {content.promises?.length ? (
          <section class="promises">
            <div class="wrap promises__in" style={`--n:${Math.min(content.promises.length, 3)}`}>
              {content.promises.map((f, i) => (
                <div class="promise">
                  <span class="feature__icon"><Icon name={iconFor(f.title, i + 2)} /></span>
                  <h3>{raw(f.title)}</h3>
                  <p>{raw(f.text)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <Faq items={content.faq ?? []} />
      </>
    );
  },
  ProductGrid: ({ store, products }) => <Grid store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    const features = (store.content?.features ?? []).slice(0, 3);
    return (
      <>
        <div class="wrap crumbs"><a href="/">Home</a> › <a href="/products">Products</a> › {product.title}</div>
        <div class="wrap pdp">
          <Gallery product={product} image={props.image} />
          <div class="pdp__info">
            <h1>{product.title}</h1>
            {product.ratingCount ? <p><Stars value={product.ratingAvg} count={product.ratingCount} /></p> : null}
            <div class="pdp__price"><Price store={store} product={product} /></div>
            <BuyBox store={store} product={product} label="Add to basket" />
            {features.length ? (
              <div class="assure">
                {features.map((f, i) => <div><Icon name={iconFor(f.title, i)} size={20} /><span><strong>{raw(f.title)}</strong>. {raw(f.text)}</span></div>)}
              </div>
            ) : null}
            <div class="tabs">
              <details open>
                <summary>Description</summary>
                <div class="desc">{product.description}</div>
              </details>
              {(store.content?.faq ?? []).slice(0, 3).map((f) => (
                <details>
                  <summary>{f.q}</summary>
                  <div class="muted">{raw(f.a)}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
        <div class="wrap"><Reviews {...props} /></div>
      </>
    );
  },
  Page: ({ title, children }) => (
    <div class="wrap">
      {title ? <div class="pagehead"><h1>{title}</h1></div> : <div style="height:24px" />}
      <div class="inner">{children}</div>
    </div>
  ),
  pages: {
    faq: {
      title: 'Delivery and FAQ',
      render: ({ store }) => (
        <>
          <div class="wrap pagehead"><h1>Delivery and FAQ</h1></div>
          <Features items={store.content?.features ?? []} />
          <Faq items={store.content?.faq ?? []} />
        </>
      ),
    },
  },
};
