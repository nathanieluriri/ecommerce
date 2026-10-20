import { raw } from 'hono/html';
import type { Category, Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Price, Reviews, Stars, money, priceRange } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500&display=swap';

const pad = (n: number) => String(n).padStart(2, '0');

function catFor(p: Product, categories: Category[]) {
  return categories.find((c) => p.categoryIds?.some((id) => id.toHexString() === c._id.toHexString()));
}

function Card({ store, p, i, eager }: { store: Store; p: Product; i: number; eager?: boolean }) {
  const r = priceRange(p);
  const alt = p.images[1];
  return (
    <a class="card" href={`/products/${p.slug}`}>
      <span class="card__media">
        {p.images[0] ? (
          <img data-vt src={p.images[0]} alt={p.title} width="900" height="1125" loading={eager ? undefined : 'lazy'} decoding="async" data-fade />
        ) : (
          <span class="ph" />
        )}
        {p.images[0] ? <img class={alt ? 'card__alt' : 'card__alt card__alt--crop'} src={alt ?? p.images[0]} alt="" width="900" height="1125" loading="lazy" decoding="async" /> : null}
        {r.compareAt && r.compareAt > r.min ? <span class="tag">Reduced</span> : null}
      </span>
      <span class="card__meta">
        <span class="card__n">{pad(i + 1)}</span>
        <span class="card__t">{p.title}</span>
        <Price store={store} product={p} />
      </span>
    </a>
  );
}

function Grid({ store, products }: { store: Store; products: Product[] }) {
  return (
    <div class="egrid">
      {products.map((p, i) => (
        <div class="egrid__cell" data-reveal="up" style={`--i:${i % 2}`}>
          <Card store={store} p={p} i={i} />
        </div>
      ))}
    </div>
  );
}

function lastWordsItalic(text: string) {
  const words = text.trim().split(/\s+/);
  if (words.length < 4) return <>{text}</>;
  const head = words.slice(0, -2).join(' ');
  const tail = words.slice(-2).join(' ');
  return (
    <>
      {head} <em>{tail}</em>
    </>
  );
}

