import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { Category, Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Price, Reviews, Stars, inStock, money, priceRange } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

const PATHS: Record<string, Child> = {
  truck: <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01" />,
  return: <path d="M4 10h11a5 5 0 0 1 0 10H9M4 10l4-4M4 10l4 4" />,
  lock: <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" />,
  chat: <path d="M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5" />,
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />,
  user: <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />,
  bag: <path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

const Spark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c.6 5.6 5.4 10.4 11 11-5.6.6-10.4 5.4-11 11-.6-5.6-5.4-10.4-11-11C6.6 11.4 11.4 6.6 12 1z" fill="currentColor" /></svg>
);

const inCat = (p: Product, c: Category) => p.categoryIds?.some((id) => id.toHexString() === c._id.toHexString());
const TINTS = ['sky', 'peach', 'sand', 'mint'];

function accentHeading(text: string) {
  const i = text.indexOf(',');
  if (i > 0 && i < text.length - 2) return <>{text.slice(0, i + 1)} <em>{text.slice(i + 1).trim()}</em></>;
  const w = text.trim().split(/\s+/);
  if (w.length < 3) return <>{text}</>;
  return <>{w.slice(0, -2).join(' ')} <em>{w.slice(-2).join(' ')}</em></>;
}

function Card({ store, p, eager }: { store: Store; p: Product; eager?: boolean }) {
  const r = priceRange(p);
  const sale = r.compareAt && r.compareAt > r.min ? Math.round((1 - r.min / r.compareAt) * 100) : 0;
  const simple = !p.variants.length && inStock(p);
  return (
    <article class="card">
      <div class="card__media">
        <a href={`/products/${p.slug}`} tabindex={-1} aria-hidden="true">
          {p.images[0] ? <img data-vt src={p.images[0]} alt="" width="600" height="600" loading={eager ? undefined : 'lazy'} decoding="async" data-fade /> : <span class="card__ph" />}
          {p.images[1] ? <img class="card__alt" src={p.images[1]} alt="" width="600" height="600" loading="lazy" decoding="async" /> : null}
        </a>
        {sale ? <span class="badge">-{sale}%</span> : !inStock(p) ? <span class="badge badge--mute">Sold out</span> : null}
        <div class="qa">
          {simple ? (
            <form method="post" action="/cart/add">
              <input type="hidden" name="productId" value={p._id.toHexString()} />
              <input type="hidden" name="quantity" value="1" />
              <button class="qa__btn" type="submit" aria-label={`Quick add ${p.title} to cart`}><Icon name="plus" size={18} /><span>Quick add</span></button>
            </form>
          ) : inStock(p) ? (
            <a class="qa__btn" href={`/products/${p.slug}`} aria-label={`Choose options for ${p.title}`}><Icon name="arrow" size={18} /><span>Choose options</span></a>
          ) : null}
        </div>
      </div>
      <div class="card__body">
        <h3 class="card__t"><a href={`/products/${p.slug}`}>{p.title}</a></h3>
        {p.ratingCount ? <Stars value={p.ratingAvg} count={p.ratingCount} /> : null}
        <Price store={store} product={p} />
      </div>
    </article>
  );
}

function Grid({ store, products }: { store: Store; products: Product[] }) {
  return (
    <div class="grid" data-stagger="up">
      {products.map((p) => <Card store={store} p={p} />)}
    </div>
  );
}

function promisesFor(store: Store) {
  const own = store.content?.promises?.map((p) => p.title) ?? [];
  if (own.length) return own;
  return [
    store.freeShippingOver ? `Free shipping over ${money(store, store.freeShippingOver).replace(/\.00$/, '')}` : 'Tracked shipping',
    '30-day easy returns',
    'Secure checkout',
    'Real people on support',
    'Packed with care',
  ];
}

