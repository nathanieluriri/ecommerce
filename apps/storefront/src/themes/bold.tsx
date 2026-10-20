import { raw } from 'hono/html';
import type { Category, Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Reviews, Stars, inStock, money, priceRange } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;700;800&display=swap';

const pad = (n: number) => String(n).padStart(2, '0');

function nextDrop(now = new Date()) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 17));
  t.setUTCDate(t.getUTCDate() + ((5 - t.getUTCDay() + 7) % 7));
  if (t <= now) t.setUTCDate(t.getUTCDate() + 7);
  return t;
}

function Ring({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span class={`ring ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" width="200" height="200">
        <defs><path id="ring-path" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" /></defs>
        <text><textPath href="#ring-path" textLength="462">{text}</textPath></text>
      </svg>
      <span class="ring__core">✶</span>
    </span>
  );
}

function Arrow() {
  return (
    <svg class="arr" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true">
      <path d="M5 19 19 5M8 5h11v11" stroke-linecap="square" />
    </svg>
  );
}

function Tag({ store, p }: { store: Store; p: Product }) {
  const r = priceRange(p);
  const cmp = r.compareAt && r.compareAt > r.min ? r.compareAt : 0;
  return (
    <span class="tag">
      {r.min !== r.max ? <small>From</small> : null}
      <span>{money(store, r.min)}</span>
      {cmp ? <s>{money(store, cmp)}</s> : null}
    </span>
  );
}

function Stickers({ store, p }: { store: Store; p: Product }) {
  const r = priceRange(p);
  if (!inStock(p)) return <span class="sticker sticker--dead">Sold out</span>;
  if (r.compareAt && r.compareAt > r.min) return <span class="sticker">-{Math.round((1 - r.min / r.compareAt) * 100)}%</span>;
  const stock = p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock;
  if (stock <= (store.lowStockThreshold ?? 5)) return <span class="sticker sticker--hot">Almost gone</span>;
  return <span class="sticker sticker--new">New</span>;
}

function Card({ store, p, i }: { store: Store; p: Product; i: number }) {
  const alt = p.images[1];
  return (
    <a class="card" href={`/products/${p.slug}`}>
      <span class="card__media">
        {p.images[0] ? (
          <>
            <img data-vt data-fade src={p.images[0]} alt={p.title} loading="lazy" decoding="async" width="800" height="1000" />
            <img class={`card__alt${alt ? '' : ' card__alt--duo'}`} src={alt ?? p.images[0]} alt="" loading="lazy" decoding="async" width="800" height="1000" />
          </>
        ) : (
          <span class="card__ph" aria-hidden="true">{p.title.slice(0, 1)}</span>
        )}
        <span class="card__no" aria-hidden="true">{pad(i + 1)}</span>
        <Stickers store={store} p={p} />
        <Tag store={store} p={p} />
      </span>
      <span class="card__meta">
        <span class="card__title">{p.title}</span>
        <span class="card__cta">{p.variants.length > 1 ? 'Pick size' : 'Cop it'} <Arrow /></span>
      </span>
    </a>
  );
}

function Grid({ store, products }: { store: Store; products: Product[] }) {
  return (
    <div class="grid" data-stagger="up">
      {products.map((p, i) => <Card store={store} p={p} i={i} />)}
    </div>
  );
}

function Marquee({ words, rev = false, size = 'big' }: { words: string[]; rev?: boolean; size?: 'big' | 'small' }) {
  const items = [...words, ...words, ...words];
  const track = (hidden: boolean) => (
    <div class="marquee__track" aria-hidden={hidden ? 'true' : undefined}>
      {items.map((w, i) => <span class={i % 2 ? 'o' : ''}>{w}<b aria-hidden="true">✶</b></span>)}
    </div>
  );
  return (
    <div class={`marquee mq mq--${size}${rev ? ' marquee--rev' : ''}`}>
      {track(false)}
      {track(true)}
    </div>
  );
}

function Countdown({ id }: { id: string }) {
  const t = nextDrop();
  let s = Math.max(0, Math.floor((t.getTime() - Date.now()) / 1000));
  const v = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  const units: [keyof typeof v, string][] = [['d', 'Days'], ['h', 'Hrs'], ['m', 'Min'], ['s', 'Sec']];
  return (
    <section class="cd" aria-labelledby={id}>
      <div class="wrap cd__in">
        <h2 id={id} class="cd__label"><span class="dot" aria-hidden="true" />Next drop</h2>
        <p class="cd__clock" data-until={String(t.getTime())}>
          <span class="sr">Weekly drop countdown.</span>
          {units.map(([k, l], i) => (
            <>
              {i ? <span class="cd__sep" aria-hidden="true">:</span> : null}
              <span class="cd__u" aria-hidden="true"><b data-cd={k}>{pad(v[k])}</b><small>{l}</small></span>
            </>
          ))}
        </p>
        <a class="cd__link" href="#join">Get notified <Arrow /></a>
      </div>
      <script>{raw(`(()=>{const c=document.querySelector('[data-until]');if(!c)return;const t=+c.dataset.until,f=n=>String(n).padStart(2,'0'),u=()=>{const s=Math.max(0,(t-Date.now())/1e3|0),v={d:s/86400|0,h:(s/3600|0)%24,m:(s/60|0)%60,s:s%60};c.querySelectorAll('[data-cd]').forEach(e=>{const n=f(v[e.dataset.cd]);if(e.textContent!==n)e.textContent=n})};u();setInterval(u,1000)})()`)}</script>
    </section>
  );
}

function Rail({ store, category, products, n }: { store: Store; category: Category; products: Product[]; n: number }) {
  return (
    <section class="rail" aria-labelledby={`rail-${category.slug}`}>
      <div class="wrap rail__head">
        <h2 id={`rail-${category.slug}`} class="rail__title split"><span class="rail__n">{pad(n)}</span>{category.name}</h2>
        <a class="pill" href={`/collections/${category.slug}`}>Shop {category.name} <Arrow /></a>
      </div>
      <div class="rail__track" data-stagger="left" tabindex={0} aria-label={`${category.name} products, scroll sideways`}>
        {products.map((p, i) => <Card store={store} p={p} i={i} />)}
        <a class="rail__end" href={`/collections/${category.slug}`}><span>See all</span><Arrow /></a>
      </div>
    </section>
  );
}

const css = `
:root{--a:var(--accent);--ink:#0b0b0b;--ink2:#151515;--line:#2a2a2a;--paper:#f3eee5;--dim:#b4ada3;
  --fd:'Anton','Archivo Black',Impact,'Arial Narrow',sans-serif;--fb:'Archivo',system-ui,sans-serif;--ease:cubic-bezier(.7,0,.2,1)}
html{background:var(--ink);scrollbar-color:var(--a) var(--ink)}
body{font-family:var(--fb);background:var(--ink);color:var(--paper);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:clip}
body::before{content:'';position:fixed;inset:0;z-index:90;pointer-events:none;opacity:.07;mix-blend-mode:screen;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
::selection{background:var(--a);color:var(--ink)}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--fd);font-weight:400;text-transform:uppercase;line-height:.9;letter-spacing:-.005em;margin:0}
.wrap{max-width:1440px;margin:0 auto;padding:0 32px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:12px;top:-60px;z-index:200;background:var(--a);color:var(--ink);padding:10px 16px;font-weight:800}
.skip:focus{top:12px}
:focus-visible{outline:3px solid var(--a);outline-offset:3px}
.muted{color:var(--dim)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:14px 28px;background:var(--a);color:var(--ink);border:2px solid var(--a);font:400 20px/1 var(--fd);text-transform:uppercase;letter-spacing:.02em;cursor:pointer;transition:transform .15s,background .2s,color .2s,box-shadow .2s;box-shadow:6px 6px 0 var(--paper)}
.btn:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 var(--paper)}
.btn:active{transform:translate(4px,4px);box-shadow:0 0 0 var(--paper)}
.btn-ghost{background:transparent;color:var(--paper);border-color:var(--paper);box-shadow:none}
.btn-ghost:hover{background:var(--paper);color:var(--ink);box-shadow:none}
.btn[disabled]{background:var(--line);border-color:var(--line);color:var(--dim);box-shadow:none;cursor:not-allowed;transform:none}
.link{color:var(--a)}
input,select,textarea{font:500 16px var(--fb);color:var(--ink);background:var(--paper);border:2px solid var(--paper);border-radius:0;padding:12px 14px;min-height:48px}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 3px var(--a)}
.error{color:#ff8a70}
.stars{color:var(--a)}
.arr{flex:none;transition:transform .3s var(--ease)}
.pill{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:10px 18px;border:2px solid var(--paper);border-radius:999px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;transition:background .2s,color .2s}
.pill:hover{background:var(--paper);color:var(--ink)}
.pill:hover .arr,.card:hover .arr,.rail__end:hover .arr,.cd__link:hover .arr,.cats a:hover .arr{transform:rotate(45deg)}

.announce{background:var(--a);color:var(--ink);font:400 15px/1 var(--fd);text-transform:uppercase;letter-spacing:.06em;padding:9px 0;--gap:2.5rem;--speed:26s}
.announce span{display:inline-flex;gap:2.5rem;white-space:nowrap}
.hdr{position:sticky;top:0;z-index:50;background:var(--ink);border-bottom:2px solid var(--paper);transition:transform .4s var(--ease),background .3s}
.hdr.is-scrolled{background:rgba(11,11,11,.92);backdrop-filter:blur(8px)}
.hdr.is-hidden{transform:translateY(-100%)}
.hdr__in{display:flex;align-items:center;gap:24px;height:72px}
.logo{font:400 44px/1 var(--fd);text-transform:uppercase;letter-spacing:-.01em;display:flex;align-items:center;gap:6px;transition:color .2s}
.logo:hover{color:var(--a)}
.logo i{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--a);margin-top:-18px}
.logo img{height:44px;width:auto}
.cats{display:flex;gap:4px;flex:1;min-width:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.cats::-webkit-scrollbar{display:none}
.cats a{position:relative;white-space:nowrap;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.05em;padding:12px 12px}
.cats a::after{content:'';position:absolute;left:12px;right:12px;bottom:6px;height:3px;background:var(--a);transform:scaleX(0);transform-origin:right;transition:transform .35s var(--ease)}
.cats a:hover::after,.cats a[aria-current]::after{transform:scaleX(1);transform-origin:left}
.hact{display:flex;align-items:center;gap:8px;margin-left:auto}
.hact>a,.hsearch summary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:44px;min-height:44px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.05em;padding:0 10px;cursor:pointer}
.hact>a:hover,.hsearch summary:hover{color:var(--a)}
.hsearch{position:relative}
.hsearch summary{list-style:none}
.hsearch summary::-webkit-details-marker{display:none}
.hsearch form{position:absolute;right:0;top:calc(100% + 14px);width:min(360px,calc(100vw - 32px));display:flex;background:var(--ink);border:2px solid var(--paper);padding:8px;gap:8px;box-shadow:8px 8px 0 var(--a)}
.hsearch input{flex:1;min-width:0}
.hsearch .btn{min-height:48px;padding:0 16px;font-size:16px;box-shadow:none}
.bag{background:var(--paper);color:var(--ink)!important;border-radius:999px;padding:0 16px!important;transition:background .2s}
.bag:hover{background:var(--a)}
.bag b{display:inline-grid;place-items:center;min-width:24px;height:24px;border-radius:50%;background:var(--a);color:var(--ink);font:400 14px/1 var(--fd)}
.bag:hover b{background:var(--ink);color:var(--a)}
.notice{background:var(--paper);color:var(--ink);font-weight:800;text-transform:uppercase;letter-spacing:.04em}