const css = `
:root{--paper:#f3efe7;--paper2:#ebe5d9;--ink:#171512;--sub:#625d54;--line:rgba(23,21,18,.16);--pad:clamp(16px,4vw,56px);
  --serif:'Instrument Serif','Iowan Old Style',Georgia,serif;--sans:'Inter Tight',ui-sans-serif,system-ui,sans-serif;--ease:cubic-bezier(.2,.7,.1,1)}
html{background:var(--paper)}
body{font-family:var(--sans);font-size:15px;line-height:1.55;color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--serif);font-weight:400;letter-spacing:-.01em;line-height:1;margin:0}
em{font-style:italic}
::selection{background:var(--ink);color:var(--paper)}
:focus-visible{outline:1px solid var(--ink);outline-offset:4px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sr:focus{position:fixed;left:16px;top:16px;width:auto;height:auto;clip:auto;background:var(--ink);color:var(--paper);padding:12px 16px;z-index:60}
.cap{font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
.muted{color:var(--sub);font-size:.92rem}
.ul{background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .6s var(--ease)}
.ul:hover,a:hover>.ul{background-size:100% 1px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;background:var(--ink);color:var(--paper);border:1px solid var(--ink);border-radius:0;font:500 12px var(--sans);letter-spacing:.16em;text-transform:uppercase;cursor:pointer;transition:background .35s,color .35s}
.btn:hover{background:transparent;color:var(--ink)}
.btn:active{transform:scale(.985)}
.btn-ghost{background:transparent;color:var(--ink)}
.btn-ghost:hover{background:var(--ink);color:var(--paper)}
.btn[disabled]{opacity:.4;cursor:not-allowed}
.link{background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
input,select,textarea{font:inherit;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--ink);border-radius:0;padding:12px 2px;min-height:44px}
input:focus,select:focus,textarea:focus{outline:none;border-bottom-width:2px}
textarea{border:1px solid var(--ink)}
select{appearance:none;background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23171512'/%3E%3C/svg%3E") no-repeat right 4px center;padding-right:24px}
.notice{background:var(--ink);color:var(--paper);font-size:13px}

.announce{text-align:center;padding:10px var(--pad);border-bottom:1px solid var(--line);color:var(--sub)}
.hd{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--paper) 92%,transparent);backdrop-filter:blur(8px);transition:transform .5s var(--ease),border-color .3s;border-bottom:1px solid transparent}
.hd.is-scrolled{border-color:var(--line)}
.hd.is-hidden{transform:translateY(-100%)}
.hd__in{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;padding:10px var(--pad)}
.hd nav{display:flex;align-items:center;gap:22px}
.hd nav a,.hd nav summary{display:inline-flex;align-items:center;min-height:44px}
.hd__r{justify-content:flex-end}
.wm{font:400 34px/1 var(--serif);letter-spacing:-.01em}
.wm img{height:34px;width:auto}
.hsearch{display:flex;align-items:center}.hsearch input{border-bottom-color:transparent;width:5.5rem;padding:8px 2px;transition:width .5s var(--ease),border-color .3s;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase}
.hsearch input::placeholder{color:var(--ink)}
.hsearch input:focus{width:12rem;border-bottom:1px solid var(--ink);text-transform:none;letter-spacing:0;font-size:14px}
.bag__n{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:6px;border:1px solid var(--ink);border-radius:50%;font-size:10px;letter-spacing:0}
.menu{display:none}
.menu summary{list-style:none;cursor:pointer}
.menu summary::-webkit-details-marker{display:none}

.hero{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:24px;padding:clamp(28px,6vw,72px) var(--pad) clamp(64px,10vw,140px)}
.hero__eyebrow{grid-column:1/-1;display:flex;justify-content:space-between;color:var(--sub);margin-bottom:clamp(24px,4vw,48px)}
.hero h1{grid-column:1/8;grid-row:2;font-size:clamp(3.1rem,8.6vw,9.4rem);line-height:.9;letter-spacing:-.025em;align-self:start}
.hero h1 em{display:inline}
.frame{position:relative;overflow:hidden;background:var(--paper2)}
.frame img{width:100%;height:100%;object-fit:cover}
.js [data-reveal^=cm]{opacity:1}
.js [data-reveal=cm-clip]>*{clip-path:inset(100% 0 0 0);transition:clip-path 1.4s cubic-bezier(.7,0,.2,1) calc(var(--i,0) * 90ms + var(--d,0ms))}
.js [data-reveal=cm-wipe]>*{clip-path:inset(0 100% 0 0);transition:clip-path 1.6s cubic-bezier(.7,0,.2,1) var(--d,0ms)}
.js [data-reveal^=cm].is-in>*{clip-path:inset(0 0 0 0)}
.js .frame--in img{transform:scale(1.14);transition:transform 2.2s var(--ease)}
.js .is-in .frame--in img{transform:none}
.hero__a{grid-column:8/13;grid-row:2/4;margin-top:clamp(0px,6vw,90px)}
.hero__b{grid-column:4/7;grid-row:3;aspect-ratio:3/4;margin-top:clamp(32px,6vw,96px)}
.hero__txt{grid-column:1/4;grid-row:3;align-self:end;max-width:22rem}
.hero__txt p{margin:0 0 22px;color:var(--sub)}
.hero__cta{display:inline-flex;gap:10px;align-items:center;min-height:44px}
.hero__cta svg{transition:transform .5s var(--ease)}
.hero__cta:hover svg{transform:translateX(6px)}
.fig{display:flex;justify-content:space-between;gap:12px;color:var(--sub);margin-top:10px}

.statement{padding:clamp(56px,10vw,160px) var(--pad);border-top:1px solid var(--line)}
.statement p{font:400 clamp(1.9rem,4.4vw,4.4rem)/1.04 var(--serif);letter-spacing:-.015em;margin:0;max-width:18ch;margin-left:auto;margin-right:8%}
.statement .cap{display:block;color:var(--sub);margin-bottom:28px;margin-left:auto;margin-right:8%;max-width:18ch;font-family:var(--sans)}

.sec{padding:clamp(56px,8vw,120px) var(--pad)}
.sec__h{display:flex;align-items:baseline;justify-content:space-between;gap:16px;border-bottom:1px solid var(--ink);padding-bottom:16px;margin-bottom:8px}
.sec__h h2{font-size:clamp(2.4rem,5vw,4.6rem);letter-spacing:-.02em}
.sec__h h2 sup{font:500 12px var(--sans);letter-spacing:.1em;vertical-align:top;margin-left:6px;position:relative;top:.6em}

.idx{list-style:none;margin:0;padding:0;position:relative}
.idx li{border-bottom:1px solid var(--line)}
.idx a{position:relative;display:grid;grid-template-columns:4.5rem minmax(0,1fr) 12rem 7rem;align-items:baseline;gap:16px;padding:22px 0;transition:opacity .5s var(--ease)}
.idx .n{font-size:12px;letter-spacing:.1em;color:var(--sub)}
.idx .t{font:400 clamp(1.9rem,4.2vw,4rem)/1 var(--serif);letter-spacing:-.015em;transition:transform .7s var(--ease)}
.idx .c{color:var(--sub)}
.idx .price-wrap{text-align:right}
.idx .compare{display:none}
.peek{position:absolute;right:26%;top:50%;width:clamp(150px,15vw,230px);aspect-ratio:4/5;transform:translateY(-50%) rotate(-2deg);pointer-events:none;z-index:2;clip-path:inset(50% 50% 50% 50%);transition:clip-path .7s var(--ease),transform .9s var(--ease);background:var(--paper2)}
.peek img{width:100%;height:100%;object-fit:cover}
@media(hover:hover) and (min-width:861px){
  .idx:hover a{opacity:.32}
  .idx a:hover,.idx a:focus-visible{opacity:1}
  .idx a:hover .t,.idx a:focus-visible .t{transform:translateX(18px);font-style:italic}
  .idx a:hover .peek,.idx a:focus-visible .peek{clip-path:inset(0 0 0 0);transform:translateY(-50%) rotate(0)}
}

.rail__wrap{padding:clamp(56px,8vw,120px) 0;border-top:1px solid var(--line)}
.rail__head{display:flex;justify-content:space-between;align-items:end;gap:16px;padding:0 var(--pad);margin-bottom:32px}
.rail__head h2{font-size:clamp(2.4rem,5vw,4.6rem);letter-spacing:-.02em}
.rail__head p{margin:0;color:var(--sub);max-width:20rem}
.rail{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(240px,27vw,400px);gap:clamp(16px,2vw,28px);overflow-x:auto;scroll-snap-type:x mandatory;padding:0 var(--pad) 18px;scroll-padding:0 var(--pad);scrollbar-width:thin;scrollbar-color:var(--ink) transparent}
.rail>*{scroll-snap-align:start}
.rail>:nth-child(even){margin-top:clamp(24px,5vw,72px)}

.card{display:block}
.card__media{position:relative;display:block;aspect-ratio:4/5;overflow:hidden;background:var(--paper2)}
.card__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .8s var(--ease),transform 1.4s var(--ease)}
.card__alt{opacity:0}
.card__alt--crop{transform:scale(1.65);object-position:60% 40%}
.card:hover .card__alt,.card:focus-visible .card__alt{opacity:1}
.card:hover .card__media img:first-child{transform:scale(1.04)}
.card:hover .card__alt--crop{transform:scale(1.5)}
.ph{position:absolute;inset:0;background:var(--paper2)}
.tag{position:absolute;left:12px;top:12px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;background:var(--paper);padding:5px 8px}
.card__meta{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:baseline;padding:14px 0 0}
.card__n{font-size:11px;letter-spacing:.1em;color:var(--sub)}
.card__t{font:400 22px/1.15 var(--serif)}
.card .price{font-size:13px}
.compare{color:var(--sub);text-decoration:line-through;margin-left:8px;font-size:13px}

.egrid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:24px;row-gap:clamp(48px,7vw,110px);padding:24px 0 40px}
.egrid__cell:nth-child(4n+1){grid-column:1/6}
.egrid__cell:nth-child(4n+2){grid-column:8/13;margin-top:clamp(60px,12vw,200px)}
.egrid__cell:nth-child(4n+3){grid-column:3/8}
.egrid__cell:nth-child(4n+4){grid-column:9/13;margin-top:clamp(40px,8vw,140px)}

.feat{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:24px;padding:0 var(--pad) clamp(56px,8vw,120px)}
.feat__m{grid-column:1/9}.feat .frame{display:block;aspect-ratio:5/4;max-height:86vh}
.feat__txt{grid-column:10/13;align-self:end}
.feat__txt h2{font-size:clamp(2.2rem,4vw,3.8rem);letter-spacing:-.02em;margin:18px 0 18px}
.feat__txt p{color:var(--sub);margin:0 0 24px}

.depts{list-style:none;margin:0;padding:0}
.depts li{border-bottom:1px solid var(--line)}
.depts a{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:14px 0;font:400 clamp(2.6rem,7.5vw,7.4rem)/1 var(--serif);letter-spacing:-.025em}
.depts sup{font:500 12px var(--sans);letter-spacing:.1em;color:var(--sub);vertical-align:top;margin-left:10px;position:relative;top:.8em}
.depts svg{flex:none;width:clamp(28px,4vw,56px);height:auto;opacity:0;transform:translateX(-16px);transition:.6s var(--ease)}
.depts a span{transition:transform .7s var(--ease)}
.depts a:hover span{font-style:italic;transform:translateX(12px)}
.depts a:hover svg,.depts a:focus-visible svg{opacity:1;transform:none}

.ft{border-top:1px solid var(--ink);margin-top:clamp(40px,6vw,80px);padding:clamp(48px,6vw,88px) var(--pad) 24px;overflow:hidden}
.ft__top{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(0,1fr));gap:32px}
.ft h2{font-size:clamp(1.8rem,3vw,2.6rem);letter-spacing:-.01em;max-width:14ch;margin-bottom:22px}
.ft h3{font:500 11.5px var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--sub);margin:0 0 14px}
.ft ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.ft ul a{display:inline-flex;min-height:36px;align-items:center}
.nl{display:flex;gap:0;max-width:28rem;border-bottom:1px solid var(--ink)}
.nl input{flex:1;min-width:0;border:0}
.nl button{background:none;border:0;cursor:pointer;min-height:44px;padding:0 4px}
.nl button svg{transition:transform .5s var(--ease)}
.nl button:hover svg{transform:translateX(6px)}
.ft__wm{display:block;font:400 min(40vw,calc((100vw - 2 * var(--pad)) / (var(--len) * .24)))/0.8 var(--serif);letter-spacing:-.045em;white-space:nowrap;margin:clamp(48px,7vw,96px) 0 clamp(16px,2vw,28px) -.04em}
.ft__base{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;color:var(--sub);border-top:1px solid var(--line);padding-top:18px}
.ft__base a{min-height:44px;display:inline-flex;align-items:center}

.pg{padding:clamp(32px,5vw,72px) var(--pad) 40px}
.pg__t{font-size:clamp(2.8rem,7vw,6.6rem);letter-spacing:-.025em;margin-bottom:clamp(24px,4vw,48px)}
.pg__b>.muted:first-child{max-width:40rem}
.pg__b h1{font-size:clamp(2rem,4vw,3.4rem);margin-bottom:12px}
.pg__b h2,.pg__b h3{font-size:2rem;margin:1.6rem 0 .8rem}
.listing-bar{border-bottom:1px solid var(--line);padding-bottom:14px;font-size:13px;color:var(--sub)}
.listing-bar select{min-height:40px;padding-top:6px;padding-bottom:6px}
.pager a{min-height:44px;display:inline-flex;align-items:center;text-decoration:underline;text-underline-offset:3px}
.cart-table{border-top:1px solid var(--ink)}
.cart-table tr{border-bottom:1px solid var(--line)}
.cart-table td{padding:18px 8px}
.cart-table a{font:400 24px/1.1 var(--serif)}
.cart-img{width:96px}.cart-img img{width:88px;height:110px;object-fit:cover;background:var(--paper2)}
.cart-table input{width:4rem;text-align:center}
.cart-table .link{font-size:24px;text-decoration:none;min-width:44px;min-height:44px}
.totals{font-size:15px}.totals .total{font:400 28px var(--serif)}
.checkout-form input{border-bottom:1px solid var(--ink)}
.empty p{font:400 clamp(2rem,5vw,3.6rem)/1 var(--serif);margin:0 0 28px}
.empty p::after{content:'';display:block;width:56px;height:1px;background:var(--ink);margin:28px auto 0}
.order-done h1{font-size:clamp(2.2rem,5vw,4rem);margin-bottom:12px}
.order-lines li{border-bottom:1px solid var(--line)}
.stars{color:var(--ink);letter-spacing:2px;font-size:13px}

.crumbs{display:flex;gap:10px;color:var(--sub);margin-bottom:28px}
.crumbs a:hover{color:var(--ink)}
.pdp{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:clamp(32px,5vw,88px);padding:24px var(--pad) 40px}
.pdp__media{display:grid;gap:clamp(12px,1.6vw,24px)}
.pdp__media .thumbs{display:none}
.pdp__media .gallery-main,.pdp__media .frame{aspect-ratio:4/5;width:100%;object-fit:cover;background:var(--paper2)}
.pdp__media figure{margin:0}
.pdp__media figcaption{margin-top:10px;color:var(--sub)}
.pdp__pair{display:grid;grid-template-columns:1fr 1fr;gap:clamp(12px,1.6vw,24px);align-items:start}
.pdp__pair>:nth-child(2){margin-top:22%}
.frame--crop img{transform:scale(1.7);object-position:60% 40%}
.frame--crop2 img{transform:scale(2.2);object-position:30% 70%}
.pdp__info{position:sticky;top:96px;align-self:start;padding-top:8px}
.pdp__info h1{font-size:clamp(2.8rem,5vw,5.2rem);letter-spacing:-.025em;line-height:.95;margin:10px 0 18px}
.pdp__price{font-size:18px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px}
.pdp__price a{color:var(--sub)}
.pdp__desc{white-space:pre-line;color:var(--sub);font-size:15.5px;line-height:1.7;max-width:34rem;margin:0 0 8px}
.buy{gap:18px;margin:28px 0}
.buy .field span{font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--sub)}
.buy select{width:100%;max-width:none}
.buy-row{gap:12px}
.buy-row input[type=number]{width:72px;text-align:center;border:1px solid var(--ink);min-height:52px}
.buy-row .btn{flex:1}
.acc{border-top:1px solid var(--ink);margin-top:12px}
.acc details{border-bottom:1px solid var(--line)}
.acc summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;min-height:56px}
.acc summary::-webkit-details-marker{display:none}
.acc summary::after{content:'';width:11px;height:11px;background:linear-gradient(var(--ink),var(--ink)) center/100% 1px no-repeat,linear-gradient(var(--ink),var(--ink)) center/1px 100% no-repeat;transition:transform .4s var(--ease)}
.acc details[open] summary::after{transform:rotate(45deg)}
.acc .acc__b{color:var(--sub);padding:0 0 20px;max-width:34rem}
.acc .acc__b p{margin:0 0 8px}
.rev{padding:clamp(48px,6vw,96px) var(--pad);border-top:1px solid var(--line)}
.reviews{margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:0 clamp(32px,6vw,96px)}
.reviews>*{grid-column:2}
.reviews h2{grid-column:1;grid-row:1/span 3;font-size:clamp(2.4rem,5vw,4.6rem);letter-spacing:-.02em}
.review{padding:24px 0;border-bottom:1px solid var(--line)}
.review strong{font:400 22px var(--serif);display:block;margin:6px 0 4px}
.review-form h3{font-size:2rem}

@keyframes cm-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.js .hero__eyebrow{animation:cm-up 1s .2s var(--ease) both}

@media(max-width:1100px){.ft__top{grid-template-columns:1fr 1fr}.ft__top>:first-child{grid-column:1/-1}}
@media(max-width:860px){
  .hd__in{grid-template-columns:auto 1fr auto;gap:8px}
  .hd .hd__l,.hd__r .hsearch,.hd__r .acct{display:none}
  .menu{display:block;position:relative}
  .menu summary{min-height:44px;display:inline-flex;align-items:center;gap:8px}
  .menu__p{position:absolute;left:calc(var(--pad) * -1);top:100%;width:100vw;background:var(--paper);border-bottom:1px solid var(--ink);padding:16px var(--pad) 24px;display:grid;gap:2px}
  .menu__p a{font:400 34px/1.2 var(--serif);min-height:48px;display:flex;align-items:center}
  .menu__p form input{width:100%;margin-top:12px}
  .wm{justify-self:center;font-size:28px}
  .hd__r{gap:12px}
  .hero{grid-template-columns:repeat(6,minmax(0,1fr));column-gap:12px}
  .hero h1{grid-column:1/-1;margin-bottom:28px}
  .hero__a{grid-column:1/6;grid-row:3;margin-top:0}
  .hero__b{grid-column:4/7;grid-row:4;margin-top:-48px;z-index:1;border:6px solid var(--paper)}
  .hero__txt{grid-column:1/4;grid-row:4;align-self:start;padding-top:24px}
  .statement p,.statement .cap{margin-right:0}
  .idx a{grid-template-columns:2.5rem minmax(0,1fr) auto;padding:18px 0}
  .idx .c{display:none}
  .peek{display:none}
  .egrid{grid-template-columns:1fr 1fr;column-gap:12px;row-gap:40px}
  .egrid__cell:nth-child(n){grid-column:auto;margin-top:0}
  .egrid__cell:nth-child(even){margin-top:56px}
  .card__meta{grid-template-columns:1fr;gap:4px}
  .card__t{font-size:19px}
  .rail{grid-auto-columns:72%}
  .feat__m{grid-column:1/-1}
  .feat__txt{grid-column:1/-1;padding-top:24px}
  .pdp{grid-template-columns:1fr;padding-top:8px}
  .pdp__media{grid-auto-flow:column;grid-auto-columns:86%;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 calc(var(--pad) * -1);padding:0 var(--pad);scroll-padding:0 var(--pad)}
  .pdp__media>*{scroll-snap-align:start}
  .pdp__pair{display:contents}
  .pdp__pair>:nth-child(2){margin-top:0}
  .pdp__media figcaption{display:none}
  .pdp__info{position:static}
  .reviews{grid-template-columns:1fr}
  .reviews>*,.reviews h2{grid-column:1;grid-row:auto}
  .reviews h2{margin-bottom:12px}
  .ft__top{grid-template-columns:1fr 1fr}
  .cart-table a{font-size:19px}
  .cart-img{width:72px}.cart-img img{width:64px;height:80px}
}
@media(prefers-reduced-motion:reduce){.js .hero__eyebrow{animation:none}.js [data-reveal^=cm]>*{clip-path:none!important}.js .frame--in img{transform:none}}
`;

