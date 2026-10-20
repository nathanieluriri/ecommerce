import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { Category, Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Price, Reviews, Stars, money, priceRange } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400;500;600;700&display=swap';

const ICONS: Record<string, Child> = {
  truck: <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01" />,
  lock: <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" />,
  chat: <path d="M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5" />,
  globe: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  clock: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3.5 2" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
};
const ICON_ORDER = ['truck', 'lock', 'chat', 'globe', 'heart', 'star'];

function Icon({ name, size = 24, sw = 1.6 }: { name: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {ICONS[name] ?? ICONS.star}
    </svg>
  );
}

function iconFor(title: string, i: number) {
  const t = title.toLowerCase();
  if (/deliver|ship|post/.test(t)) return 'truck';
  if (/secur|ssl|pay|safe|confiden/.test(t)) return 'lock';
  if (/support|help|hand|team/.test(t)) return 'chat';
  if (/international|world|countr|ship to/.test(t)) return 'globe';
  if (/love|care|pick/.test(t)) return 'heart';
  return ICON_ORDER[i % ICON_ORDER.length]!;
}

const clean = (s: string) => s.replace(/\s*[\u2014\u2013]\s*/g, ', ').replace(/[\u2713\u2022]/g, '').replace(/\s+/g, ' ').trim();