.hero{position:relative;padding:40px 0 64px;overflow:hidden}
.hero__eyebrow{display:flex;justify-content:space-between;gap:16px;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--dim);border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:18px}
.hero__eyebrow b{color:var(--a)}
.hero h1{font-size:clamp(4.4rem,15.2vw,15rem);line-height:.84;letter-spacing:-.01em;margin:0 -.03em}
.hero h1 em{font-style:normal;color:var(--a)}
.hero h1 .chip{display:inline-block;vertical-align:-.02em;width:1.55em;height:.74em;border-radius:999px;overflow:hidden;margin:0 .06em;background:var(--a);rotate:-5deg}
.hero h1 .chip img{width:100%;height:100%;object-fit:cover}
.hero__row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:48px;align-items:end;margin-top:40px}
.hero__copy p{font-size:clamp(17px,1.5vw,21px);max-width:28rem;margin:0 0 28px;color:var(--paper)}
.hero__copy p strong{color:var(--a)}
.hero__ctas{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.hero__stats{display:flex;gap:32px;margin-top:40px;border-top:1px solid var(--line);padding-top:18px}
.hero__stats div{display:flex;flex-direction:column}
.hero__stats b{font:400 44px/1 var(--fd)}
.hero__stats span{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--dim)}
.hero__media{position:relative}
.hero__frame{position:relative;display:block;aspect-ratio:16/11;overflow:hidden;background:var(--ink2)}
.hero__frame img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}
.hero__frame:hover img{transform:scale(1.04)}
.hero__frame::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.65))}
.hero__cap{position:absolute;left:20px;right:20px;bottom:18px;z-index:1;display:flex;justify-content:space-between;align-items:end;gap:12px}
.hero__cap span{font:400 clamp(26px,2.6vw,40px)/.95 var(--fd);text-transform:uppercase}
.hero__cap .tag{position:static;transform:rotate(-3deg)}
.hero .ring{position:absolute;left:-58px;top:-58px;z-index:2}