const Arrow = ({ w = 28 }: { w?: number }) => (
  <svg width={w} height={Math.round(w * 0.43)} viewBox="0 0 28 12" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
    <path d="M0 6h27M22 1l5 5-5 5" />
  </svg>
);

export const minimal: Theme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Gallery minimalism: warm paper, serif display type, an asymmetric editorial grid and slow image reveals.',
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const logo = store.themeSettings.logoUrl;
    const year = new Date().getFullYear();
    return (
      <html lang="en">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <a class="sr" href="#main">Skip to content</a>
          {store.themeSettings.announcement ? <div class="announce cap">{store.themeSettings.announcement}</div> : null}
          <Notice text={notice} />
          <header class="hd" data-hide-on-scroll>
            <div class="hd__in">
              <nav class="hd__l cap" aria-label="Collections">
                <a href="/products"><span class="ul">Index</span></a>
                {categories.slice(0, 4).map((c) => <a href={`/collections/${c.slug}`}><span class="ul">{c.name}</span></a>)}
              </nav>
              <details class="menu cap">
                <summary aria-label="Menu">Menu</summary>
                <div class="menu__p">
                  <a href="/products">Index</a>
                  {categories.map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
                  <a href="/account">{customer ? 'Account' : 'Sign in'}</a>
                  <form method="get" action="/search" role="search">
                    <input type="search" name="q" placeholder="Search" aria-label="Search products" />
                  </form>
                </div>
              </details>
              <a class="wm" href="/" aria-label={`${store.name} home`}>
                {logo ? <img src={logo} alt={store.name} /> : store.name}
              </a>
              <nav class="hd__r cap" aria-label="Account">
                <form class="hsearch" method="get" action="/search" role="search">
                  <input type="search" name="q" placeholder="Search" aria-label="Search products" />
                </form>
                <a class="acct" href="/account"><span class="ul">{customer ? 'Account' : 'Sign in'}</span></a>
                <a href="/cart" aria-label={`Bag, ${cartCount} items`}>
                  <span class="ul">Bag</span>
                  <span class="bag__n">{cartCount}</span>
                </a>
              </nav>
            </div>
          </header>
          <main id="main">{children}</main>
          <footer class="ft">
            <div class="ft__top">
              <div>
                <h2>Occasional letters from the studio.</h2>
                <form method="post" action="/subscribe" class="nl">
                  <label class="sr" for="nl-email">Email address</label>
                  <input id="nl-email" type="email" name="email" placeholder="Your email address" required />
                  <button type="submit" aria-label="Subscribe"><Arrow /></button>
                </form>
                <p class="muted">New objects and the occasional essay. Never more than once a month.</p>
              </div>
              <div>
                <h3>Collections</h3>
                <ul>
                  <li><a href="/products"><span class="ul">Index</span></a></li>
                  {categories.slice(0, 6).map((c) => <li><a href={`/collections/${c.slug}`}><span class="ul">{c.name}</span></a></li>)}
                </ul>
              </div>
              <div>
                <h3>Service</h3>
                <ul>
                  <li><a href="/pages/care"><span class="ul">Shipping and care</span></a></li>
                  <li><a href="/track"><span class="ul">Track an order</span></a></li>
                  <li><a href="/cart"><span class="ul">Your bag</span></a></li>
                  <li><a href="/account"><span class="ul">{customer ? 'Account' : 'Sign in'}</span></a></li>
                </ul>
              </div>
              <div>
                <h3>Studio</h3>
                <ul>
                  <li><a href="/pages/about"><span class="ul">About</span></a></li>
                  {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}><span class="ul">Write to us</span></a></li> : null}
                </ul>
              </div>
            </div>
            <div data-reveal="cm-clip" aria-hidden="true"><span class="ft__wm" style={`--len:${Math.max(4, store.name.length)}`}>{store.name}</span></div>
            <div class="ft__base cap">
              <span>{raw('&copy;')} {year} {store.name}</span>
              <a href="#main"><span class="ul">Back to top</span></a>
            </div>
          </footer>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories }) => {
    const tagline = store.themeSettings.tagline ?? 'A small collection of considered things.';
    const [a, b, c] = [products[0], products[1] ?? products[0], products[2] ?? products[0]];
    const season = new Date();
    const ss = season.getMonth() >= 2 && season.getMonth() < 8 ? 'Spring / Summer' : 'Autumn / Winter';
    const statement = store.content?.heroText ?? 'Fewer, better things. Chosen for how they wear, how they age and how often you reach for them.';
    const counts = categories.map((cat) => ({ cat, n: products.filter((p) => catFor(p, [cat])).length, }));
    return (
      <>
        <section class="hero">
          <div class="hero__eyebrow cap"><span>Collection N{raw('&ordm;')}{pad(products.length)}</span><span>{ss} {season.getFullYear()}</span></div>
          <h1 class="split">{lastWordsItalic(store.content?.heroTitle ?? tagline)}</h1>
          {a?.images[0] ? (
            <a class="hero__a" href={`/products/${a.slug}`} aria-label={a.title} data-reveal="cm-clip">
              <span class="frame frame--in" style="display:block;aspect-ratio:4/5">
                <img data-vt src={a.images[0]} alt={a.title} width="900" height="1125" fetchpriority="high" />
              </span>
              <span class="fig cap"><span>{pad(1)} {a.title}</span><Price store={store} product={a} /></span>
            </a>
          ) : null}
          {b?.images[0] && b !== a ? (
            <a class="hero__b" href={`/products/${b.slug}`} aria-label={b.title} data-reveal="cm-clip" style="--d:350ms">
              <span class="frame frame--in" style="display:block;height:100%">
                <img data-vt src={b.images[0]} alt={b.title} width="900" height="1200" />
              </span>
            </a>
          ) : null}
          <div class="hero__txt" data-reveal="up" style="--d:500ms">
            <p>Objects for daily use, made in small runs and kept in stock for as long as they are made well.</p>
            <a class="hero__cta cap" href="/products"><span class="ul">Enter the index</span><Arrow /></a>
          </div>
        </section>

        <section class="statement">
          <span class="cap">Our approach</span>
          <p class="split">{statement}</p>
        </section>

        {products.length ? (
          <section class="sec" aria-labelledby="idx-h">
            <div class="sec__h">
              <h2 id="idx-h" class="split">Index<sup>({pad(products.length)})</sup></h2>
              <a class="cap" href="/products"><span class="ul">View all</span></a>
            </div>
            <ol class="idx" data-stagger="up">
              {products.slice(0, 8).map((p, i) => (
                <li>
                  <a href={`/products/${p.slug}`}>
                    <span class="n">{pad(i + 1)}</span>
                    <span class="t">{p.title}</span>
                    <span class="c cap">{catFor(p, categories)?.name ?? ''}</span>
                    <Price store={store} product={p} />
                    {p.images[0] ? <span class="peek" aria-hidden="true"><img src={p.images[0]} alt="" loading="lazy" width="230" height="288" /></span> : null}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {products.length > 1 ? (
          <section class="rail__wrap" aria-labelledby="rail-h">
            <div class="rail__head">
              <h2 id="rail-h" class="split">Objects</h2>
              <p>Scroll the shelf. Hover to look closer.</p>
            </div>
            <div class="rail" tabindex={0} role="region" aria-label="Objects, scrollable">
              {products.map((p, i) => <Card store={store} p={p} i={i} />)}
            </div>
          </section>
        ) : null}

        {c?.images[0] ? (
          <section class="feat" aria-labelledby="feat-h">
            <div class="feat__m" data-reveal="cm-wipe">
              <a class="frame" href={`/products/${c.slug}`} aria-label={c.title}>
                <img data-zoom-on-scroll src={c.images[0]} alt="" loading="lazy" width="1200" height="960" />
              </a>
            </div>
            <div class="feat__txt">
              <span class="cap muted">In focus</span>
              <h2 id="feat-h" class="split">Made to be <em>worn in</em>, not worn out.</h2>
              <p>{c.title}. {money(store, priceRange(c).min)}. A piece we return to again and again, built to be used every day.</p>
              <a class="btn btn-ghost" href={`/products/${c.slug}`}>Discover</a>
            </div>
          </section>
        ) : null}

        {categories.length ? (
          <section class="sec" aria-labelledby="dep-h">
            <div class="sec__h"><h2 id="dep-h" class="split">Departments</h2></div>
            <ul class="depts" data-stagger="up">
              {counts.map(({ cat, n }) => (
                <li>
                  <a href={`/collections/${cat.slug}`}>
                    <span>{cat.name}{n ? <sup>({pad(n)})</sup> : null}</span>
                    <Arrow w={56} />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    );
  },
  ProductGrid: ({ store, products }) => <Grid store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    const others = product.images.filter((_, i) => i !== props.image && !(props.image >= product.images.length && i === 0));
    const src = product.images[0];
    const free = store.freeShippingOver;
    return (
      <>
        <div class="pdp">
          <div class="pdp__media">
            <Gallery product={product} image={props.image} />
            {others.length ? (
              others.map((s, i) => (
                <figure class="frame" data-reveal="cm-clip" style={`--i:${i}`}>
                  <img src={s} alt={`${product.title}, view ${i + 2}`} loading="lazy" width="900" height="1125" />
                </figure>
              ))
            ) : src ? (
              <div class="pdp__pair">
                <figure>
                  <div data-reveal="cm-clip"><div class="frame frame--crop"><img src={src} alt={`${product.title}, detail`} loading="lazy" width="900" height="1125" /></div></div>
                  <figcaption class="cap">Detail</figcaption>
                </figure>
                <figure>
                  <div data-reveal="cm-clip" style="--d:200ms"><div class="frame frame--crop2"><img src={src} alt={`${product.title}, close up`} loading="lazy" width="900" height="1125" /></div></div>
                  <figcaption class="cap">Texture</figcaption>
                </figure>
              </div>
            ) : null}
          </div>
          <aside class="pdp__info">
            <nav class="crumbs cap" aria-label="Breadcrumb"><a href="/products">Index</a><span aria-hidden="true">/</span><span>{product.title}</span></nav>
            <h1 class="split">{product.title}</h1>
            <div class="pdp__price">
              <Price store={store} product={product} />
              {product.ratingCount ? <a href="#reviews"><Stars value={product.ratingAvg} count={product.ratingCount} /></a> : null}
            </div>
            <p class="pdp__desc">{product.description}</p>
            <BuyBox store={store} product={product} label="Add to bag" />
            <div class="acc">
              <details>
                <summary class="cap">Shipping and returns</summary>
                <div class="acc__b">
                  <p>{free ? `Complimentary shipping on orders over ${money(store, free)}.` : 'Shipped carefully, tracked to your door.'} Dispatched within two working days.</p>
                  <p>Returns accepted within 30 days, unworn and in original packaging.</p>
                </div>
              </details>
              <details>
                <summary class="cap">Care</summary>
                <div class="acc__b"><p>Keep away from direct sunlight when not in use. Wipe clean with a soft, dry cloth. Store in the pouch provided.</p></div>
              </details>
              {store.supportEmail ? (
                <details>
                  <summary class="cap">Questions</summary>
                  <div class="acc__b"><p>Write to <a class="link" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a> and a person will reply within a day.</p></div>
                </details>
              ) : null}
            </div>
          </aside>
        </div>
        <div class="rev"><Reviews {...props} /></div>
      </>
    );
  },
  Page: ({ title, children }) => (
    <div class="pg">
      {title ? <h1 class="pg__t split">{title}</h1> : null}
      <div class="pg__b">{children}</div>
    </div>
  ),
  pages: {
    about: {
      title: 'About',
      description: 'A small studio of considered things.',
      render: ({ store }) => (
        <div class="pg">
          <h1 class="pg__t split">About</h1>
          <div class="statement" style="border:0;padding-left:0;padding-right:0">
            <p class="split" style="margin-left:0">{store.themeSettings.tagline ?? store.name}</p>
          </div>
          <p class="muted" style="max-width:36rem">{store.name} keeps a short list of objects made for daily use. Each one is chosen slowly, tested for a season and only then added to the index.</p>
          <p><a class="btn" href="/products">Enter the index</a></p>
        </div>
      ),
    },
    care: {
      title: 'Shipping and care',
      render: ({ store }) => (
        <div class="pg">
          <h1 class="pg__t split">Shipping and care</h1>
          <div class="acc" style="max-width:44rem">
            <details open>
              <summary class="cap">Shipping</summary>
              <div class="acc__b"><p>{store.freeShippingOver ? `Complimentary shipping on orders over ${money(store, store.freeShippingOver)}.` : 'Every order is tracked to your door.'} Orders leave the studio within two working days.</p></div>
            </details>
            <details>
              <summary class="cap">Returns</summary>
              <div class="acc__b"><p>Returns are accepted within 30 days, unworn and in original packaging.</p></div>
            </details>
            <details>
              <summary class="cap">Care</summary>
              <div class="acc__b"><p>Wipe clean with a soft, dry cloth and store away from direct sunlight.</p></div>
            </details>
          </div>
        </div>
      ),
    },
  },
};