function blurb(p: Product) {
  const lines = p.description.split('\n').map((l) => l.trim()).filter((l) => l && !/^[\u2713\u2022]/.test(l));
  const first = lines[0] ?? '';
  const dash = first.search(/[\u2014\u2013]/);
  if (dash > 0) {
    const t = first.slice(dash + 1).trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const l = lines.slice(1).find((x) => x.length > 15 && x.length < 220 && !/:$/.test(x));
  return clean(l ?? '').slice(0, 160);
}

const pad = (n: number) => String(n).padStart(2, '0');
const sold = (p: Product) => p.tags.find((t) => /\d+k\+ sold/i.test(t))?.replace(/ Sold/i, ' sold');

function Rating({ p }: { p: Product }) {
  if (!p.ratingCount) return null;
  const v = (p.ratingAvg ?? 0).toFixed(1);
  return (
    <span class="rate" aria-label={`Rated ${v} out of 5 from ${p.ratingCount} reviews`}>
      <span class="rate__star" aria-hidden="true">{'\u2605'}</span>
      <b>{v}</b>
      <span aria-hidden="true">({p.ratingCount.toLocaleString('en-GB')})</span>
    </span>
  );
}

function Card({ store, p }: { store: Store; p: Product }) {
  const r = priceRange(p);
  const many = p.variants.length > 1;
  const s = sold(p);
  return (
    <a class="card" href={`/products/${p.slug}`}>
      <span class="card__media">
        {p.images[0] ? <img data-vt src={p.images[0]} alt={p.title} loading="lazy" decoding="async" width="400" height="400" /> : <span class="card__ph" />}
        {p.images[1] ? <img class="card__alt" src={p.images[1]} alt="" loading="lazy" decoding="async" width="400" height="400" /> : null}
        {s ? <span class="badge"><Icon name="bolt" size={12} sw={2} />{s}</span> : null}
        <span class="card__cta">{many ? 'Choose options' : 'View product'}<Icon name="arrow" size={16} sw={2} /></span>
      </span>
      <span class="card__body">
        <span class="card__title">{p.title}</span>
        <span class="card__foot">
          <span class="card__price">
            {r.min !== r.max ? <small>From </small> : null}
            {money(store, r.min)}
          </span>
          <Rating p={p} />
        </span>
      </span>
    </a>
  );
}

function Grid({ store, products }: { store: Store; products: Product[] }) {
  return (
    <div class="grid" data-stagger="up">
      {products.map((p) => (
        <Card store={store} p={p} />
      ))}
    </div>
  );
}

function Rail({ id, store, products }: { id: string; store: Store; products: Product[] }) {
  return (
    <div class="rail" id={id} data-stagger="left">
      {products.map((p) => (
        <Card store={store} p={p} />
      ))}
    </div>
  );
}

function RailButtons({ id }: { id: string }) {
  return (
    <span class="rail-btns">
      <button class="rbtn" type="button" data-rail="-1" aria-controls={id} aria-label="Scroll back"><Icon name="back" size={18} sw={2} /></button>
      <button class="rbtn" type="button" data-rail="1" aria-controls={id} aria-label="Scroll forward"><Icon name="arrow" size={18} sw={2} /></button>
    </span>
  );
}

function Features({ items }: { items: { title: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <section class="features">
      <div class="wrap features__in" style={`--n:${Math.min(items.length, 4)}`} data-stagger="up">
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

function Clock() {
  return (
    <svg class="clock" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="96" class="clock__face" />
      {Array.from({ length: 12 }, (_, i) => (
        <line x1="100" y1={i % 3 ? 14 : 12} x2="100" y2={i % 3 ? 22 : 30} class={i % 3 ? 'tick' : 'tick tick--b'} transform={`rotate(${i * 30} 100 100)`} />
      ))}
      <text x="100" y="72" class="clock__t">24/7</text>
      <line class="hand hand--h" x1="100" y1="100" x2="100" y2="54" />
      <line class="hand hand--m" x1="100" y1="100" x2="100" y2="30" />
      <line class="hand hand--s" x1="100" y1="114" x2="100" y2="24" />
      <circle cx="100" cy="100" r="6" class="clock__pin" />
    </svg>
  );
}

function Faq({ items, store }: { items: { q: string; a: string }[]; store: Store }) {
  if (!items.length) return null;
  return (
    <section class="faq">
      <div class="wrap faq__in">
        <div class="faq__side">
          <span class="eyebrow">Help desk</span>
          <h2 class="split">Questions? <em>Answered.</em></h2>
          <p>Everything about delivery, orders and payments. Still stuck? Our team replies fast.</p>
          {store.supportEmail ? <a class="btn btn--ghost" href={`mailto:${store.supportEmail}`}>Email support</a> : null}
        </div>
        <div class="faq__list" data-stagger="up">
          {items.map((f, i) => (
            <details open={i === 0}>
              <summary><span class="faq__n">{pad(i + 1)}</span><span class="faq__q">{f.q}</span><span class="faq__x" aria-hidden="true" /></summary>
              <div class="ans">{raw(f.a)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" stroke-linecap="round" />
    </svg>
  );
}

function SearchBox({ id, q, placeholder, big }: { id: string; q?: string; placeholder: string; big?: boolean }) {
  return (
    <form class={big ? 'sbox sbox--big' : 'sbox'} method="get" action="/search" role="search">
      <label class="sr" for={id}>Search products</label>
      <SearchIcon />
      <input id={id} type="search" name="q" value={q ?? ''} placeholder={placeholder} autocomplete="off" />
      <button class="sbox__go" type="submit">Search</button>
    </form>
  );
}

function deptCount(categories: Category[]) {
  return categories.length;
}

const css = `
:root{--blue:var(--accent);--blue-d:color-mix(in srgb,var(--accent) 78%,#000);--blue-l:color-mix(in srgb,var(--accent) 9%,#fff);
  --sun:#ffd400;--ink:#0b0e17;--ink-2:#151a28;--sub:#566074;--line:#e3e6ee;--bg:#fff;--soft:#f3f5fa;
  --ease:cubic-bezier(.2,.8,.2,1);--r:20px;
  --rainbow:linear-gradient(90deg,#ea1c2c 0 14.28%,#ff7a00 0 28.57%,#ffd400 0 42.85%,#14c94a 0 57.14%,#11c8ee 0 71.42%,#1f6fff 0 85.71%,#9b2cff 0);
  --head:'Bricolage Grotesque',system-ui,sans-serif;--body:'Inter',system-ui,sans-serif;
  --gut:max(20px,calc((100vw - 1320px) / 2 + 20px))}
html{scroll-padding-top:150px}
body{font-family:var(--body);color:var(--ink);background:var(--bg);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--head);font-weight:700;line-height:1.02;letter-spacing:-.03em;margin:0}
em{font-style:normal}
.wrap{max-width:1320px;margin:0 auto;padding:0 20px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip:focus{position:fixed;left:12px;top:12px;width:auto;height:auto;clip:auto;z-index:200;background:var(--sun);color:var(--ink);padding:10px 16px;border-radius:10px;font-weight:700}
:focus-visible{outline:3px solid var(--sun);outline-offset:2px;border-radius:8px;box-shadow:0 0 0 5px var(--ink)}
.muted{color:var(--sub);font-size:.92rem}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font:700 12px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--blue)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;background:var(--blue);color:#fff;border:0;border-radius:999px;padding:13px 26px;font:700 15px var(--body);cursor:pointer;transition:transform .2s var(--ease),background .2s,box-shadow .2s;box-shadow:0 10px 24px -12px var(--blue)}
.btn:hover{background:var(--blue-d);transform:translateY(-2px)}
.btn:active{transform:translateY(1px) scale(.98)}
.btn--sun{background:var(--sun);color:var(--ink);box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
.btn--sun:hover{background:#fff}
.btn--ghost,.btn-ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)}
.btn--ghost:hover,.btn-ghost:hover{background:var(--ink);color:#fff}
.btn[disabled]{opacity:.45;cursor:not-allowed;transform:none}
.link{background:none;border:0;padding:0;color:var(--blue);cursor:pointer;text-decoration:underline}
input,select,textarea{font:inherit;color:var(--ink);background:#fff;border:2px solid var(--line);border-radius:12px;padding:11px 14px;min-height:46px;transition:border-color .15s,box-shadow .15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px color-mix(in srgb,var(--blue) 18%,transparent)}

.topbar{background:var(--ink);color:#d9deea;font-size:13px;font-weight:500}
.topbar__in{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:40px}
.live{display:inline-flex;align-items:center;gap:8px;color:#fff;font-weight:700;white-space:nowrap}
.live__dot{position:relative;width:8px;height:8px;border-radius:50%;background:#2ee66b}
.live__dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid #2ee66b;animation:ping 1.8s var(--ease) infinite}
@keyframes ping{from{transform:scale(.4);opacity:1}to{transform:scale(1.6);opacity:0}}
.live__t{font-variant-numeric:tabular-nums;color:var(--sun)}
.topbar__msg{flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.topbar__links{display:flex;gap:18px;white-space:nowrap}
.topbar__links a:hover{color:var(--sun)}
.notice{background:var(--sun);color:var(--ink);text-align:center;padding:12px;font-weight:700}

.hdr{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.94);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);transition:transform .4s var(--ease),box-shadow .3s}
.hdr.is-scrolled{box-shadow:0 10px 30px -22px rgba(11,14,23,.5)}
.hdr.is-hidden{transform:translateY(-100%)}
.hdr:focus-within{transform:none}
.hdr__top{display:grid;grid-template-columns:auto 1fr auto;gap:28px;align-items:center;height:80px}
.logo{display:flex;align-items:center;gap:12px}
.logo img{height:60px;width:auto;transition:transform .4s var(--ease)}
.logo:hover img{transform:rotate(-6deg) scale(1.05)}
.logo__txt{font:800 20px/1 var(--head);letter-spacing:-.03em}
.logo__txt small{display:block;font:600 11px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--sub);margin-top:4px}
.sbox{position:relative;display:flex;align-items:center;width:100%;max-width:680px;justify-self:center;background:var(--soft);border-radius:999px;border:2px solid transparent;transition:border-color .2s,background .2s,box-shadow .2s}
.sbox:focus-within{background:#fff;border-color:var(--blue);box-shadow:0 0 0 5px color-mix(in srgb,var(--blue) 14%,transparent)}
.sbox svg{position:absolute;left:18px;color:var(--sub);pointer-events:none}
.sbox input{flex:1;min-width:0;background:transparent;border:0;border-radius:999px;padding:12px 10px 12px 50px;min-height:48px;box-shadow:none!important}
.sbox__go{flex:none;margin:4px;border:0;border-radius:999px;background:var(--ink);color:#fff;font:700 14px var(--body);padding:0 20px;min-height:40px;cursor:pointer;transition:background .2s,color .2s}
.sbox__go:hover{background:var(--blue)}
.sbox--big{max-width:none;background:#fff;box-shadow:0 20px 50px -24px rgba(0,0,0,.55)}
.sbox--big input{min-height:62px;font-size:17px;padding-left:56px}
.sbox--big svg{left:22px;color:var(--blue)}
.sbox--big .sbox__go{background:var(--sun);color:var(--ink);min-height:52px;padding:0 28px;font-size:15px}
.sbox--big .sbox__go:hover{background:var(--ink);color:#fff}
.hacts{display:flex;align-items:center;gap:4px}
.hact{position:relative;display:flex;align-items:center;gap:8px;min-height:46px;padding:0 14px;border-radius:999px;font-weight:600;font-size:14px;transition:background .2s}
.hact:hover{background:var(--soft)}
.hact--cart{background:var(--ink);color:#fff}
.hact--cart:hover{background:var(--blue)}
.hact__n{display:inline-grid;place-items:center;min-width:22px;height:22px;border-radius:11px;background:var(--sun);color:var(--ink);font-size:12px;font-weight:800;padding:0 6px}
.cats{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 var(--gut) 12px;scroll-padding:0 var(--gut)}
.cats::-webkit-scrollbar{display:none}
.cats a{position:relative;flex:none;display:inline-flex;align-items:center;min-height:38px;white-space:nowrap;font-size:14px;font-weight:600;color:var(--sub);padding:0 14px;border-radius:999px;transition:color .2s,background .2s}
.cats a:hover{color:var(--ink);background:var(--soft)}
.cats a[aria-current=page]{background:var(--blue);color:#fff}
.cats .cats__all{background:var(--ink);color:#fff}
.cats .cats__all:hover{background:var(--blue);color:#fff}
.rainbow{height:4px;background:var(--rainbow)}

.hero{position:relative;background:var(--blue);color:#fff;overflow:hidden;isolation:isolate}
.hero::before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(60% 80% at 85% 10%,color-mix(in srgb,#fff 16%,transparent),transparent 60%),radial-gradient(50% 60% at 0% 100%,color-mix(in srgb,#000 30%,transparent),transparent 70%)}
.hero__ghost{position:absolute;right:-2vw;bottom:-7vw;z-index:-1;font:800 clamp(200px,34vw,560px)/.8 var(--head);letter-spacing:-.07em;color:transparent;-webkit-text-stroke:2px color-mix(in srgb,#fff 18%,transparent);pointer-events:none;white-space:nowrap}
.hero__in{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:56px;align-items:center;padding:64px 20px 72px}
.hero .eyebrow{color:var(--ink);background:var(--sun);padding:8px 14px;border-radius:999px;letter-spacing:.1em}
.hero h1{font-size:clamp(46px,6.4vw,100px);line-height:.94;letter-spacing:-.04em;margin:22px 0 20px}
.hero h1 em{color:var(--sun)}
.hero__lead{font-size:clamp(16px,1.3vw,19px);color:color-mix(in srgb,#fff 86%,var(--blue));max-width:34rem;margin:0 0 28px}
.hero__pop{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;align-items:center;font-size:13px;font-weight:600}
.hero__pop span{opacity:.8;margin-right:4px}
.hero__pop a{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:999px;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,#fff 45%,transparent);transition:background .2s,color .2s}
.hero__pop a:hover{background:#fff;color:var(--blue)}

.feat{position:relative;background:#fff;color:var(--ink);border-radius:32px;padding:14px;box-shadow:0 40px 80px -40px rgba(0,0,0,.6);transform:rotate(1.2deg);transition:transform .6s var(--ease)}
.feat:hover{transform:none}
.feat__track{display:grid;grid-auto-flow:column;grid-auto-columns:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:22px;overscroll-behavior-x:contain}
.feat__track::-webkit-scrollbar{display:none}
.fslide{scroll-snap-align:start;scroll-snap-stop:always;display:grid;grid-template-rows:auto 1fr;min-width:0}
.fslide__media{position:relative;display:block;aspect-ratio:16/11;border-radius:22px;overflow:hidden;background:var(--soft)}
.fslide__media img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}
.fslide__media:hover img{transform:scale(1.05)}
.fslide__price{position:absolute;right:16px;top:16px;display:grid;place-items:center;text-align:center;width:104px;height:104px;border-radius:50%;background:var(--sun);color:var(--ink);font:800 19px/1.05 var(--head);letter-spacing:-.02em;transform:rotate(-10deg);box-shadow:0 10px 24px -10px rgba(0,0,0,.45)}
.fslide__price .price-wrap{display:block;padding:0 10px}
.fslide__price .compare{display:block;font-size:12px;text-decoration:line-through;opacity:.7}
.fslide__body{padding:20px 10px 8px;display:flex;flex-direction:column;gap:10px}
.fslide__no{font:700 12px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--blue)}
.fslide__title{font-size:clamp(24px,2.3vw,34px);line-height:1.02}
.fslide__body p{margin:0;color:var(--sub);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fslide__row{display:flex;align-items:center;gap:14px;margin-top:6px}
.feat__ctl{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 10px 4px}
.feat__dots{display:flex;gap:6px;align-items:center}
.feat__dots button{width:28px;height:28px;border:0;padding:0;background:none;cursor:pointer;display:grid;place-items:center}
.feat__dots button::before{content:'';width:8px;height:8px;border-radius:4px;background:var(--line);transition:width .4s var(--ease),background .3s}
.feat__dots button[aria-current=true]::before{width:26px;background:var(--blue)}
.rbtn{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:50%;border:2px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;transition:background .2s,color .2s,border-color .2s,transform .2s var(--ease)}
.rbtn:hover{background:var(--ink);border-color:var(--ink);color:#fff}
.rbtn:active{transform:scale(.92)}
html:not(.js) .rbtn,html:not(.js) .feat__dots{display:none}
@supports (animation-timeline:view(inline)){
  .fslide__media img{scale:1.18;animation:hpar linear both;animation-timeline:view(inline)}
  @keyframes hpar{from{translate:9% 0}to{translate:-9% 0}}
}

.ticker{background:var(--sun);color:var(--ink);border-block:2px solid var(--ink);padding:16px 0;--speed:38s;--gap:0px}
.ticker .marquee__track{gap:0}
.ticker span{display:inline-flex;align-items:center;gap:22px;padding-right:22px;font:800 clamp(18px,2vw,26px)/1 var(--head);letter-spacing:-.02em;text-transform:uppercase;white-space:nowrap}
.ticker svg{color:var(--blue);flex:none}

.sec{padding:88px 0}
.sec__head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:32px}
.sec__head h2{font-size:clamp(34px,5vw,72px);letter-spacing:-.045em}
.sec__head h2 em{color:var(--blue)}
.sec__head p{margin:10px 0 0;color:var(--sub);max-width:34rem}
.pill{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 20px;border-radius:999px;font-weight:700;font-size:14px;box-shadow:inset 0 0 0 2px var(--ink);white-space:nowrap;transition:background .2s,color .2s}
.pill:hover{background:var(--ink);color:#fff}
.pill svg{transition:transform .3s var(--ease)}
.pill:hover svg{transform:translateX(3px)}

.depts{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:14px}
.dept{position:relative;display:flex;flex-direction:column;border-radius:var(--r);background:var(--soft);overflow:hidden;transition:background .35s,color .35s,transform .35s var(--ease)}
.dept__img{display:block;aspect-ratio:1;overflow:hidden;margin:8px 8px 0;border-radius:14px;background:#fff}
.dept__img img{width:100%;height:100%;object-fit:cover;transition:transform .7s var(--ease)}
.dept__name{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:12px 14px 14px;font:700 15px/1.15 var(--head);letter-spacing:-.01em}
.dept__name svg{flex:none;opacity:0;transform:translateX(-6px);transition:.3s var(--ease)}
.dept:hover{background:var(--blue);color:#fff;transform:translateY(-4px)}
.dept:hover img{transform:scale(1.1)}
.dept:hover svg{opacity:1;transform:none}

.rail-sec{padding:56px 0}
.rail-sec+.rail-sec{padding-top:24px}
.rail-head{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:18px;margin-bottom:24px}
.rail-num{font:800 15px var(--head);color:var(--blue);background:var(--blue-l);border-radius:12px;padding:8px 11px;align-self:center}
.rail-head h2{font-size:clamp(30px,4.2vw,58px);letter-spacing:-.045em}
.rail-ctl{display:flex;gap:10px;align-items:center}
.rail-btns{display:flex;gap:8px}
.rail{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(220px,21vw,290px);gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 var(--gut);padding:6px var(--gut) 24px;scrollbar-width:thin;scrollbar-color:var(--blue) transparent;overscroll-behavior-x:contain}
.rail>*{scroll-snap-align:start}
.rail::-webkit-scrollbar{height:6px}
.rail::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px}

.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.card{position:relative;display:flex;flex-direction:column;background:#fff;border-radius:var(--r);padding:8px;box-shadow:inset 0 0 0 1px var(--line);transition:transform .45s var(--ease),box-shadow .45s var(--ease)}
.card:hover{transform:translateY(-6px);box-shadow:inset 0 0 0 2px var(--blue),0 26px 40px -28px color-mix(in srgb,var(--blue) 80%,#000)}
.card__media{position:relative;display:block;aspect-ratio:1;border-radius:14px;overflow:hidden;background:var(--soft)}
.card__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .45s,transform .9s var(--ease)}
.card__alt{opacity:0}
.card:hover .card__alt{opacity:1}
.card:hover .card__media img{transform:scale(1.06)}
.card__ph{position:absolute;inset:0;background:linear-gradient(135deg,var(--soft),#e6e9f1)}
.badge{position:absolute;left:10px;top:10px;display:inline-flex;align-items:center;gap:4px;background:var(--sun);color:var(--ink);font-size:11.5px;font-weight:800;padding:5px 9px 5px 7px;border-radius:999px;letter-spacing:.01em}
.card__cta{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border-radius:999px;background:var(--ink);color:#fff;font-weight:700;font-size:14px;transform:translateY(calc(100% + 14px));transition:transform .45s var(--ease),background .2s}
.card:hover .card__cta,.card:focus-visible .card__cta{transform:none}
.card:hover .card__cta{background:var(--blue)}
.card__body{display:flex;flex-direction:column;gap:8px;padding:12px 8px 8px;flex:1}
.card__title{font-weight:600;font-size:14.5px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.7em}
.card__foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;flex-wrap:wrap}
.card__price{font:800 20px/1 var(--head);letter-spacing:-.02em}
.card__price small{font:600 12px var(--body);color:var(--sub);letter-spacing:0}
.rate{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;color:var(--sub)}
.rate b{color:var(--ink);font-weight:700}
.rate__star{color:#f2a900;font-size:14px}
.stars{color:#f2a900;font-size:14px;letter-spacing:1px}

.night{position:relative;background:var(--ink);color:#fff;overflow:hidden;isolation:isolate}
.night::before{content:'';position:absolute;inset:auto -10% -40% 30%;height:90%;z-index:-1;background:radial-gradient(closest-side,color-mix(in srgb,var(--blue) 60%,transparent),transparent);filter:blur(20px)}
.night__in{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:64px;align-items:center;padding:96px 20px}
.clock{width:100%;max-width:400px;justify-self:center;overflow:visible}
.clock__face{fill:var(--ink-2);stroke:color-mix(in srgb,#fff 14%,transparent);stroke-width:2}
.tick{stroke:color-mix(in srgb,#fff 35%,transparent);stroke-width:2;stroke-linecap:round}
.tick--b{stroke:var(--sun);stroke-width:4}
.clock__t{fill:color-mix(in srgb,#fff 50%,transparent);font:800 15px var(--head);text-anchor:middle;letter-spacing:.04em}
.hand{stroke-linecap:round;transform-box:view-box;transform-origin:50% 50%;animation:spin var(--dur) linear infinite;transform:rotate(var(--a))}
.hand--h{stroke:#fff;stroke-width:7;--a:var(--h,305deg);--dur:43200s}
.hand--m{stroke:var(--blue);stroke-width:5;--a:var(--m,60deg);--dur:3600s;filter:brightness(1.35)}
.hand--s{stroke:var(--sun);stroke-width:2;--a:var(--s,0deg);--dur:60s}
.clock__pin{fill:var(--sun)}
@keyframes spin{from{transform:rotate(var(--a))}to{transform:rotate(calc(var(--a) + 360deg))}}
.night .eyebrow{color:var(--sun)}
.night h2{font-size:clamp(40px,5.6vw,88px);letter-spacing:-.05em;margin:16px 0 18px}
.night h2 em{color:var(--sun)}
.night p{color:#aab3c5;max-width:36rem;margin:0 0 36px;font-size:17px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid color-mix(in srgb,#fff 14%,transparent);border-radius:22px;overflow:hidden}
.stat{padding:22px 20px;box-shadow:0 0 0 .5px color-mix(in srgb,#fff 14%,transparent)}
.stat b{display:block;font:800 clamp(34px,3.6vw,52px)/1 var(--head);letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.stat small{display:block;margin-top:8px;font-size:13px;color:#aab3c5;font-weight:500}

.features{background:var(--soft)}
.features__in{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:18px;padding:28px 20px}
.feature{display:flex;gap:14px;align-items:flex-start}
.feature__icon{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:var(--blue);color:#fff}
.feature strong{display:block;font:700 16px var(--head)}
.feature span span{display:block;color:var(--sub);font-size:14px;margin-top:2px}

.promises{padding:96px 0;background:var(--soft)}
.promises__in{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:18px}
.promise{position:relative;background:#fff;border-radius:28px;padding:34px 30px 30px;overflow:hidden;transition:background .4s,color .4s,transform .4s var(--ease)}
.promise__n{position:absolute;right:22px;top:14px;font:800 76px/1 var(--head);letter-spacing:-.06em;color:var(--blue-l);transition:color .4s}
.promise .feature__icon{position:relative;margin-bottom:46px;width:56px;height:56px;border-radius:18px}
.promise h3{position:relative;font-size:24px;letter-spacing:-.03em;margin-bottom:10px}
.promise p{position:relative;margin:0;color:var(--sub);transition:color .4s}
.promise:hover{background:var(--blue);color:#fff;transform:translateY(-6px)}
.promise:hover p{color:color-mix(in srgb,#fff 85%,var(--blue))}
.promise:hover .promise__n{color:color-mix(in srgb,#fff 16%,transparent)}
.promise:hover .feature__icon{background:var(--sun);color:var(--ink)}

.faq{padding:96px 0}
.faq__in{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:56px;align-items:start}
.faq__side{position:sticky;top:150px}
.faq__side h2{font-size:clamp(38px,4.6vw,68px);letter-spacing:-.05em;margin:14px 0 16px}
.faq__side h2 em{color:var(--blue)}
.faq__side p{color:var(--sub);margin:0 0 24px;max-width:26rem}
.faq details{border-top:2px solid var(--ink)}
.faq details:last-child{border-bottom:2px solid var(--ink)}
.faq summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;padding:22px 4px;min-height:44px}
.faq summary::-webkit-details-marker{display:none}
.faq__n{font:800 14px var(--head);color:var(--blue)}
.faq__q{font:700 clamp(17px,1.6vw,21px)/1.25 var(--head);letter-spacing:-.02em;transition:color .2s}
.faq summary:hover .faq__q{color:var(--blue)}
.faq__x{position:relative;width:36px;height:36px;border-radius:50%;background:var(--soft);transition:background .3s,transform .4s var(--ease)}
.faq__x::before,.faq__x::after{content:'';position:absolute;left:50%;top:50%;width:14px;height:2px;margin:-1px 0 0 -7px;background:currentColor;border-radius:2px}
.faq__x::after{transform:rotate(90deg);transition:transform .4s var(--ease)}
.faq details[open] .faq__x{background:var(--sun);transform:rotate(180deg)}
.faq details[open] .faq__x::after{transform:rotate(0)}
.faq .ans{padding:0 56px 24px 40px;color:var(--sub);font-size:15.5px}
.faq .ans p{margin:0 0 8px}

.join{background:var(--blue);color:#fff;padding:64px 0;position:relative;overflow:hidden}
.join__in{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}
.join h2{font-size:clamp(34px,4.4vw,62px);letter-spacing:-.05em}
.join h2 em{color:var(--sun)}
.join p{color:color-mix(in srgb,#fff 82%,var(--blue));margin:12px 0 0;max-width:30rem}
.join form{display:flex;gap:8px;background:#fff;border-radius:999px;padding:6px}
.join input{flex:1;min-width:0;border:0;background:transparent;border-radius:999px;box-shadow:none!important;padding-left:20px}
.join label{color:var(--ink)}

.ftr{background:var(--ink);color:#a3abbd;padding:72px 0 0;font-size:14px;overflow:hidden}
.ftr__grid{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:36px}
.ftr h3{color:#fff;font:700 15px var(--head);letter-spacing:0;margin:0 0 16px}
.ftr ul{list-style:none;padding:0;margin:0;display:grid;gap:4px}
.ftr li a{display:inline-flex;min-height:32px;align-items:center;transition:color .2s}
.ftr li a:hover{color:var(--sun)}
.ftr__logo{display:inline-block;background:#fff;border-radius:20px;padding:10px;margin-bottom:16px}
.ftr__logo img{height:64px;width:auto}
.ftr__brand p{max-width:22rem;margin:0 0 18px}
.ftr .live{font-size:13px}
.wordmark{display:flex;align-items:flex-end;justify-content:space-between;gap:2vw;margin-top:56px;color:#fff;font:800 clamp(110px,30vw,560px)/.74 var(--head);letter-spacing:-.075em;white-space:nowrap;user-select:none}
.wordmark i{font-style:normal;color:var(--blue);filter:brightness(1.35)}
.wordmark small{font:800 clamp(14px,2.2vw,30px)/1.05 var(--head);letter-spacing:-.01em;text-transform:uppercase;padding-bottom:1.6vw;color:var(--sun)}
.ftr__base{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-top:1px solid #1f2535;margin-top:28px;padding:22px 0 26px;font-size:13px}
.pay{display:flex;gap:6px;flex-wrap:wrap}
.pay span{border:1px solid #2a3142;border-radius:8px;padding:4px 9px;font-size:11px;font-weight:700;color:#d0d5e0}

.phead{position:relative;background:var(--soft);overflow:hidden;isolation:isolate}
.phead::after{content:'24/7';position:absolute;right:-1vw;bottom:-3.2vw;z-index:-1;font:800 clamp(120px,16vw,260px)/1 var(--head);letter-spacing:-.07em;color:transparent;-webkit-text-stroke:2px color-mix(in srgb,var(--blue) 14%,transparent)}
.phead__in{padding:30px 20px 38px}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;font-weight:500;color:var(--sub);padding-top:18px;padding-bottom:18px}
.crumbs a:hover{color:var(--blue);text-decoration:underline}
.crumbs span[aria-hidden]{opacity:.5}
.phead .crumbs{padding-top:0;padding-bottom:16px}
.phead h1{font-size:clamp(40px,6vw,88px);letter-spacing:-.05em;max-width:20ch}
.inner{padding:30px 20px 80px}
.inner>.muted:first-child{font-size:16px;max-width:46rem;margin:0 0 20px}
.listing-bar{position:relative;z-index:1;border-bottom:2px solid var(--ink);padding-bottom:16px;margin-bottom:26px;font-size:14px;font-weight:600}
.listing-bar select{min-height:44px;border-radius:999px;padding:8px 36px 8px 16px;margin-left:6px;font-weight:600}
.pager{flex-wrap:wrap}
.pager a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:var(--ink);color:#fff;font-weight:700}
.pager a:hover{background:var(--blue)}

.pdp{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:56px;padding-bottom:64px}
.gallery{position:sticky;top:150px;align-self:start;gap:12px}
.gallery-main{aspect-ratio:1;object-fit:cover;border-radius:28px;background:var(--soft)}
.thumbs{gap:10px;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none;padding:2px}
.thumbs a{flex:none;border-radius:14px}
.thumbs img{width:76px;height:76px;border-radius:14px;opacity:.55;transition:opacity .2s,box-shadow .2s}
.thumbs a.on img{opacity:1;box-shadow:0 0 0 3px var(--blue)}
.pdp__info{align-self:start}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;letter-spacing:.02em;padding:6px 11px;border-radius:999px;background:var(--blue-l);color:var(--blue)}
.chip--sun{background:var(--sun);color:var(--ink)}
.pdp h1{font-size:clamp(32px,3.4vw,52px);letter-spacing:-.045em;line-height:1}
.pdp__rate{margin:14px 0 0}
.pdp__rate a{font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.pdp__price{display:flex;align-items:baseline;gap:10px;font:800 clamp(30px,3vw,40px)/1 var(--head);letter-spacing:-.03em;margin:22px 0 4px}
.pdp__price .compare{font-size:20px;color:var(--sub);margin-left:10px;text-decoration:line-through}
.buy{gap:14px;margin:18px 0 0;padding:20px;border-radius:22px;background:var(--soft)}
.buy .field span{font-weight:700;font-size:14px}
.buy select{width:100%;max-width:none;font-weight:500}
.buy-row{gap:10px}
.buy-row input[type=number]{width:84px;text-align:center;font-weight:700}
.buy-row .btn{flex:1;min-height:56px;font-size:16px}
.assure{display:grid;gap:4px;margin:18px 0 26px;padding:6px 0}
.assure div{display:flex;gap:14px;align-items:center;font-size:14px;padding:10px 0;border-bottom:1px dashed var(--line)}
.assure div:last-child{border-bottom:0}
.assure svg{flex:none;color:var(--blue);background:var(--blue-l);border-radius:12px;padding:8px;width:40px;height:40px}
.desc{white-space:pre-line;color:#363d4f;line-height:1.7}
.tabs details{border-top:2px solid var(--ink)}
.tabs details:last-child{border-bottom:2px solid var(--ink)}
.tabs summary{list-style:none;cursor:pointer;padding:18px 0;min-height:44px;font:700 17px var(--head);letter-spacing:-.01em;display:flex;justify-content:space-between;align-items:center}
.tabs summary::-webkit-details-marker{display:none}
.tabs summary::after{content:'+';display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--soft);color:var(--ink);font-size:20px;transition:transform .35s var(--ease),background .3s}
.tabs details[open] summary::after{transform:rotate(45deg);background:var(--sun)}
.tabs details>div{padding-bottom:20px}
.reviews{border-top:2px solid var(--ink);padding:56px 0 80px;margin:0}
.reviews h2{font-size:clamp(34px,4vw,56px);letter-spacing:-.045em;margin-bottom:10px}
.review{padding:20px 0;border-bottom:1px solid var(--line);max-width:50rem}
.review strong{font-family:var(--head);font-size:17px}

.cart-table{border-top:2px solid var(--ink)}
.cart-table td{border-bottom:1px solid var(--line);padding:18px 8px}
.cart-table a{font:700 16px var(--head)}
.cart-img img{width:84px;height:84px;border-radius:14px;background:var(--soft)}
.cart-table input{width:74px;text-align:center;font-weight:700}
.cart-table .link{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;text-decoration:none;color:var(--ink);font-size:22px}
.cart-table .link:hover{background:var(--soft)}
.cart>form>.btn{margin-top:16px}
.cart-bottom{margin-top:28px}
.totals{font-size:15px;background:var(--soft);padding:22px 24px;border-radius:22px;min-width:min(100%,22rem)}
.totals .total{font:800 24px var(--head);letter-spacing:-.02em;padding-top:8px}
.checkout-form{margin-top:18px}
.checkout-form .btn{min-width:16rem;min-height:56px;font-size:16px}
.order-done h1{font-size:clamp(34px,4vw,52px);letter-spacing:-.04em}
.orders-list li{border-color:var(--line)}
.empty{padding:40px 0 60px}
.empty::before{content:'';display:block;width:150px;height:150px;margin:0 auto 22px;border-radius:50%;background:var(--soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M36 34c0-10 6-16 14-16s14 6 14 16' fill='none' stroke='%230b0e17' stroke-width='5' stroke-linecap='round'/%3E%3Cg stroke='%230b0e17' stroke-width='2.5'%3E%3Crect x='20' y='34' width='8.6' height='30' rx='4' fill='%23ea1c2c'/%3E%3Crect x='29.4' y='34' width='8.6' height='30' rx='4' fill='%23ff7a00'/%3E%3Crect x='38.8' y='34' width='8.6' height='30' rx='4' fill='%23ffd400'/%3E%3Crect x='48.2' y='34' width='8.6' height='30' rx='4' fill='%2314c94a'/%3E%3Crect x='57.6' y='34' width='8.6' height='30' rx='4' fill='%2311c8ee'/%3E%3Crect x='67' y='34' width='8.6' height='30' rx='4' fill='%231f6fff'/%3E%3C/g%3E%3Cpath d='M18 62h64l-6 16H24z' fill='%231f4fd1' stroke='%230b0e17' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") center/62% no-repeat;animation:bob 3s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-8px) rotate(-3deg)}}
.empty p{font:700 clamp(24px,3vw,34px) var(--head);letter-spacing:-.03em}
.error{color:#c01d2e;font-weight:600}

@media(max-width:1100px){
  .hero__in{grid-template-columns:minmax(0,1fr);gap:40px;padding:48px 20px 56px}
  .feat{transform:none;max-width:640px}
  .depts{grid-template-columns:repeat(5,minmax(0,1fr))}
  .night__in{grid-template-columns:minmax(0,1fr);gap:40px;padding:72px 20px}
  .clock{max-width:260px}
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .ftr__grid{grid-template-columns:1fr 1fr}
  .faq__in{grid-template-columns:1fr;gap:28px}
  .faq__side{position:static}
}
@media(max-width:860px){
  .topbar__links{display:none}
  .topbar__msg{text-align:right}
  .hdr__top{grid-template-columns:auto 1fr;height:auto;grid-template-rows:64px auto;column-gap:12px;row-gap:4px;padding-top:4px}
  .logo img{height:48px}
  .hdr .sbox{grid-column:1/-1;grid-row:2;margin-bottom:10px;max-width:none}
  .hacts{justify-self:end}
  .hact__label{display:none}
  .hact{padding:0 12px}
  .depts{display:grid;grid-auto-flow:column;grid-template-columns:none;grid-template-rows:repeat(2,auto);grid-auto-columns:132px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:4px 20px 14px;scroll-padding:0 20px;scrollbar-width:none}
  .depts>*{scroll-snap-align:start}
  .dept__name{font-size:13.5px;padding:10px 10px 12px}
  .dept__name svg{display:none}
  .pdp{grid-template-columns:1fr;gap:24px}
  .gallery{position:static}
  .join__in{grid-template-columns:1fr}
  .features__in,.promises__in{grid-template-columns:1fr}
}
@media(max-width:640px){
  .topbar__in{min-height:36px;font-size:12px}
  .topbar__msg{font-size:12px}
  .sec{padding:60px 0}
  .sec__head{flex-direction:column;align-items:flex-start;margin-bottom:22px}
  .hero__in{padding:36px 20px 44px;gap:32px}
  .hero h1{font-size:clamp(44px,13vw,64px)}
  .hero__lead{margin-bottom:22px}
  .sbox--big input{min-height:54px;font-size:16px;padding-left:46px}
  .sbox--big svg{left:16px}
  .sbox--big .sbox__go{min-height:44px;padding:0 18px}
  .feat{padding:10px;border-radius:26px}
  .fslide__price{width:84px;height:84px;font-size:16px;right:10px;top:10px}
  .fslide__row .btn{flex:1}
  .rail-sec{padding:44px 0}
  .rail-head{grid-template-columns:auto 1fr;gap:12px}
  .rail-ctl{grid-column:1/-1;justify-content:space-between}
  .rail{grid-auto-columns:64vw;gap:12px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .card{padding:6px;border-radius:16px}
  .card__media{border-radius:12px}
  .card__title{font-size:13.5px}
  .card__price{font-size:17px}
  .card__body{padding:10px 4px 4px}
  .badge{left:7px;top:7px;font-size:10.5px}
  .night__in{padding:60px 20px}
  .stat{padding:18px 16px}
  .promises,.faq{padding:64px 0}
  .faq .ans{padding:0 4px 20px 36px}
  .faq summary{gap:12px}
  .join form{flex-direction:column;border-radius:22px}
  .join input{min-height:50px}
  .ftr__grid{grid-template-columns:1fr 1fr;gap:28px}
  .ftr__brand{grid-column:1/-1}
  .inner{padding:22px 20px 60px}
  .phead__in{padding:22px 20px 28px}
  .cart-table td{padding:12px 4px}
  .cart-img img{width:60px;height:60px}
  .checkout-form{flex-direction:column}
  .checkout-form input,.checkout-form .btn{min-width:0;width:100%}
}
@media(hover:none){.card__cta{display:none}}
@media(prefers-reduced-motion:reduce){.live__dot::after,.empty::before,.hand{animation:none}.feat{transform:none}}
`;

const JS = `(()=>{const d=document,rm=d.documentElement.classList.contains('rm'),$=s=>d.querySelectorAll(s),b=rm?'auto':'smooth';
const tk=()=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),g=t=>+p.find(x=>x.type==t).value,h=g('hour'),m=g('minute');$('[data-clock]').forEach(e=>e.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+' UK');return[h,m,g('second')]};
try{const[h,m,s]=tk();setInterval(tk,15e3);$('.clock').forEach(c=>{c.style.setProperty('--h',(h%12*30+m/2)+'deg');c.style.setProperty('--m',(m*6+s/10)+'deg');c.style.setProperty('--s',s*6+'deg')})}catch(e){}
d.addEventListener('click',e=>{const t=e.target.closest('[data-rail]');if(!t)return;const r=d.getElementById(t.getAttribute('aria-controls'));r&&r.scrollBy({left:+t.dataset.rail*r.clientWidth*.8,behavior:b})});
$('[data-slider]').forEach(w=>{const t=w.querySelector('.feat__track'),ds=[...w.querySelectorAll('[data-dot]')],n=ds.length;let i=0,auto=!rm,hold=0;
const go=k=>{i=(k+n)%n;t.scrollTo({left:i*t.clientWidth,behavior:b})};
t.addEventListener('scroll',()=>{i=Math.round(t.scrollLeft/t.clientWidth);ds.forEach((x,j)=>x.setAttribute('aria-current',j==i))},{passive:true});
w.addEventListener('click',e=>{const x=e.target.closest('[data-go],[data-dot]');if(!x)return;auto=0;go(x.dataset.dot?+x.dataset.dot:i+ +x.dataset.go)});
t.addEventListener('pointerdown',()=>auto=0);w.addEventListener('pointerenter',()=>hold=1);w.addEventListener('pointerleave',()=>hold=0);w.addEventListener('focusin',()=>hold=1);w.addEventListener('focusout',()=>hold=0);
if(n>1)setInterval(()=>{if(auto&&!hold&&!d.hidden)go(i+1)},6e3)})})()`;

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke-linecap="round" /></svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" stroke-linejoin="round" /><circle cx="10" cy="20.5" r="1" /><circle cx="17" cy="20.5" r="1" /></svg>
  );
}

function Live() {
  return (
    <span class="live">
      <span class="live__dot" aria-hidden="true" />
      Open now <span class="live__t" data-clock>24/7</span>
    </span>
  );
}

export const market: Theme = {
  id: 'market',
  name: 'Market',
  description: 'Open 24/7 everything store: electric blue and signal yellow, live clock, featured slider, department strip and scroll-snap product rails.',
  homeCollections: 6,
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const logo = store.themeSettings.logoUrl;
    const u = new URL(url);
    const path = u.pathname;
    const q = path === '/search' ? u.searchParams.get('q') ?? '' : '';
    return (
      <html lang="en-GB">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <a class="sr skip" href="#main">Skip to content</a>
          <div class="scroll-progress" />
          <div class="topbar">
            <div class="wrap topbar__in">
              <Live />
              <span class="topbar__msg">{store.themeSettings.announcement ?? ''}</span>
              <span class="topbar__links">
                <a href="/track">Track order</a>
                <a href="/pages/faq">Help and delivery</a>
              </span>
            </div>
          </div>
          <Notice text={notice} />
          <header class="hdr" data-hide-on-scroll>
            <div class="wrap hdr__top">
              <a class="logo" href="/" aria-label={`${store.name} home`}>
                {logo ? <img src={logo} alt="" width="55" height="60" /> : null}
                <span class="logo__txt">{store.name.replace(/ General Store$/i, '')}<small>{/General Store$/i.test(store.name) ? 'General Store' : 'Shop'}</small></span>
              </a>
              <SearchBox id="hq" q={q} placeholder={`Search ${store.name}`} />
              <nav class="hacts" aria-label="Account">
                <a class="hact" href="/account">
                  <UserIcon />
                  <span class="hact__label">{customer ? 'Account' : 'Sign in'}</span>
                </a>
                <a class="hact hact--cart" href="/cart" aria-label={`Basket, ${cartCount} items`}>
                  <BagIcon />
                  <span class="hact__label">Basket</span>
                  <span class="hact__n">{cartCount}</span>
                </a>
              </nav>
            </div>
            <nav class="cats" aria-label="Departments">
              <a class="cats__all" href="/products" aria-current={path === '/products' ? 'page' : undefined}>All departments</a>
              {categories.map((c) => (
                <a href={`/collections/${c.slug}`} aria-current={path === `/collections/${c.slug}` ? 'page' : undefined}>{c.name}</a>
              ))}
            </nav>
            <div class="rainbow" />
          </header>
          <main id="main">{children}</main>
          <section class="join" aria-labelledby="join-h">
            <div class="wrap join__in">
              <div>
                <h2 id="join-h" class="split">The good stuff, <em>first.</em></h2>
                <p>New arrivals, restocks and offers worth opening. No spam, unsubscribe any time.</p>
              </div>
              <form method="post" action="/subscribe">
                <label class="sr" for="nl">Email address</label>
                <input id="nl" type="email" name="email" placeholder="Your email address" required autocomplete="email" />
                <button class="btn btn--sun" type="submit">Subscribe</button>
              </form>
            </div>
          </section>
          <footer class="ftr">
            <div class="wrap">
              <div class="ftr__grid">
                <div class="ftr__brand">
                  {logo ? <span class="ftr__logo"><img src={logo} alt={store.name} width="59" height="64" loading="lazy" /></span> : <h3>{store.name}</h3>}
                  <p>{store.themeSettings.tagline ?? ''}</p>
                  <Live />
                </div>
                <div>
                  <h3>Shop</h3>
                  <ul>
                    <li><a href="/products">All departments</a></li>
                    {categories.slice(0, 6).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
                <div>
                  <h3>More to explore</h3>
                  <ul>
                    {categories.slice(6, 13).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
                <div>
                  <h3>Help</h3>
                  <ul>
                    <li><a href="/track">Track an order</a></li>
                    <li><a href="/pages/faq">Delivery and FAQ</a></li>
                    <li><a href="/account">Your account</a></li>
                    <li><a href="/cart">Your basket</a></li>
                    {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}>Contact us</a></li> : null}
                  </ul>
                </div>
              </div>
              <div class="wordmark" aria-hidden="true" data-reveal="clip">
                <span>24<i>/</i>7</span>
                <small>General<br />Store</small>
              </div>
              <div class="ftr__base">
                <span>{raw('&copy;')} {new Date().getFullYear()} {store.name}. Open all hours.</span>
                <span class="pay"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Google Pay</span></span>
              </div>
            </div>
          </footer>
          <script>{raw(JS)}</script>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories, featured, sections }) => {
    const slides = (featured?.length ? featured : products).slice(0, 6);
    const content = store.content ?? {};
    const rows = sections?.length ? sections : [{ category: null as Category | null, products }];
    const countries = store.shippingCountries?.length ?? 0;
    const flat = store.shippingFlat ? money(store, store.shippingFlat).replace(/\.00$/, '') : null;
    const promisesTicker = [
      'Open 24/7',
      flat ? `Flat ${flat} delivery` : 'Fast delivery',
      countries > 1 ? `${Math.floor((countries - 1) / 10) * 10}+ countries` : 'Worldwide shipping',
      '2-7 day delivery',
      'Secure SSL checkout',
      'Apple Pay and Google Pay',
      `${deptCount(categories)} departments`,
    ];
    const Ticker = () => (
      <>
        {promisesTicker.map((t) => (
          <span>{t}<Icon name="star" size={22} sw={2.4} /></span>
        ))}
      </>
    );
    const popular = categories.slice(0, 4);
    const renderRail = (s: (typeof rows)[number], i: number) => {
      const id = `rail-${i}`;
      return (
        <section class="rail-sec" aria-labelledby={`${id}-h`}>
          <div class="wrap rail-head">
            <span class="rail-num" aria-hidden="true">{pad(i + 1)}</span>
            <h2 id={`${id}-h`} class="split">{s.category ? s.category.name : 'New in'}</h2>
            <div class="rail-ctl">
              <RailButtons id={id} />
              <a class="pill" href={s.category ? `/collections/${s.category.slug}` : '/products'}>
                See all<span class="sr"> {s.category?.name ?? 'products'}</span> <Icon name="arrow" size={16} sw={2.2} />
              </a>
            </div>
          </div>
          <Rail id={id} store={store} products={s.products} />
        </section>
      );
    };
    return (
      <>
        <section class="hero" aria-labelledby="hero-h">
          <span class="hero__ghost" aria-hidden="true" data-parallax style="--p:60px">24/7</span>
          <div class="wrap hero__in">
            <div>
              <span class="eyebrow" data-reveal="down"><Icon name="clock" size={16} sw={2.2} /> Never closed</span>
              <h1 id="hero-h" class="split">Everything you need. <em>Open 24/7.</em></h1>
              <p class="hero__lead" data-reveal="up" style="--d:250ms">{content.heroText ?? store.themeSettings.tagline ?? ''}</p>
              <div data-reveal="up" style="--d:350ms">
                <SearchBox id="hero-q" placeholder="Watches, chargers, pet beds..." big />
              </div>
              {popular.length ? (
                <nav class="hero__pop" aria-label="Popular departments" data-reveal="up" style="--d:450ms">
                  <span>Popular:</span>
                  {popular.map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
                </nav>
              ) : null}
            </div>
            {slides.length ? (
              <div class="feat" data-slider data-reveal="right" style="--d:200ms">
                <div class="feat__track" id="feat" role="region" aria-roledescription="carousel" aria-label={content.heroTitle ?? 'Featured products'} tabindex={0}>
                  {slides.map((p, i) => (
                    <article class="fslide" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
                      <a class="fslide__media" href={`/products/${p.slug}`} tabindex={-1}>
                        {p.images[0] ? <img data-vt src={p.images[0]} alt={p.title} width="640" height="440" {...(i === 0 ? { fetchpriority: 'high' } : { loading: 'lazy' })} /> : null}
                        <span class="fslide__price"><Price store={store} product={p} /></span>
                      </a>
                      <div class="fslide__body">
                        <span class="fslide__no">{content.heroTitle ?? 'Featured'} {pad(i + 1)} / {pad(slides.length)}</span>
                        <h2 class="fslide__title">{p.title}</h2>
                        <p>{blurb(p)}</p>
                        <div class="fslide__row">
                          <a class="btn" href={`/products/${p.slug}`} data-magnetic>Shop now<span class="sr">: {p.title}</span> <Icon name="arrow" size={18} sw={2.2} /></a>
                          {sold(p) ? <span class="chip chip--sun"><Icon name="bolt" size={12} sw={2} />{sold(p)}</span> : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {slides.length > 1 ? (
                  <div class="feat__ctl">
                    <button class="rbtn" type="button" data-go="-1" aria-controls="feat" aria-label="Previous featured product"><Icon name="back" size={18} sw={2} /></button>
                    <div class="feat__dots">
                      {slides.map((p, i) => <button type="button" data-dot={String(i)} aria-controls="feat" aria-current={i === 0 ? 'true' : 'false'} aria-label={`Show ${p.title}`} />)}
                    </div>
                    <button class="rbtn" type="button" data-go="1" aria-controls="feat" aria-label="Next featured product"><Icon name="arrow" size={18} sw={2} /></button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
        <div class="ticker" aria-label="Our promises">
          <div class="marquee">
            <div class="marquee__track"><Ticker /></div>
            <div class="marquee__track" aria-hidden="true"><Ticker /></div>
          </div>
        </div>
        {categories.length ? (
          <section class="sec" aria-labelledby="dept-h">
            <div class="wrap">
              <div class="sec__head">
                <div>
                  <span class="eyebrow">Browse the aisles</span>
                  <h2 id="dept-h" class="split">Shop {categories.length} <em>departments</em></h2>
                </div>
                <a class="pill" href="/products">All products <Icon name="arrow" size={16} sw={2.2} /></a>
              </div>
              <div class="depts" data-stagger="up">
                {categories.map((c) => (
                  <a class="dept" href={`/collections/${c.slug}`}>
                    <span class="dept__img">{c.image ? <img src={c.image} alt="" loading="lazy" width="200" height="200" /> : null}</span>
                    <span class="dept__name">{c.name}<Icon name="arrow" size={16} sw={2.2} /></span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        {rows.slice(0, 2).map((s, i) => renderRail(s, i))}
        <section class="night" aria-labelledby="night-h">
          <div class="wrap night__in">
            <Clock />
            <div>
              <span class="eyebrow"><span class="live__dot" aria-hidden="true" /> Live and open</span>
              <h2 id="night-h" class="split">Order at 3am. <em>We're still open.</em></h2>
              <p>Our doors never shut. Browse, pay securely and track your order whenever suits you, day or night.</p>
              <div class="stats" data-stagger="up">
                <div class="stat"><b><span data-count="500">500</span>+</b><small>Products in stock</small></div>
                <div class="stat"><b><span data-count={String(categories.length)}>{categories.length}</span></b><small>Departments</small></div>
                {countries > 1 ? <div class="stat"><b><span data-count={String(Math.floor((countries - 1) / 10) * 10)}>{Math.floor((countries - 1) / 10) * 10}</span>+</b><small>Countries we deliver to</small></div> : null}
                <div class="stat"><b>2-7</b><small>Day delivery</small></div>
              </div>
            </div>
          </div>
        </section>
        {rows.slice(2).map((s, i) => renderRail(s, i + 2))}
        {content.promises?.length ? (
          <section class="promises" aria-labelledby="prom-h">
            <div class="wrap">
              <div class="sec__head">
                <div>
                  <span class="eyebrow">Why shop with us</span>
                  <h2 id="prom-h" class="split">Small prices. <em>Big promises.</em></h2>
                </div>
              </div>
              <div class="promises__in" style={`--n:${Math.min(content.promises.length, 3)}`} data-stagger="up">
                {content.promises.map((f, i) => (
                  <div class="promise">
                    <span class="promise__n" aria-hidden="true">{pad(i + 1)}</span>
                    <span class="feature__icon"><Icon name={iconFor(f.title, i + 2)} /></span>
                    <h3>{raw(f.title)}</h3>
                    <p>{raw(f.text)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        <Faq items={content.faq ?? []} store={store} />
      </>
    );
  },
  ProductGrid: ({ store, products }) => <Grid store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    const features = (store.content?.features ?? []).slice(0, 3);
    const s = sold(product);
    return (
      <>
        <nav class="wrap crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a><span aria-hidden="true">/</span><a href="/products">All departments</a><span aria-hidden="true">/</span><span>{product.title}</span>
        </nav>
        <div class="wrap pdp">
          <Gallery product={product} image={props.image} />
          <div class="pdp__info">
            <div class="chips">
              {s ? <span class="chip chip--sun"><Icon name="bolt" size={12} sw={2} />{s}</span> : null}
              {product.tags.includes('Highly Rated') ? <span class="chip">Highly rated</span> : null}
              <span class="chip"><Icon name="clock" size={12} sw={2.4} />Order 24/7</span>
            </div>
            <h1>{product.title}</h1>
            {product.ratingCount ? <p class="pdp__rate"><Stars value={product.ratingAvg} count={product.ratingCount} /> <a href="#reviews">{product.ratingAvg?.toFixed(1)} out of 5</a></p> : null}
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
    <>
      {title ? (
        <section class="phead">
          <div class="wrap phead__in">
            <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>{title}</span></nav>
            <h1 class="split">{title}</h1>
          </div>
        </section>
      ) : null}
      <div class="wrap inner">{children}</div>
    </>
  ),
  pages: {
    faq: {
      title: 'Delivery and FAQ',
      render: ({ store }) => (
        <>
          <section class="phead">
            <div class="wrap phead__in">
              <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Delivery and FAQ</span></nav>
              <h1 class="split">Delivery and FAQ</h1>
            </div>
          </section>
          <Features items={store.content?.features ?? []} />
          <Faq items={store.content?.faq ?? []} store={store} />
        </>
      ),
    },
  },
};