.ring{display:grid;place-items:center;width:136px;height:136px;border-radius:50%;background:var(--a);color:var(--ink)}
.ring svg{position:absolute;width:100%;height:100%;animation:spin 14s linear infinite}
.ring text{font:400 25px var(--fd);letter-spacing:.06em;fill:currentColor;text-transform:uppercase}
.ring__core{font-size:38px;line-height:1}
@keyframes spin{to{transform:rotate(360deg)}}

.mq{padding:18px 0;border-block:2px solid var(--paper);--gap:2rem;--speed:38s}
.mq span{display:inline-flex;align-items:center;gap:2rem;white-space:nowrap;font:400 clamp(56px,9vw,150px)/.9 var(--fd);text-transform:uppercase}
.mq span.o{color:transparent;-webkit-text-stroke:2px var(--paper)}
.mq b{color:var(--a);font-size:.5em;-webkit-text-stroke:0}
.mq--small{padding:12px 0;--speed:30s}
.mq--small span{font-size:clamp(32px,4vw,56px)}
.cw{display:block;clip-path:inset(0 0 0 0);transition:clip-path 1.2s var(--ease) .15s}
.js .cw:not(.is-in *){clip-path:inset(100% 0 0 0)}
.js .cw--x:not(.is-in *){clip-path:inset(0 100% 0 0)}
.cw--x{height:100%}
.js .hero__media.is-in,.js .pdp__media.is-in{clip-path:none}
.tilts{overflow:hidden;padding:24px 0}
.tilt{transform:rotate(-2deg);margin:40px -20px;background:var(--ink)}
.tilt+.tilt{margin-top:-46px;transform:rotate(1.5deg);background:var(--a);color:var(--ink);border-color:var(--ink)}
.tilt+.tilt span.o{-webkit-text-stroke-color:var(--ink)}
.tilt+.tilt b{color:var(--ink)}