const css = `
:root{--a:var(--accent);--ink:#1c1a3a;--sub:#5a5770;--cream:#fbf7f0;--paper:#fff;--line:#e9e2d4;
  --sky:#dfe3f7;--peach:#f8dcc7;--sand:#f1e7d6;--mint:#d9ede3;--sun:#f3b443;--r:22px;
  --sans:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;--serif:'Fraunces',Georgia,serif;--ease:cubic-bezier(.2,.8,.2,1)}
body{font-family:var(--sans);color:var(--ink);background:var(--cream);font-size:15.5px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-weight:800;letter-spacing:-.025em;line-height:1.05;margin:0}
h1 em,h2 em{font-family:var(--serif);font-weight:400;font-style:italic;letter-spacing:-.01em;color:var(--a)}
.wrap{max-width:1280px;margin:0 auto;padding:0 clamp(16px,3vw,32px)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sr:focus{position:fixed;left:12px;top:12px;width:auto;height:auto;clip:auto;background:var(--a);color:#fff;padding:12px 16px;border-radius:12px;z-index:70}
:focus-visible{outline:2.5px solid var(--a);outline-offset:3px;border-radius:10px}
.muted{color:var(--sub);font-size:.93rem}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--a)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;background:var(--a);color:#fff;border:0;border-radius:999px;font:700 15px var(--sans);cursor:pointer;transition:transform .25s var(--ease),box-shadow .25s,background .25s;box-shadow:0 10px 24px -12px var(--a)}
.btn:hover{transform:translateY(-2px);box-shadow:0 16px 30px -14px var(--a)}
.btn:active{transform:translateY(0) scale(.98)}
.btn svg{transition:transform .3s var(--ease)}
.btn:hover svg{transform:translateX(3px)}
.btn-ghost{background:var(--paper);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}
.btn-ghost:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
.btn[disabled]{opacity:.45;cursor:not-allowed;transform:none}
.link{background:none;border:0;padding:0;color:var(--a);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
input,select,textarea{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;min-height:48px;transition:border-color .2s,box-shadow .2s}
select{appearance:none;background:var(--paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%231c1a3a' stroke-width='1.8'/%3E%3C/svg%3E") no-repeat right 16px center;padding-right:40px}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 4px color-mix(in srgb,var(--a) 14%,transparent)}
.notice{background:var(--ink);color:#fff;font-weight:600}

.topbar{background:var(--a);color:#fff;font-size:13px;font-weight:500}
.topbar .wrap{display:flex;justify-content:space-between;gap:16px;align-items:center;min-height:38px}
.topbar nav{display:flex;gap:18px;opacity:.9}
.topbar nav a:hover{text-decoration:underline}
.hd{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--cream) 90%,transparent);backdrop-filter:blur(12px);transition:transform .45s var(--ease),box-shadow .3s}
.hd.is-scrolled{box-shadow:0 1px 0 var(--line),0 12px 30px -24px rgba(28,26,58,.4)}
.hd.is-hidden{transform:translateY(-100%)}
.hd__in{display:flex;align-items:center;gap:20px;height:76px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:19px;letter-spacing:-.02em;margin-right:12px;white-space:nowrap}
.logo img{height:40px;width:auto}
.logo__mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--a);color:#fff;font:italic 500 22px var(--serif);transition:transform .5s var(--ease)}
.logo:hover .logo__mark{transform:rotate(-8deg) scale(1.05)}
.nav{display:flex;gap:4px}
.nav a{padding:10px 14px;border-radius:999px;font-weight:600;font-size:14.5px;transition:background .2s,color .2s}
.nav a:hover{background:var(--paper);color:var(--a)}
.hsearch{position:relative;margin-left:auto;flex:0 1 260px}
.hsearch input{width:100%;border-radius:999px;padding-left:42px;background:var(--paper);min-height:44px}
.hsearch svg{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--sub)}
.hicon{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;transition:background .2s}
.hicon:hover{background:var(--paper)}
.cartbtn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px 0 14px;border-radius:999px;background:var(--ink);color:#fff;font-weight:700;font-size:14px;transition:transform .25s var(--ease)}
.cartbtn:hover{transform:translateY(-1px)}
.cartbtn__n{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:var(--sun);color:var(--ink);font-size:12px}
.js .cartbtn__n.has{animation:pop .6s .4s var(--ease) both}
@keyframes pop{0%{transform:scale(.4)}60%{transform:scale(1.2)}100%{transform:none}}
.chips{display:none}

.hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:clamp(28px,5vw,72px);align-items:center;padding-top:clamp(24px,4vw,56px);padding-bottom:clamp(40px,6vw,88px)}
.hero h1{font-size:clamp(2.9rem,6.4vw,6rem);margin:18px 0 22px}
.hero h1 em{display:inline}
.hero__lede{font-size:clamp(1.05rem,1.4vw,1.2rem);color:var(--sub);max-width:31rem;margin:0 0 30px}
.hero__ctas{display:flex;gap:12px;flex-wrap:wrap}
.trust{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:34px;padding-top:24px;border-top:1px solid var(--line);font-size:14px;font-weight:600}
.trust span{display:inline-flex;align-items:center;gap:8px}
.trust svg{color:var(--a)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--sun);box-shadow:0 0 0 4px color-mix(in srgb,var(--sun) 30%,transparent)}
.js .dot{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 8px color-mix(in srgb,var(--sun) 0%,transparent)}}
.hv{position:relative;padding:0 0 28px 28px}
.hv__frame{position:relative;aspect-ratio:4/4.6;border-radius:32px;overflow:hidden;background:var(--a)}
.hv__frame img{position:absolute;left:0;top:-8%;width:100%;height:116%;object-fit:cover}
.hv__card{position:absolute;left:0;bottom:0;display:flex;align-items:center;gap:14px;background:var(--paper);border-radius:20px;padding:12px 18px 12px 12px;box-shadow:0 24px 50px -24px rgba(28,26,58,.45);max-width:300px;transition:transform .35s var(--ease)}
.hv__card:hover{transform:translateY(-4px)}
.hv__card img{width:64px;height:64px;border-radius:14px;object-fit:cover;background:var(--sand)}
.hv__card strong{display:block;font-size:14.5px;line-height:1.25}
.hv__card .price{color:var(--a);font-weight:700;font-size:14px}
.hv__card .compare{display:none}
.badge-rot{position:absolute;right:-14px;top:-14px;width:118px;height:118px;color:var(--ink)}
.badge-rot svg.ring{width:100%;height:100%}
.js .badge-rot svg.ring{animation:spin 18s linear infinite}
.badge-rot .core{position:absolute;inset:30%;display:grid;place-items:center;border-radius:50%;background:var(--sun);color:var(--ink)}
@keyframes spin{to{transform:rotate(360deg)}}

.band{background:var(--a);color:#fff;padding:22px 0;--gap:2.4rem}
.band .marquee__track{align-items:center}
.band span{display:inline-flex;align-items:center;gap:2.4rem;font-weight:800;font-size:clamp(1.2rem,2.2vw,1.75rem);letter-spacing:-.02em;white-space:nowrap}
.band em{font:italic 400 1.1em var(--serif)}
.band svg{color:var(--sun)}

.sec{padding-top:clamp(56px,8vw,112px)}
.sec__h{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:28px}
.sec__h h2{font-size:clamp(2rem,4vw,3.4rem)}
.sec__h p{margin:10px 0 0;color:var(--sub);max-width:30rem}
.more{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--a);min-height:44px;white-space:nowrap}
.more svg{transition:transform .3s var(--ease)}
.more:hover svg{transform:translateX(4px)}

.cats{display:grid;grid-template-columns:1.3fr 1fr;grid-auto-rows:minmax(250px,auto);gap:18px}
.cat{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:260px;padding:24px;border-radius:var(--r);overflow:hidden;isolation:isolate}
.cat:first-child{grid-row:span 2;min-height:540px}
.cat--sky{background:var(--sky)}.cat--peach{background:var(--peach)}.cat--sand{background:var(--sand)}.cat--mint{background:var(--mint)}
.cat__img{position:absolute;right:-4%;bottom:-14%;width:52%;aspect-ratio:1;border-radius:50%;overflow:hidden;z-index:-1;transition:transform .8s var(--ease);box-shadow:0 30px 50px -30px rgba(28,26,58,.5)}
.cat:first-child .cat__img{width:84%;right:-10%;bottom:-10%}
.cat__img img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.cat:hover .cat__img{transform:translate(-4%,-4%) rotate(-3deg)}
.cat:hover .cat__img img{transform:scale(1.1)}
.cat h3{font:italic 400 clamp(1.8rem,3vw,2.8rem)/1 var(--serif);letter-spacing:-.01em;max-width:60%}
.cat__n{font-size:13px;font-weight:600;color:var(--sub);margin-top:8px;display:block}
.cat__go{display:inline-grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--paper);color:var(--ink);transition:transform .45s var(--ease),background .3s,color .3s}
.cat:hover .cat__go{transform:rotate(-45deg);background:var(--a);color:#fff}

.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}
.card{position:relative;display:flex;flex-direction:column;background:var(--paper);border-radius:var(--r);padding:10px;transition:transform .35s var(--ease),box-shadow .35s}
.card:hover{transform:translateY(-4px);box-shadow:0 26px 40px -30px rgba(28,26,58,.45)}
.card__media{position:relative;aspect-ratio:1;border-radius:16px;overflow:hidden;background:var(--sand)}
.card__media>a{position:absolute;inset:0}
.card__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .9s var(--ease),opacity .5s}
.card:hover .card__media img{transform:scale(1.06)}
.card__alt{opacity:0}.card:hover .card__alt{opacity:1}
.card__ph{position:absolute;inset:0;background:var(--sand)}
.badge{position:absolute;left:10px;top:10px;background:var(--sun);color:var(--ink);font-size:12px;font-weight:800;padding:5px 10px;border-radius:999px}
.badge--mute{background:var(--paper);color:var(--sub)}
.qa{position:absolute;left:10px;right:10px;bottom:10px;transform:translateY(calc(100% + 14px));transition:transform .45s var(--ease)}
.card:hover .qa,.card:focus-within .qa{transform:none}
.qa__btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;min-height:46px;border:0;border-radius:999px;background:var(--ink);color:#fff;font:700 14px var(--sans);cursor:pointer;transition:background .2s}
.qa__btn:hover{background:var(--a)}
.card__body{display:flex;flex-direction:column;gap:4px;padding:14px 8px 8px}
.card__t{font-size:16px;font-weight:700;letter-spacing:-.01em;line-height:1.3}
.card__t a::after{content:'';position:absolute;inset:0;z-index:0}
.card .qa,.card .badge{z-index:1}
.price{font-weight:800;color:var(--a);font-size:16px}
.compare{color:var(--sub);text-decoration:line-through;margin-left:8px;font-weight:500;font-size:14px}
.stars{color:var(--sun);font-size:13px;letter-spacing:1px}

.edit{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(28px,5vw,72px);align-items:center}
.edit__img{position:relative;border-radius:28px;overflow:hidden;aspect-ratio:5/4;background:var(--sand)}
.edit__img img{width:100%;height:100%;object-fit:cover}
.edit__tag{position:absolute;left:18px;top:18px;background:var(--paper);border-radius:999px;padding:8px 14px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.edit h2{font-size:clamp(2.2rem,4.4vw,4rem);margin:14px 0 18px}
.edit p{color:var(--sub);margin:0 0 24px;max-width:30rem}
.edit ol{list-style:none;margin:0 0 28px;padding:0;border-top:1px solid var(--line)}
.edit li a{display:grid;grid-template-columns:auto 56px 1fr auto;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);transition:padding .3s var(--ease)}
.edit li a:hover{padding-left:8px}
.edit li img{width:56px;height:56px;border-radius:12px;object-fit:cover;background:var(--sand)}
.edit li b{font:italic 400 20px var(--serif);color:var(--a)}
.edit li strong{font-weight:700}
.edit li .compare{display:none}

.quote{position:relative;background:var(--sand);border-radius:32px;padding:clamp(32px,6vw,80px);display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:clamp(28px,5vw,64px);align-items:center;overflow:hidden}
.quote__mark{font:italic 400 160px/0.6 var(--serif);color:var(--a);opacity:.18;position:absolute;left:24px;top:56px;pointer-events:none}
.quote blockquote{margin:0;position:relative}
.quote blockquote p{font:italic 400 clamp(1.6rem,3.2vw,2.6rem)/1.2 var(--serif);letter-spacing:-.01em;margin:0 0 20px}
.quote cite{font-style:normal;font-weight:700;font-size:14px}
.quote cite span{color:var(--sub);font-weight:500}
.stats{display:grid;gap:14px}
.stat{background:var(--paper);border-radius:18px;padding:18px 20px}
.stat b{display:block;font-size:clamp(1.8rem,3vw,2.4rem);font-weight:800;letter-spacing:-.03em;color:var(--a);line-height:1.1}
.stat span{color:var(--sub);font-size:14px;font-weight:500}

.join{margin-top:clamp(56px,8vw,112px)}
.join__in{position:relative;overflow:hidden;background:var(--ink);color:#fff;border-radius:32px;padding:clamp(32px,6vw,72px);display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:32px;align-items:center}
.join__in::before,.join__in::after{content:'';position:absolute;border-radius:50%;pointer-events:none}
.join__in>*{position:relative;z-index:1}
.join__in::before{width:340px;height:340px;right:-90px;top:-150px;background:var(--a);opacity:.9}
.join__in::after{width:160px;height:160px;right:180px;bottom:-90px;background:var(--sun);opacity:.85}
.join h2{font-size:clamp(2rem,4vw,3.4rem);position:relative}
.join h2 em{color:var(--sun)}
.join p{color:#c8c6dc;margin:12px 0 0;position:relative}
.join form{position:relative;display:flex;gap:10px;background:var(--paper);padding:6px;border-radius:999px}
.join input{flex:1;min-width:0;border:0;border-radius:999px;background:transparent}
.join input:focus{box-shadow:none}
.join .btn{box-shadow:none}

.ft{background:#16143a;color:#b9b7d3;margin-top:clamp(56px,8vw,112px);padding:clamp(48px,6vw,80px) 0 28px;font-size:14.5px}
.ft__grid{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:32px}
.ft .logo{color:#fff;margin-bottom:16px}
.ft .logo__mark{background:var(--sun);color:var(--ink)}
.ft h3{color:#fff;font-size:14px;font-weight:700;letter-spacing:.02em;margin:6px 0 14px}
.ft ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.ft ul a{display:inline-flex;min-height:36px;align-items:center;transition:color .2s}
.ft ul a:hover{color:#fff}
.ft__base{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;border-top:1px solid #2b2858;margin-top:40px;padding-top:22px;font-size:13px}
.pay{display:flex;gap:6px;flex-wrap:wrap}
.pay span{border:1px solid #34316a;border-radius:8px;padding:4px 9px;font-size:11.5px;font-weight:700;color:#d8d6ea}
.ft__big{font:italic 400 clamp(3rem,11vw,10rem)/1 var(--serif);color:#fff;letter-spacing:-.03em;margin:44px 0 0;white-space:nowrap;overflow:hidden;text-overflow:clip}
.ft__big span{color:var(--sun)}

.crumbs{display:flex;gap:8px;flex-wrap:wrap;font-size:13.5px;color:var(--sub);padding-top:22px;padding-bottom:22px}
.crumbs a:hover{color:var(--a)}
.pdp{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(28px,5vw,64px);padding-bottom:40px}
.pdp__g{position:sticky;top:96px;align-self:start}
.gallery-main{border-radius:28px;background:var(--sand);aspect-ratio:1}
.thumbs{gap:10px}
.thumbs a{display:block;border-radius:14px}
.thumbs img{width:76px;height:76px;border-radius:14px;opacity:.55;transition:opacity .2s}
.pdp__info h1{font:500 clamp(2.4rem,4.4vw,3.8rem)/1.02 var(--serif);letter-spacing:-.02em;margin:10px 0 14px}
.pdp__rate{display:inline-flex;align-items:center;gap:8px;font-size:14px;color:var(--sub)}
.pdp__price{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:18px 0 6px}
.pdp__price .price{font-size:30px;letter-spacing:-.02em}
.pdp__price .compare{font-size:18px}
.save{background:var(--sun);color:var(--ink);font-size:12.5px;font-weight:800;padding:5px 11px;border-radius:999px}
.buy{gap:14px;margin:22px 0}
.buy .field span{font-weight:700;font-size:14px}
.buy select{width:100%;max-width:none}
.buy-row{gap:10px}
.buy-row input[type=number]{width:84px;text-align:center;border-radius:999px;min-height:56px}
.buy-row .btn{flex:1;min-height:56px;font-size:16px}
.assure{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:8px 0 24px}
.assure div{background:var(--paper);border-radius:16px;padding:14px;font-size:13px;font-weight:600;line-height:1.35;display:flex;flex-direction:column;gap:8px}
.assure svg{color:var(--a)}
.acc details{border-top:1px solid var(--line)}
.acc details:last-child{border-bottom:1px solid var(--line)}
.acc summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;min-height:58px;font-weight:700}
.acc summary::-webkit-details-marker{display:none}
.acc summary::after{content:'+';display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--paper);color:var(--a);font-size:18px;transition:transform .3s var(--ease)}
.acc details[open] summary::after{transform:rotate(45deg)}
.acc__b{padding:0 0 20px;color:var(--sub)}
.acc__b p{margin:0 0 8px}
.desc{white-space:pre-line}
.panel{background:var(--paper);border-radius:28px;padding:clamp(22px,4vw,48px);margin:0 0 40px}
.reviews{margin:0}
.reviews h2{font-size:clamp(1.8rem,3vw,2.6rem);margin-bottom:8px}
.review{border-color:var(--line);padding:20px 0}
.review strong{display:block;font-size:17px;margin:4px 0}

.pagehead{padding:clamp(28px,5vw,56px) 0 clamp(18px,3vw,28px)}
.pagehead h1{font-size:clamp(2.4rem,5vw,4.4rem)}
.listing-bar{font-size:14px;font-weight:600}
.listing-bar select{min-height:44px;border-radius:999px;padding:8px 14px}
.pager a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;background:var(--paper);color:var(--a)}
.cart{background:var(--paper);border-radius:28px;padding:clamp(18px,3vw,36px)}
.cart .btn-ghost{margin-top:16px}.cart-table td{border-bottom:1px solid var(--line);padding:16px 8px}
.cart-table a{font-weight:700}
.cart-img img{width:80px;height:80px;border-radius:16px;background:var(--sand)}
.cart-table input{width:72px;text-align:center;border-radius:999px}
.cart-table .link{width:40px;height:40px;border-radius:50%;background:var(--cream);text-decoration:none;color:var(--ink)}
.totals .total{font-size:20px;font-weight:800}
.checkout-form input{min-width:min(16rem,100%)}
.empty{background:var(--paper);border-radius:28px;padding:clamp(40px,8vw,88px) 20px}
.empty p{font:italic 400 clamp(1.8rem,4vw,2.8rem)/1.1 var(--serif);margin:0 0 24px}
.order-done h1{font-size:clamp(2rem,4vw,3rem);margin-bottom:10px}
.orders-list li{border-color:var(--line)}
.faq details{background:var(--paper);border-radius:18px;margin-bottom:10px;padding:0 20px}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;min-height:60px;font-weight:700}
.faq summary::-webkit-details-marker{display:none}

@media(max-width:1060px){
  .nav{display:none}
  .grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .ft__grid{grid-template-columns:1fr 1fr}
}
@media(max-width:820px){
  .topbar nav{display:none}
  .topbar .wrap{justify-content:center;text-align:center;padding-top:6px;padding-bottom:6px}
  .hd__in{height:64px;gap:6px}
  .hsearch,.hd__acct{display:none}
  .logo{margin-right:auto;font-size:17px}
  .chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 clamp(16px,3vw,32px) 12px}
  .chips::-webkit-scrollbar{display:none}
  .chips a{flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;background:var(--paper);font-weight:600;font-size:14px;box-shadow:inset 0 0 0 1px var(--line)}
  .chips a.on{background:var(--ink);color:#fff;box-shadow:none}
  .hero{grid-template-columns:1fr}
  .hv{padding:0 0 24px 16px}
  .badge-rot{width:92px;height:92px;right:4px;top:-10px}
  .cats{grid-template-columns:1fr 1fr;grid-auto-rows:auto}
  .cat:first-child{grid-column:1/-1;grid-row:auto;min-height:300px}
  .cat{min-height:220px;padding:18px}
  .cat h3{max-width:none}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .card{padding:6px;border-radius:18px}
  .card__body{padding:10px 6px 6px}
  .card__t{font-size:14.5px}
  .qa{left:auto;right:8px;bottom:8px;transform:none}
  .qa__btn{width:44px;height:44px;padding:0}
  .qa__btn span{display:none}
  .edit{grid-template-columns:1fr}
  .quote{grid-template-columns:1fr}
  .stats{grid-template-columns:1fr}
  .stat{padding:14px}
  .stat b{font-size:1.4rem}
  .stat span{font-size:12px}
  .join__in{grid-template-columns:1fr}
  .join__in::before{width:220px;height:220px;right:-100px;top:-120px}
  .join form{flex-direction:column;border-radius:22px;padding:8px}
  .pdp{grid-template-columns:1fr}
  .pdp__g{position:static}
  .assure{grid-template-columns:1fr}
  .assure div{flex-direction:row;align-items:center}
  .sec__h{flex-wrap:wrap}
}
@media(max-width:480px){.cats{grid-template-columns:1fr}.cat h3{font-size:2rem}.ft__grid{grid-template-columns:1fr 1fr}.ft__grid>:first-child{grid-column:1/-1}}
@media(prefers-reduced-motion:reduce){.js .badge-rot svg.ring,.js .dot,.js .cartbtn__n.has{animation:none}}
`;