.cd{background:var(--paper);color:var(--ink);margin:72px 0 0}
.cd__in{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:32px;padding-block:22px}
.cd__label{font-size:clamp(28px,3vw,44px);display:flex;align-items:center;gap:14px}
.dot{width:14px;height:14px;border-radius:50%;background:var(--a);box-shadow:0 0 0 0 var(--a);animation:pulse 1.6s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 14px rgba(255,61,0,0)}100%{box-shadow:0 0 0 0 rgba(255,61,0,0)}}
.cd__clock{display:flex;justify-content:center;align-items:flex-start;gap:12px;margin:0;font-variant-numeric:tabular-nums}
.cd__u{display:flex;flex-direction:column;align-items:center}
.cd__u b{font:400 clamp(44px,5.4vw,84px)/.9 var(--fd);font-weight:400;min-width:1.15em;text-align:center}
.cd__u small{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.cd__sep{font:400 clamp(36px,4.4vw,70px)/.9 var(--fd);color:var(--a);animation:blink 1s steps(2) infinite}
@keyframes blink{50%{opacity:.2}}
.cd__link{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-bottom:3px solid var(--ink)}
.cd__link:hover{color:#c22d00;border-color:var(--a)}

.sec{padding-block:96px 40px}
.sec__head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:36px;flex-wrap:wrap}
.sec__head h2{font-size:clamp(64px,10vw,168px)}
.sec__head h2 sup{font:800 .16em var(--fb);vertical-align:top;color:var(--a);margin-left:.2em;letter-spacing:.04em}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:40px 28px}
.card{display:flex;flex-direction:column;gap:14px;position:relative}
.card__media{position:relative;display:block;aspect-ratio:4/5;overflow:hidden;background:var(--ink2)}
.card__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .9s var(--ease),clip-path .7s var(--ease)}
.card__alt{clip-path:inset(100% 0 0 0)}
.card__alt--duo{filter:grayscale(1) contrast(1.35) brightness(1.05);mix-blend-mode:normal}
.card__media::after{content:'';position:absolute;inset:0;background:var(--a);mix-blend-mode:multiply;clip-path:inset(100% 0 0 0);transition:clip-path .7s var(--ease);pointer-events:none}
.card:has(.card__alt:not(.card__alt--duo)) .card__media::after{display:none}
.card:hover .card__alt,.card:focus-visible .card__alt,.card:hover .card__media::after,.card:focus-visible .card__media::after{clip-path:inset(0 0 0 0)}
.card:hover .card__media img{transform:scale(1.05)}
.card__ph{position:absolute;inset:0;display:grid;place-items:center;font:400 40vw/1 var(--fd);color:var(--line);font-size:min(40vw,240px)}
.card__no{position:absolute;left:12px;top:12px;z-index:2;font:400 18px/1 var(--fd);color:var(--paper);background:var(--ink);padding:6px 8px}
.sticker{position:absolute;right:12px;top:14px;z-index:2;background:var(--paper);color:var(--ink);font:400 16px/1 var(--fd);text-transform:uppercase;letter-spacing:.04em;padding:8px 12px;transform:rotate(8deg);box-shadow:3px 3px 0 var(--ink);transition:transform .4s var(--ease)}
.sticker--hot{background:var(--a)}
.sticker--dead{background:var(--ink);color:var(--paper);border:2px solid var(--paper)}
.card:hover .sticker{transform:rotate(-6deg) scale(1.08)}
.tag{position:absolute;left:12px;bottom:14px;z-index:2;display:inline-flex;align-items:baseline;gap:8px;background:var(--a);color:var(--ink);padding:8px 14px 6px;font:400 clamp(26px,2.4vw,36px)/1 var(--fd);transform:rotate(-4deg);transform-origin:left bottom;box-shadow:4px 4px 0 var(--ink);transition:transform .4s var(--ease)}
.tag small{font:800 11px var(--fb);text-transform:uppercase;letter-spacing:.08em}
.tag s{font:700 14px var(--fb);opacity:.75}
.card:hover .tag{transform:rotate(0) translateY(-4px)}
.card__meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:2px solid var(--line);padding-bottom:12px;transition:border-color .3s}
.card:hover .card__meta{border-color:var(--a)}
.card__title{font:400 clamp(24px,2vw,32px)/1 var(--fd);text-transform:uppercase}
.card__cta{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--a);white-space:nowrap}

.rail{padding:72px 0 24px;border-top:2px solid var(--line)}
.rail__head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.rail__title{font-size:clamp(56px,8vw,128px);display:flex;align-items:flex-start;gap:.15em}
.rail__n{font:800 .18em var(--fb);color:var(--a);letter-spacing:.04em;margin-top:.3em}
.rail__track{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,min(28vw,360px));gap:24px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-inline:max(32px,calc((100vw - 1440px)/2 + 32px));padding:6px max(32px,calc((100vw - 1440px)/2 + 32px)) 24px;scrollbar-width:thin;scrollbar-color:var(--a) transparent}
.rail__track>*{scroll-snap-align:start}
.rail__end{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:16px;aspect-ratio:4/5;border:2px dashed var(--line);font:400 40px/1 var(--fd);text-transform:uppercase;transition:background .3s,color .3s,border-color .3s}
.rail__end:hover{background:var(--a);color:var(--ink);border-color:var(--a)}
.rail__end .arr{width:40px;height:40px}

.idx{padding-block:96px}
.idx h2{font:800 13px var(--fb);letter-spacing:.14em;color:var(--dim);margin-bottom:16px}
.idx ul{list-style:none;margin:0;padding:0;border-top:2px solid var(--paper)}
.idx li{border-bottom:2px solid var(--paper)}
.idx a{position:relative;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:10px 0;overflow:hidden}
.idx a>span{position:relative;z-index:1;font:400 clamp(56px,11vw,190px)/.92 var(--fd);text-transform:uppercase;transition:transform .5s var(--ease),color .3s}
.idx a small{position:relative;z-index:1;font:800 14px var(--fb);text-transform:uppercase;letter-spacing:.1em;display:inline-flex;align-items:center;gap:8px}
.idx a::before{content:'';position:absolute;inset:0;background:var(--a);clip-path:inset(0 100% 0 0);transition:clip-path .6s var(--ease)}
.idx a:hover::before,.idx a:focus-visible::before{clip-path:inset(0 0 0 0)}
.idx a:hover>span,.idx a:focus-visible>span{transform:translateX(24px);color:var(--ink)}
.idx a:hover small,.idx a:focus-visible small{color:var(--ink)}
.idx a:hover .arr{transform:rotate(45deg)}

.why{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:0;border:2px solid var(--paper);margin-bottom:96px}
.why>div{padding:28px;border-right:2px solid var(--paper)}
.why>div:last-child{border-right:0}
.why b{display:block;font:400 clamp(30px,3vw,44px)/.95 var(--fd);text-transform:uppercase;margin:14px 0 10px}
.why i{font-style:normal;font:400 16px var(--fd);color:var(--a)}
.why p{margin:0;color:var(--dim)}