function Logo({ store }: { store: Store }) {
  const logo = store.themeSettings.logoUrl;
  return (
    <a class="logo" href="/" aria-label={`${store.name} home`}>
      {logo ? <img src={logo} alt={store.name} /> : (
        <>
          <span class="logo__mark" aria-hidden="true">{store.name.charAt(0)}</span>
          {store.name}
        </>
      )}
    </a>
  );
}

export const classic: Theme = {
  id: 'classic',
  name: 'Classic',
  description: 'A warm, modern department store: indigo and cream, friendly sans with serif accents, quick add and a magazine feel.',
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const path = new URL(url).pathname;
    return (
      <html lang="en">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <a class="sr" href="#main">Skip to content</a>
          <div class="scroll-progress" />
          <div class="topbar">
            <div class="wrap">
              <span>{store.themeSettings.announcement ?? store.themeSettings.tagline ?? store.name}</span>
              <nav aria-label="Help">
                <a href="/track">Track an order</a>
                <a href="/pages/help">Help and shipping</a>
              </nav>
            </div>
          </div>
          <Notice text={notice} />
          <header class="hd" data-hide-on-scroll>
            <div class="wrap hd__in">
              <Logo store={store} />
              <nav class="nav" aria-label="Categories">
                <a href="/products">Shop all</a>
                {categories.slice(0, 5).map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
              </nav>
              <form class="hsearch" method="get" action="/search" role="search">
                <Icon name="search" size={18} />
                <input type="search" name="q" placeholder="Search products" aria-label="Search products" />
              </form>
              <a class="hicon hd__acct" href="/account" aria-label={customer ? 'Your account' : 'Sign in'}><Icon name="user" /></a>
              <a class="cartbtn" href="/cart" aria-label={`Cart, ${cartCount} items`}>
                <Icon name="bag" size={18} />
                <span>Cart</span>
                <span class={cartCount ? 'cartbtn__n has' : 'cartbtn__n'}>{cartCount}</span>
              </a>
            </div>
            <nav class="chips" aria-label="Categories">
              <a href="/products" class={path === '/products' ? 'on' : ''}>Shop all</a>
              {categories.map((c) => <a href={`/collections/${c.slug}`} class={path === `/collections/${c.slug}` ? 'on' : ''}>{c.name}</a>)}
              <a href="/search">Search</a>
              <a href="/account">{customer ? 'Account' : 'Sign in'}</a>
            </nav>
          </header>
          <main id="main">{children}</main>
          <section class="wrap join" aria-labelledby="join-h">
            <div class="join__in">
              <div>
                <h2 id="join-h" class="split">Good things, <em>in your inbox.</em></h2>
                <p>New arrivals, restocks and members-only offers. One friendly email a week, unsubscribe any time.</p>
              </div>
              <form method="post" action="/subscribe">
                <label class="sr" for="nl-email">Email address</label>
                <input id="nl-email" type="email" name="email" placeholder="you@example.com" required />
                <button class="btn" type="submit">Subscribe</button>
              </form>
            </div>
          </section>
          <footer class="ft">
            <div class="wrap">
              <div class="ft__grid">
                <div>
                  <Logo store={store} />
                  <p>{store.themeSettings.tagline ?? ''}</p>
                  {store.supportEmail ? <p>Questions? <a class="link" style="color:#fff" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></p> : null}
                </div>
                <div>
                  <h3>Shop</h3>
                  <ul>
                    <li><a href="/products">Shop all</a></li>
                    {categories.slice(0, 6).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
                <div>
                  <h3>Help</h3>
                  <ul>
                    <li><a href="/pages/help">Shipping and returns</a></li>
                    <li><a href="/track">Track an order</a></li>
                    {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}>Contact us</a></li> : null}
                  </ul>
                </div>
                <div>
                  <h3>Your account</h3>
                  <ul>
                    <li><a href="/account">{customer ? 'Orders and details' : 'Sign in'}</a></li>
                    <li><a href="/cart">Cart ({cartCount})</a></li>
                    <li><a href="/search">Search</a></li>
                  </ul>
                </div>
              </div>
              <p class="ft__big" aria-hidden="true">{store.name}<span>.</span></p>
              <div class="ft__base">
                <span>{raw('&copy;')} {new Date().getFullYear()} {store.name}. All rights reserved.</span>
                <span class="pay" aria-label="Payment methods"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Google Pay</span></span>
              </div>
            </div>
          </footer>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories }) => {
    const tagline = store.themeSettings.tagline ?? 'Everyday goods, shipped fast.';
    const [a, b] = [products[0], products[1] ?? products[0]];
    const editP = products[2] ?? products[0];
    const promises = promisesFor(store);
    const rated = products.filter((p) => p.ratingCount);
    const nReviews = rated.reduce((s, p) => s + (p.ratingCount ?? 0), 0);
    const avg = nReviews ? rated.reduce((s, p) => s + (p.ratingAvg ?? 0) * (p.ratingCount ?? 0), 0) / nReviews : 0;
    const ring = `${store.name} • ${tagline.replace(/[.,]/g, '')} • `.toUpperCase();
    const track = (
      <>
        {promises.map((t, i) => (
          <span>{i % 2 ? <em>{t}</em> : t}<Spark /></span>
        ))}
      </>
    );
    return (
      <>
        <section class="wrap hero">
          <div>
            <span class="eyebrow" data-reveal="up"><span class="dot" /> New in this week</span>
            <h1 class="split">{accentHeading(store.content?.heroTitle ?? tagline)}</h1>
            <p class="hero__lede" data-reveal="up" style="--d:250ms">{store.content?.heroText ?? 'Well made essentials for home, travel and everyday wear. Chosen with care, priced fairly and packed the day you order.'}</p>
            <div class="hero__ctas" data-reveal="up" style="--d:380ms">
              <a class="btn" href="/products" data-magnetic>Shop new arrivals <Icon name="arrow" size={18} /></a>
              <a class="btn btn-ghost" href="#cats">Browse categories</a>
            </div>
            <div class="trust" data-stagger="up">
              <span><Icon name="truck" />{store.freeShippingOver ? `Free shipping over ${money(store, store.freeShippingOver).replace(/\.00$/, '')}` : 'Tracked shipping'}</span>
              <span><Icon name="return" />30-day returns</span>
              <span><Icon name="lock" />Secure checkout</span>
            </div>
          </div>
          {a?.images[0] ? (
            <div class="hv" data-reveal="scale">
              <a class="hv__frame" href={`/products/${a.slug}`} aria-label={a.title} style="display:block">
                <img data-vt data-parallax style="--p:28px" src={a.images[0]} alt={a.title} width="900" height="1035" fetchpriority="high" />
              </a>
              {b ? (
                <a class="hv__card" href={`/products/${b.slug}`}>
                  {b.images[0] ? <img src={b.images[0]} alt="" width="64" height="64" /> : null}
                  <span><strong>{b.title}</strong><Price store={store} product={b} /></span>
                </a>
              ) : null}
              <div class="badge-rot" aria-hidden="true">
                <svg class="ring" viewBox="0 0 120 120">
                  <defs><path id="cl-ring" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" /></defs>
                  <circle cx="60" cy="60" r="59" fill="#fff" />
                  <text font-size="10.5" font-weight="700" letter-spacing="2.2" fill="currentColor" font-family="Plus Jakarta Sans, sans-serif"><textPath href="#cl-ring" textLength="285">{ring}</textPath></text>
                </svg>
                <span class="core"><Spark /></span>
              </div>
            </div>
          ) : null}
        </section>

        <section class="band" aria-label="Our promises">
          <div class="marquee" style="--speed:36s">
            <div class="marquee__track">{track}</div>
            <div class="marquee__track" aria-hidden="true">{track}</div>
          </div>
        </section>

        {categories.length ? (
          <section class="wrap sec" id="cats" aria-labelledby="cats-h">
            <div class="sec__h">
              <div>
                <span class="eyebrow">Departments</span>
                <h2 id="cats-h" class="split">Shop by <em>category</em></h2>
              </div>
              <a class="more" href="/products">Shop all <Icon name="arrow" size={18} /></a>
            </div>
            <div class="cats" data-stagger="up">
              {categories.slice(0, 7).map((c, i) => {
                const ps = products.filter((p) => inCat(p, c));
                const img = c.image ?? ps[0]?.images[0];
                return (
                  <a class={`cat cat--${TINTS[i % TINTS.length]}`} href={`/collections/${c.slug}`}>
                    <span>
                      <h3>{c.name}</h3>
                      <span class="cat__n">{ps.length ? `${ps.length} ${ps.length === 1 ? 'product' : 'products'}` : 'Explore'}</span>
                    </span>
                    <span class="cat__go" aria-hidden="true"><Icon name="arrow" /></span>
                    {img ? <span class="cat__img"><img src={img} alt="" loading="lazy" width="500" height="500" /></span> : null}
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        <section class="wrap sec" aria-labelledby="new-h">
          <div class="sec__h">
            <div>
              <span class="eyebrow">Just landed</span>
              <h2 id="new-h" class="split">New <em>arrivals</em></h2>
            </div>
            <a class="more" href="/products">View all <Icon name="arrow" size={18} /></a>
          </div>
          <Grid store={store} products={products.slice(0, 8)} />
        </section>

        {editP?.images[0] && products.length > 1 ? (
          <section class="wrap sec" aria-labelledby="edit-h">
            <div class="edit">
              <a class="edit__img" href={`/products/${editP.slug}`} aria-label={editP.title} data-reveal="up">
                <img data-zoom-on-scroll src={editP.images[0]} alt="" loading="lazy" width="1000" height="800" />
                <span class="edit__tag">The Edit, No. {String(new Date().getMonth() + 1).padStart(2, '0')}</span>
              </a>
              <div>
                <span class="eyebrow">This month</span>
                <h2 id="edit-h" class="split">Small upgrades for <em>every day.</em></h2>
                <p>A short list of the pieces our team keeps reaching for. Useful, good looking and built to last past the season.</p>
                <ol data-stagger="up">
                  {products.slice(0, 3).map((p, i) => (
                    <li>
                      <a href={`/products/${p.slug}`}>
                        <b>{String(i + 1).padStart(2, '0')}</b>
                        {p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" width="56" height="56" /> : <span />}
                        <strong>{p.title}</strong>
                        <Price store={store} product={p} />
                      </a>
                    </li>
                  ))}
                </ol>
                <a class="btn" href="/products">Shop the edit <Icon name="arrow" size={18} /></a>
              </div>
            </div>
          </section>
        ) : null}

        <section class="wrap sec" aria-label="Why shop with us">
          <div class="quote" data-reveal="up">
            <span class="quote__mark" aria-hidden="true">{raw('&ldquo;')}</span>
            <blockquote>
              <p>
                {nReviews
                  ? `Rated ${avg.toFixed(1)} out of 5 by our customers. We pick things we would happily use ourselves, then get them to your door fast.`
                  : 'We pick things we would happily use ourselves, price them fairly and get them to your door fast. If it is not right, sending it back is easy.'}
              </p>
              <cite>The {store.name} team <span>· Our promise to you</span></cite>
            </blockquote>
            <div class="stats">
              {nReviews ? (
                <div class="stat"><b data-count={avg.toFixed(1)}>{avg.toFixed(1)}</b><span>Average rating from {nReviews} reviews</span></div>
              ) : (
                <div class="stat"><b data-count="30" data-suffix=" days">30 days</b><span>To change your mind</span></div>
              )}
              <div class="stat"><b data-count="100" data-suffix="%">100%</b><span>Secure, encrypted checkout</span></div>
              <div class="stat"><b>{store.freeShippingOver ? money(store, store.freeShippingOver).replace(/\.00$/, '') : 'Tracked'}</b><span>{store.freeShippingOver ? 'Spend for free shipping' : 'Shipping on every order'}</span></div>
            </div>
          </div>
        </section>
      </>
    );
  },
  ProductGrid: ({ store, products }) => <Grid store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    const r = priceRange(product);
    const save = r.compareAt && r.compareAt > r.min ? r.compareAt - r.min : 0;
    const free = store.freeShippingOver;
    return (
      <>
        <nav class="wrap crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a><span aria-hidden="true">/</span><a href="/products">Shop all</a><span aria-hidden="true">/</span><span>{product.title}</span>
        </nav>
        <div class="wrap pdp">
          <div class="pdp__g"><Gallery product={product} image={props.image} /></div>
          <div class="pdp__info">
            <span class="eyebrow">{inStock(product) ? 'In stock, ready to ship' : 'Currently sold out'}</span>
            <h1 class="split">{product.title}</h1>
            {product.ratingCount ? (
              <a class="pdp__rate" href="#reviews"><Stars value={product.ratingAvg} count={product.ratingCount} /> {product.ratingAvg?.toFixed(1)} out of 5</a>
            ) : null}
            <div class="pdp__price">
              <Price store={store} product={product} />
              {save ? <span class="save">You save {money(store, save)}</span> : null}
            </div>
            <BuyBox store={store} product={product} />
            <div class="assure">
              <div><Icon name="truck" />{free ? `Free shipping over ${money(store, free).replace(/\.00$/, '')}` : 'Tracked shipping'}</div>
              <div><Icon name="return" />30-day easy returns</div>
              <div><Icon name="lock" />Secure checkout</div>
            </div>
            <div class="acc">
              <details open>
                <summary>Description</summary>
                <div class="acc__b desc">{product.description}</div>
              </details>
              <details>
                <summary>Shipping and delivery</summary>
                <div class="acc__b"><p>Orders are packed within one working day and sent with tracking.{free ? ` Shipping is free on orders over ${money(store, free)}.` : ''}</p></div>
              </details>
              <details>
                <summary>Returns</summary>
                <div class="acc__b"><p>Not quite right? Return unused items within 30 days for a full refund.</p></div>
              </details>
            </div>
          </div>
        </div>
        <div class="wrap"><div class="panel"><Reviews {...props} /></div></div>
      </>
    );
  },
  Page: ({ title, children }) => (
    <div class="wrap">
      {title ? <div class="pagehead"><h1 class="split">{title}</h1></div> : <div style="height:28px" />}
      <div>{children}</div>
    </div>
  ),
  pages: {
    help: {
      title: 'Help and shipping',
      description: 'Shipping, returns and answers to common questions.',
      render: ({ store }) => {
        const faq = store.content?.faq?.length
          ? store.content.faq
          : [
              { q: 'How fast do you ship?', a: 'Orders are packed within one working day and sent with tracking.' },
              { q: 'Is shipping free?', a: store.freeShippingOver ? `Yes, on orders over ${money(store, store.freeShippingOver)}.` : 'A flat rate applies, shown at checkout.' },
              { q: 'Can I return something?', a: 'Yes. Return unused items within 30 days for a full refund.' },
              { q: 'How do I track my order?', a: 'Use the <a class="link" href="/track">order tracker</a> with your order number and email.' },
            ];
        return (
          <div class="wrap">
            <div class="pagehead"><span class="eyebrow">Help centre</span><h1 class="split">Help and <em>shipping</em></h1></div>
            <div class="faq" style="max-width:52rem">
              {faq.map((f, i) => (
                <details open={i === 0}>
                  <summary>{f.q}</summary>
                  <div class="acc__b">{raw(f.a)}</div>
                </details>
              ))}
            </div>
          </div>
        );
      },
    },
  },
};