.join{background:var(--a);color:var(--ink);padding:72px 0;position:relative;overflow:hidden}
.join__in{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:end}
.join h2{font-size:clamp(56px,8vw,128px)}
.join p{font-weight:700;margin:16px 0 0;max-width:30rem}
.join form{display:flex;flex-direction:column;gap:10px}
.join label{font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:13px}
.join .row{display:flex;gap:0}
.join input{flex:1;min-width:0;background:var(--ink);color:var(--paper);border-color:var(--ink);min-height:60px;font-size:18px}
.join input::placeholder{color:#8f8a83}
.join .btn{background:var(--paper);color:var(--ink);border-color:var(--ink);box-shadow:none;min-height:60px}
.join .btn:hover{background:var(--ink);color:var(--paper);transform:none}
.ftr{padding:64px 0 0;overflow:hidden}
.ftr__grid{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:32px}
.ftr h3{font:800 12px var(--fb);letter-spacing:.14em;color:var(--dim);margin-bottom:14px}
.ftr ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.ftr li a{display:inline-flex;align-items:center;min-height:36px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;font-size:15px;transition:color .2s,transform .3s var(--ease)}
.ftr li a:hover{color:var(--a);transform:translateX(6px)}
.ftr__tag{font:400 clamp(28px,3vw,44px)/.95 var(--fd);text-transform:uppercase;max-width:14ch;margin:0}
.ftr__tag em{font-style:normal;color:var(--a)}
.mark{display:block;font:400 calc(100vw / (var(--n) * .41 + .16))/.86 var(--fd);text-transform:uppercase;letter-spacing:-.015em;text-align:center;margin:48px 0 0;padding-top:.04em;overflow:hidden;color:var(--paper);white-space:nowrap;user-select:none}
.mark span{display:inline-block;transition:color .3s,transform .5s var(--ease)}
.mark span:hover{color:var(--a);transform:translateY(-4%)}
.ftr__base{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-top:2px solid var(--line);padding-block:18px 24px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}

.crumbs{display:flex;gap:10px;flex-wrap:wrap;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--dim);padding-block:22px}
.crumbs a:hover{color:var(--a)}
.pdp{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:56px;align-items:start;padding-bottom:72px}
.pdp__media{position:relative}
.gallery{gap:12px}
.gallery-main{aspect-ratio:4/5;object-fit:cover;background:var(--ink2);width:100%}
.thumbs{gap:10px}
.thumbs a{display:block;outline-offset:2px}
.thumbs img{width:76px;height:96px;opacity:.5;transition:opacity .2s}
.thumbs a.on img{opacity:1;box-shadow:0 0 0 3px var(--a)}
.pdp__media .sticker{right:-14px;top:24px;font-size:22px;padding:10px 16px}
.pdp__media .ring{position:absolute;left:-40px;bottom:-40px;width:120px;height:120px}
.pdp__info{position:sticky;top:96px}
.pdp__eyebrow{display:flex;gap:12px;align-items:center;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--dim);margin-bottom:14px}
.pdp__eyebrow b{color:var(--ink);background:var(--a);padding:3px 8px}
.pdp h1{font-size:clamp(72px,9.6vw,176px);line-height:.82;overflow-wrap:anywhere;margin:0 -.02em}
.pdp__price{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:26px 0 8px}
.pdp__price .tag{position:static;font-size:clamp(36px,3.4vw,52px);transform:rotate(-3deg)}
.pdp .buy{margin:24px 0}
.pdp .buy .field>span{font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.1em}
.pdp .buy select{width:100%;max-width:none}
.pdp .buy-row{gap:12px}
.pdp .buy-row input[type=number]{width:84px;text-align:center;font-weight:800}
.pdp .buy-row .btn{flex:1;font-size:24px;min-height:60px}
.pdp .buy>p.muted{color:var(--a);font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin:0}
.pdp__assure{display:grid;grid-template-columns:repeat(3,1fr);border:2px solid var(--line);margin:0 0 24px}
.pdp__assure div{padding:12px;border-right:2px solid var(--line);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
.pdp__assure div:last-child{border-right:0}
.pdp__assure b{display:block;color:var(--paper);font:400 18px/1.1 var(--fd);margin-bottom:4px}
.acc details{border-top:2px solid var(--line)}
.acc details:last-child{border-bottom:2px solid var(--line)}
.acc summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;min-height:56px;font:400 22px var(--fd);text-transform:uppercase}
.acc summary::-webkit-details-marker{display:none}
.acc summary::after{content:'+';font:400 30px var(--fd);color:var(--a);transition:transform .3s var(--ease)}
.acc details[open] summary::after{transform:rotate(45deg)}
.acc .desc,.acc .body{padding:0 0 20px;color:var(--dim);white-space:pre-line;line-height:1.65}
.rev{background:var(--paper);color:var(--ink);padding:24px 0 64px;margin-top:72px}
.rev .reviews h2{font-size:clamp(56px,8vw,128px);margin-bottom:16px}
.rev .muted{color:#5a554e}
.rev .review{border-bottom:2px solid var(--ink);padding:20px 0}
.rev .review strong{font:400 24px var(--fd);text-transform:uppercase}
.rev .stars{color:#c22d00}
.rev input,.rev select,.rev textarea{background:#fff;border-color:var(--ink)}
.rev .btn{box-shadow:6px 6px 0 var(--ink)}
.rev a{text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:var(--a);font-weight:800}

.phead{padding:56px 0 32px;border-bottom:2px solid var(--line);margin-bottom:32px}
.phead h1{font-size:clamp(64px,11vw,190px);line-height:.84;overflow-wrap:anywhere}
.phead p{margin:12px 0 0}
.inner{padding-bottom:96px}
.inner>h1{font-size:clamp(48px,7vw,104px);margin:0 0 24px}
.inner h2{font-size:clamp(32px,3.6vw,52px);margin:40px 0 16px}
.listing-bar{font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:13px;border-bottom:2px solid var(--line);padding-bottom:18px;margin-bottom:36px}
.listing-bar select{margin-left:8px;min-height:44px;padding:8px 12px}
.pager a{color:var(--a);min-height:44px;display:inline-flex;align-items:center}
.cart-table td{border-bottom:2px solid var(--line);padding:18px 10px}
.cart-table a{font:400 26px/1 var(--fd);text-transform:uppercase}
.cart-table a:hover{color:var(--a)}
.cart-img img{width:88px;height:110px}
.cart-table input{width:76px;text-align:center}
.cart-table .link{font-size:28px;color:var(--a);text-decoration:none;min-width:44px;min-height:44px}
.cart .btn-ghost{margin-top:20px}
.totals{font-weight:700;min-width:18rem;border:2px solid var(--paper);padding:18px}
.totals .total{font:400 32px/1 var(--fd);color:var(--a);padding-top:8px}
.checkout-form{margin-top:28px}
.checkout-form input{min-width:min(18rem,100%)}
.checkout-form .btn{min-width:18rem;font-size:24px;min-height:60px}
.empty{padding:40px 0 24px}
.empty p{font:400 clamp(48px,8vw,120px)/.9 var(--fd);text-transform:uppercase;margin:0 0 32px}
.empty p::after{content:' (for now)';display:block;color:var(--a);font-size:.4em;margin-top:12px}
.order-done h1{font-size:clamp(48px,7vw,104px)}
.order-lines li{border-bottom:2px solid var(--line)}
.order-lines li.total{font:400 28px var(--fd);color:var(--a)}
.orders-list li{border-bottom:2px solid var(--line)}
.orders-list a{color:var(--a);font-weight:800}
.review{border-color:var(--line)}
.manifesto{font:400 clamp(40px,6vw,96px)/.95 var(--fd);text-transform:uppercase;margin:0 0 40px}
.manifesto em{font-style:normal;color:var(--a)}

@media(max-width:1000px){
  .hero__row{grid-template-columns:1fr;gap:40px}
  .hero__media{order:-1}
  .pdp{grid-template-columns:1fr;gap:32px}
  .pdp__info{position:static}
  .ftr__grid{grid-template-columns:1fr 1fr}
  .join__in{grid-template-columns:1fr}
  .cd__in{grid-template-columns:1fr auto;gap:16px}
  .cd__clock{grid-column:1/-1;grid-row:2;justify-content:flex-start}
}
@media(max-width:760px){
  .wrap{padding:0 16px}
  .hdr__in{height:64px;gap:8px}
  .logo{font-size:36px}
  .hdr .cats{display:none}
  .mcats{display:flex!important;border-top:1px solid var(--line);padding:0 8px}
  .hact>a.acct span{display:none}
  .hsearch summary span{display:none}
  .hero{padding:24px 0 40px}
  .hero__eyebrow{font-size:11px;letter-spacing:.08em}
  .hero h1{font-size:clamp(3.6rem,21vw,9rem)}
  .hero h1 .chip{width:1.25em}
  .hero .ring{width:104px;height:104px;left:auto;right:-10px;top:-36px}
  .hero__stats{gap:20px}
  .hero__stats b{font-size:34px}
  .mq span{font-size:clamp(52px,16vw,90px)}
  .mq--small span{font-size:34px}
  .tilt{margin:28px -20px}
  .tilt+.tilt{margin-top:-34px}
  .cd{margin-top:48px}
  .cd__u b{font-size:46px}
  .sec{padding-block:64px 24px}
  .sec__head h2{font-size:clamp(56px,18vw,96px)}
  .grid{grid-template-columns:1fr 1fr;gap:28px 12px}
  .tag{font-size:22px;padding:6px 9px 4px;left:8px;bottom:10px}
  .tag s{display:none}
  .sticker{font-size:13px;padding:6px 8px;right:8px;top:10px}
  .card__no{font-size:18px;left:10px}
  .card__meta{flex-direction:column;align-items:flex-start;gap:6px}
  .card__title{font-size:22px}
  .rail{padding-top:56px}
  .rail__title{font-size:clamp(48px,15vw,80px)}
  .rail__track{grid-auto-columns:72vw;gap:14px;padding-inline:16px;scroll-padding-inline:16px}
  .rail__end{font-size:30px}
  .idx{padding-block:64px}
  .idx a>span{font-size:clamp(48px,17vw,90px)}
  .idx a small span{display:none}
  .why{grid-template-columns:1fr;margin-bottom:64px}
  .why>div{border-right:0;border-bottom:2px solid var(--paper)}
  .why>div:last-child{border-bottom:0}
  .join{padding:56px 0}
  .join .row{flex-direction:column;gap:10px}
  .ftr__grid{grid-template-columns:1fr 1fr;gap:28px 16px}
  .ftr__grid>div:first-child{grid-column:1/-1}
  .pdp h1{font-size:clamp(56px,17vw,96px)}
  .pdp__media .sticker{right:8px}
  .pdp__media .ring{display:none}
  .pdp__assure{grid-template-columns:1fr}
  .pdp__assure div{border-right:0;border-bottom:2px solid var(--line)}
  .pdp__assure div:last-child{border-bottom:0}
  .phead{padding:36px 0 24px}
  .phead h1{font-size:clamp(52px,16vw,96px)}
  .cart-table,.cart-table tbody,.cart-table tr{display:block}
  .cart-table tr{display:grid;grid-template-columns:88px 1fr auto;gap:4px 14px;padding:16px 0;border-bottom:2px solid var(--line)}
  .cart-table td{border:0;padding:0}
  .cart-table td.cart-img{grid-row:span 3}
  .cart-table td:nth-child(2){grid-column:2/4}
  .cart-table a{font-size:22px}
  .totals{min-width:0;width:100%}
  .checkout-form input,.checkout-form .btn{width:100%;min-width:0}
}
.mcats{display:none}
@media (prefers-reduced-motion:reduce){
  .ring svg,.dot,.cd__sep{animation:none!important}
  .js .cw{clip-path:none!important}
  .card:hover .card__media img,.hero__frame:hover img{transform:none}
}
`;

export const bold: Theme = {
  id: 'bold',
  name: 'Bold',
  description: 'Streetwear drop: black and off-white, one loud accent, giant condensed type, marquees, stickers and a weekly drop countdown.',
  homeCollections: 3,
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const logo = store.themeSettings.logoUrl;
    const path = new URL(url).pathname;
    const catLinks = (
      <>
        <a href="/products" aria-current={path === '/products' ? 'page' : undefined}>Shop all</a>
        {categories.map((c) => <a href={`/collections/${c.slug}`} aria-current={path === `/collections/${c.slug}` ? 'page' : undefined}>{c.name}</a>)}
      </>
    );
    const ann = store.themeSettings.announcement;
    const tagline = store.themeSettings.tagline ?? 'New drops every week';
    const tw = tagline.split(' ');
    const tlast = tw.pop();
    return (
      <html lang="en">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <a class="skip" href="#main">Skip to content</a>
          <div class="scroll-progress" />
          {ann ? (
            <div class="announce marquee" role="note">
              <div class="marquee__track"><span>{ann}</span><span aria-hidden="true">✶</span><span aria-hidden="true">{ann}</span><span aria-hidden="true">✶</span></div>
              <div class="marquee__track" aria-hidden="true"><span>{ann}</span><span>✶</span><span>{ann}</span><span>✶</span></div>
            </div>
          ) : null}
          <Notice text={notice} />
          <header class="hdr" data-hide-on-scroll>
            <div class="wrap hdr__in">
              <a class="logo" href="/" aria-label={`${store.name} home`}>
                {logo ? <img src={logo} alt={store.name} /> : <>{store.name}<i aria-hidden="true" /></>}
              </a>
              <nav class="cats" aria-label="Categories">{catLinks}</nav>
              <div class="hact">
                <details class="hsearch">
                  <summary aria-label="Search">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.5-4.5" /></svg>
                    <span>Search</span>
                  </summary>
                  <form method="get" action="/search" role="search">
                    <input type="search" name="q" placeholder="Search the drop" aria-label="Search products" />
                    <button class="btn" type="submit">Go</button>
                  </form>
                </details>
                <a class="acct" href="/account" aria-label={customer ? 'Your account' : 'Sign in'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
                  <span>{customer ? 'Account' : 'Sign in'}</span>
                </a>
                <a class="bag" href="/cart" aria-label={`Bag, ${cartCount} items`}>Bag <b>{cartCount}</b></a>
              </div>
            </div>
            <nav class="cats mcats" aria-label="Categories">{catLinks}</nav>
          </header>
          <main id="main">{children}</main>
          <section class="join" id="join" aria-labelledby="join-h">
            <div class="wrap join__in">
              <div>
                <h2 id="join-h" class="split">Get on the list</h2>
                <p>First word on every drop. Early access, restocks and the odd code. Unsubscribe any time.</p>
              </div>
              <form method="post" action="/subscribe">
                <label for="nl-email">Your email</label>
                <div class="row">
                  <input id="nl-email" type="email" name="email" placeholder="you@example.com" required autocomplete="email" />
                  <button class="btn" type="submit">I'm in</button>
                </div>
              </form>
            </div>
          </section>
          <footer class="ftr">
            <div class="wrap">
              <div class="ftr__grid">
                <div>
                  <p class="ftr__tag">{tw.join(' ')} <em>{tlast}</em></p>
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
                    <li><a href="/track">Track order</a></li>
                    <li><a href="/cart">Your bag</a></li>
                    {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}>Contact</a></li> : null}
                  </ul>
                </div>
                <div>
                  <h3>{store.name}</h3>
                  <ul>
                    <li><a href="/pages/about">About</a></li>
                    <li><a href="/account">{customer ? 'Account' : 'Sign in'}</a></li>
                    <li><a href="/search">Search</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <a class="mark" href="/" style={`--n:${Math.max(3, store.name.length)}`} aria-label={`${store.name} home`}>
              {store.name.split('').map((ch) => <span aria-hidden="true">{ch}</span>)}
            </a>
            <div class="wrap ftr__base">
              <span>{raw('&copy;')} {new Date().getFullYear()} {store.name}</span>
              <span>Secure checkout</span>
            </div>
          </footer>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories, featured, sections }) => {
    const content = store.content ?? {};
    const pool = featured?.length ? featured : products;
    const lead = pool[0];
    const chip = products.find((p) => p !== lead && p.images[0]) ?? lead;
    const words = (content.heroTitle ?? store.themeSettings.tagline ?? 'New drops every week').trim().split(/\s+/);
    const last = words.pop() ?? '';
    const chipAt = Math.min(2, words.length);
    const prices = products.map((p) => priceRange(p).min);
    const from = prices.length ? Math.min(...prices) : 0;
    const free = store.freeShippingOver;
    const rails = (sections ?? []).filter((s) => s.products.length);
    const why = content.promises?.length
      ? content.promises.slice(0, 3)
      : [
          { title: 'Small runs', text: 'Tight edits, no filler. Shop it while it is here.' },
          { title: free ? `Free ship ${money(store, free).replace(/\.00$/, '')}+` : 'Fast shipping', text: free ? `Orders over ${money(store, free)} ship free. Everything else ships flat.` : 'Packed and shipped fast, tracked to your door.' },
          { title: 'Track it live', text: 'Follow your order from our door to yours with the tracking page.' },
        ];
    return (
      <>
        <section class="hero">
          <div class="wrap">
            <div class="hero__eyebrow" data-reveal="fade">
              <span><b>●</b> Drop live now</span>
              <span>{products.length} pieces / {categories.length} categories</span>
            </div>
            <h1 class="split">
              {words.slice(0, chipAt).join(' ')}{' '}
              {chip?.images[0] ? (
                <span class="chip" data-reveal="fade" style="--d:450ms"><span class="cw cw--x"><img src={chip.images[0]} alt="" width="200" height="100" fetchpriority="high" /></span></span>
              ) : null}{' '}
              {words.slice(chipAt).join(' ')} <em>{last}</em>
            </h1>
            <div class="hero__row">
              <div class="hero__copy" data-reveal="up" style="--d:300ms">
                <p>
                  {content.heroText ?? (
                    <>
                      Fresh gear, small runs, no filler.{' '}
                      {from ? <>Pieces from <strong>{money(store, from)}</strong>.</> : null}
                    </>
                  )}
                </p>
                <div class="hero__ctas">
                  <a class="btn" href="#drop" data-magnetic>Shop the drop <Arrow /></a>
                  <a class="pill" href="/products">View all</a>
                </div>
                <div class="hero__stats">
                  <div><b data-count={String(products.length)}>{products.length}</b><span>Pieces live</span></div>
                  <div><b data-count={String(categories.length)}>{categories.length}</b><span>Categories</span></div>
                  {free ? <div><b>{money(store, free).replace(/\.00$/, '')}</b><span>Free ship over</span></div> : null}
                </div>
              </div>
              {lead ? (
                <div class="hero__media" data-reveal="fade">
                  <Ring text="New drop ✶ new drop ✶ new drop ✶ " />
                  <a class="hero__frame cw" href={`/products/${lead.slug}`}>
                    {lead.images[0] ? <img data-vt src={lead.images[0]} alt={lead.title} width="1200" height="825" fetchpriority="high" /> : null}
                    <span class="hero__cap"><span>{lead.title}</span><Tag store={store} p={lead} /></span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div class="tilts" aria-hidden="true">
          <div class="tilt mq--wrap"><Marquee words={['New drop', 'New drop']} /></div>
          <div class="tilt mq--wrap"><Marquee words={[store.name, 'Every week']} rev size="small" /></div>
        </div>

        <Countdown id="cd-h" />

        <section class="wrap sec" id="drop" aria-labelledby="drop-h">
          <div class="sec__head">
            <h2 id="drop-h" class="split">The drop<sup>({pad(products.length)})</sup></h2>
            <a class="pill" href="/products">Shop all <Arrow /></a>
          </div>
          {products.length ? <Grid store={store} products={products.slice(0, 8)} /> : <p class="muted">The next drop is loading. Check back soon.</p>}
        </section>

        {rails.map((s, i) => <Rail store={store} category={s.category} products={s.products} n={i + 1} />)}

        {categories.length ? (
          <section class="wrap idx" aria-labelledby="idx-h">
            <h2 id="idx-h">Shop by category</h2>
            <ul data-stagger="up">
              {categories.map((c, i) => (
                <li>
                  <a href={`/collections/${c.slug}`}>
                    <span>{c.name}</span>
                    <small><span>{pad(i + 1)} / Shop now</span><Arrow /></small>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section class="wrap" aria-label="Why shop here">
          <div class="why" style={`--n:${why.length}`} data-stagger="up">
            {why.map((w, i) => (
              <div>
                <i>{pad(i + 1)}</i>
                <b>{raw(w.title)}</b>
                <p>{raw(w.text)}</p>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  },
  ProductGrid: ({ store, products }) => <Grid store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    const free = store.freeShippingOver;
    const live = inStock(product);
    return (
      <>
        <nav class="wrap crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/products">Shop all</a><span aria-hidden="true">/</span><span>{product.title}</span></nav>
        <div class="wrap pdp">
          <div class="pdp__media" data-reveal="fade">
            <div class="cw"><Gallery product={product} image={props.image} /></div>
            <Stickers store={store} p={product} />
            <Ring text="Limited ✶ limited ✶ limited ✶ " />
          </div>
          <div class="pdp__info">
            <div class="pdp__eyebrow">
              <b>{live ? 'In the drop' : 'Sold out'}</b>
              {product.tags[0] ? <span>{product.tags[0]}</span> : null}
            </div>
            <h1 class="split">{product.title}</h1>
            <div class="pdp__price">
              <Tag store={store} p={product} />
              {product.ratingCount ? <a href="#reviews"><Stars value={product.ratingAvg} count={product.ratingCount} /></a> : null}
            </div>
            <BuyBox store={store} product={product} label="Add to bag" />
            <div class="pdp__assure">
              <div><b>{free ? `Free over ${money(store, free).replace(/\.00$/, '')}` : 'Fast dispatch'}</b>Shipping</div>
              <div><b>Secure</b>Checkout</div>
              <div><b>Tracked</b>Delivery</div>
            </div>
            <div class="acc">
              <details open>
                <summary>Details</summary>
                <div class="desc">{product.description}</div>
              </details>
              <details>
                <summary>Shipping</summary>
                <div class="body">
                  {store.shippingFlat ? `Flat rate ${money(store, store.shippingFlat)}.` : 'Shipping calculated at checkout.'}
                  {free ? ` Free on orders over ${money(store, free)}.` : ''} Track any order on the <a class="link" href="/track">tracking page</a>.
                </div>
              </details>
              {(store.content?.faq ?? []).slice(0, 3).map((f) => (
                <details>
                  <summary>{f.q}</summary>
                  <div class="body">{raw(f.a)}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
        <div class="tilts" aria-hidden="true"><div class="tilt"><Marquee words={[product.title, store.name]} size="small" /></div></div>
        <section class="rev">
          <div class="wrap"><Reviews {...props} /></div>
        </section>
      </>
    );
  },
  Page: ({ title, children }) => (
    <div class="wrap">
      {title ? <div class="phead"><h1 class="split">{title}</h1></div> : <div style="height:40px" />}
      <div class="inner">{children}</div>
    </div>
  ),
  pages: {
    about: {
      title: 'About',
      description: 'Small runs, loud pieces, new drops every week.',
      render: ({ store }) => (
        <div class="wrap">
          <div class="phead"><h1 class="split">About {store.name}</h1></div>
          <div class="inner">
            <p class="manifesto" data-reveal="up">Small runs. <em>Loud</em> pieces. {store.themeSettings.tagline ?? 'New drops every week'}.</p>
            <div class="why" style="--n:3" data-stagger="up">
              <div><i>01</i><b>Drop</b><p>New pieces land on a schedule. Get on the list to hear first.</p></div>
              <div><i>02</i><b>Cop</b><p>Secure checkout and tracked delivery on every order.</p></div>
              <div><i>03</i><b>Repeat</b><p>Questions? {store.supportEmail ? <a class="link" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a> : 'Reach us any time.'}</p></div>
            </div>
            <a class="btn" href="/products">Shop all <Arrow /></a>
          </div>
        </div>
      ),
    },
  },
};
