import { raw } from 'hono/html';
import type { Category, Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Price, Reviews, Stars } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap';
const IMG = '/maison';

const TAGLINE = 'Where calm begins';

const CATEGORY_LINES: Record<string, string> = {
  sleep: 'Explore the collection',
  nightwear: 'Discover nightwear',
  'home-scent': 'Set the mood',
  'cosy-extras': 'Complete the room',
  'gift-sets': 'Give thoughtfully',
  'gift-sets-and-bundles': 'Give thoughtfully',
};

function Crescent({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg class={`crescent ${className}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M27 6.5A15 15 0 1 0 33.5 30 12.5 12.5 0 1 1 27 6.5Z" fill="currentColor" />
    </svg>
  );
}

const MOON = 'M27 6.5A15 15 0 1 0 33.5 30 12.5 12.5 0 1 1 27 6.5Z';

function DrawnMoon({ size = 18 }: { size?: number }) {
  return (
    <svg class="crescent draw" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path pathLength="1" d={MOON} />
    </svg>
  );
}

function Rule({ size = 16, large = false }: { size?: number; large?: boolean }) {
  return (
    <div class={large ? 'rule rule--lg' : 'rule'} data-reveal="fade" aria-hidden="true">
      <DrawnMoon size={size} />
    </div>
  );
}

const PROMISES = ['Considered UK delivery', 'Secure checkout', 'Thoughtful presentation', 'Wrapped with care', 'Satin, bamboo and silk', 'Quiet luxury within reach'];

function Ticker() {
  const items = PROMISES.map((t) => (
    <span class="tick">
      <Crescent size={11} />
      {t}
    </span>
  ));
  return (
    <div class="strip">
      <div class="marquee" style="--speed:80s;--gap:56px">
        <div class="marquee__track">{items}</div>
        <div class="marquee__track" aria-hidden="true">{items}</div>
      </div>
    </div>
  );
}

function Monogram({ size = 44 }: { size?: number }) {
  return (
    <svg class="monogram" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M48 14.5c-3.6-3-8.3-4.5-13.4-4.5C22.4 10 13 19.6 13 32s9.4 22 21.6 22c5.4 0 10.2-1.7 13.9-5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" />
      <path d="M39 17.5c-6.2 1.6-10.8 7.4-10.8 14.5S32.8 44.9 39 46.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  );
}

function Wordmark() {
  return (
    <span class="wordmark">
      <Monogram size={34} />
      <span class="wordmark__text">
        <span>Maison de</span>
        <span>Chantal</span>
      </span>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" stroke-linecap="round" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path d="M5 8h14l-1.1 11.2a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8Z" stroke-linejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke-linecap="round" />
    </svg>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <p class="eyebrow" data-reveal="fade">{children}</p>;
}

const tone = (i: number) => (i % 2 ? 'plum' : 'cream');

function Tile({ product, index }: { product: Product; index: number }) {
  const [a, b] = product.images;
  if (a)
    return (
      <>
        <img class="pcard__img" src={a} alt={product.title} loading="lazy" decoding="async" width="800" height="1000" data-vt data-fade />
        {b ? <img class="pcard__img pcard__alt" src={b} alt="" loading="lazy" decoding="async" width="800" height="1000" /> : null}
      </>
    );
  return (
    <>
      <span class={`pcard__img pcard__ph pcard__ph--${tone(index)}`} aria-hidden="true">
        <span class="pcard__c">C</span>
      </span>
      <span class={`pcard__img pcard__ph pcard__alt pcard__ph--${tone(index + 1)}`} aria-hidden="true">
        <Crescent size={34} />
      </span>
    </>
  );
}

function ProductCards({ store, products }: { store: Store; products: Product[] }) {
  return (
    <ul class="pgrid">
      {products.map((p, i) => (
        <li data-reveal="up" style={`--i:${i % 4}`}>
          <a class="pcard" href={`/products/${p.slug}`}>
            <span class="pcard__frame">
              <Tile product={p} index={i} />
              <span class="pcard__cta" aria-hidden="true">Discover</span>
              {p.tags[0] ? <span class="pcard__chip">{p.tags[0].replace(/-/g, ' ')}</span> : null}
              {p.compareAt && p.compareAt > p.price ? <span class="pcard__chip pcard__chip--sale">Offer</span> : null}
            </span>
            <span class="pcard__title"><span>{p.title}</span></span>
            <span class="pcard__meta">
              <span>{p.variants.length ? `${p.variants.length} options` : p.stock > 0 ? 'Ready to send' : 'Sold out'}</span>
              <Price store={store} product={p} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <ul class="ctiles">
      {categories.slice(0, 5).map((cat, i) => (
        <li data-reveal="up" style={`--i:${i}`}>
          <a class={`ctile ctile--${i % 2 ? 'plum' : i % 4 === 2 ? 'sand' : 'cream'}`} href={`/collections/${cat.slug}`}>
            <span class="ctile__c" aria-hidden="true">C</span>
            <span class="ctile__num">{String(i + 1).padStart(2, '0')}</span>
            <span class="ctile__name">{cat.name}</span>
            <span class="ctile__go">{CATEGORY_LINES[cat.slug] ?? 'Explore'}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Newsletter({ dark = true }: { dark?: boolean }) {
  return (
    <section class={dark ? 'join' : 'join join--light'} aria-labelledby="join-title">
      <span class="join__c" aria-hidden="true"><span data-parallax style="--p:90px">C</span></span>
      <div class="join__moon" data-reveal="fade"><DrawnMoon size={30} /></div>
      <p class="eyebrow" data-reveal="up" style="--d:200ms">Stay connected</p>
      <h2 id="join-title" class="display split" style="--d:300ms">
        A softer evening <em>starts here</em>
      </h2>
      <p class="join__lede" data-reveal="up" style="--d:500ms">Join the Maison de Chantal list for new arrivals, quiet offers and 10% off your first order.</p>
      <form method="post" action="/subscribe" class="join__form" data-reveal="up" style="--d:650ms">
        <label class="sr" for="join-email">Email address</label>
        <input id="join-email" type="email" name="email" placeholder="Your email address" required autocomplete="email" />
        <button type="submit">Join the list</button>
      </form>
      <p class="join__fine">One or two letters a month. Unsubscribe in one click.</p>
    </section>
  );
}

const css = `
:root{
  --plum:#5a1028;--plum-deep:#350917;--wine:#741d39;--mauve:#8d5f6d;--taupe:#756369;
  --cream:#f7f2e9;--linen:#eee2cf;--sand:#d9cfc6;--rose:#d8c9c9;--paper:#fbf8f3;--ink:#281b1f;
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  --sans:'Jost','Helvetica Neue',Arial,sans-serif;
  --ease:cubic-bezier(.22,.61,.36,1);--ease-out:cubic-bezier(.16,1,.3,1);--ease-wipe:cubic-bezier(.77,0,.18,1);
  --gutter:clamp(20px,4vw,56px);
  --wrap:1240px;
}
html{scroll-behavior:smooth}
body{font-family:var(--sans);font-weight:300;font-size:16px;line-height:1.7;color:var(--ink);background:var(--paper);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .2 0 0 0 0 .22 0 0 0 .05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
::selection{background:var(--rose);color:var(--plum-deep)}
a{color:inherit;text-decoration:none}
:focus-visible{outline:1px solid var(--plum);outline-offset:4px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wrap{max-width:var(--wrap);margin:0 auto;padding:0 var(--gutter)}
.display,h1,h2,h3{font-family:var(--serif);font-weight:300;letter-spacing:-.01em;line-height:1.04;color:var(--ink);margin:0}
.display em,h1 em,h2 em{font-style:italic;color:var(--plum)}
.eyebrow{font-family:var(--sans);font-size:11px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--plum);margin:0 0 18px}
.muted{color:var(--taupe);font-size:.95rem}
.crescent{color:var(--plum);flex:none}
.rule{display:flex;align-items:center;gap:18px;color:var(--mauve);justify-content:center;margin:0 auto}
.rule::before,.rule::after{content:'';height:1px;width:72px;background:currentColor;opacity:.35;transition:transform 1.8s var(--ease-out) .2s}
.rule::before{transform-origin:100% 50%}.rule::after{transform-origin:0 50%}
.rule--lg{gap:28px;color:var(--plum);padding-block:clamp(8px,2vw,24px) clamp(48px,6vw,80px)}
.rule--lg::before,.rule--lg::after{width:min(28vw,240px)}
.js .rule:not(.is-in)::before,.js .rule:not(.is-in)::after{transform:scaleX(0)}
.draw path{fill:currentColor;fill-opacity:1;stroke:currentColor;stroke-width:1.1;stroke-dasharray:1;stroke-dashoffset:0;transition:stroke-dashoffset 2.4s var(--ease-wipe) .3s,fill-opacity 1.4s var(--ease) 1.9s}
.rule--lg .draw path{fill-opacity:.12}
.js :not(.is-in) > .draw path{stroke-dashoffset:1;fill-opacity:0}

/* buttons */
.btn,.join__form button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;font-family:var(--sans);font-size:11px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;padding:17px 30px;border:1px solid var(--plum);background-color:var(--plum);color:var(--cream);cursor:pointer;transition:background-size .8s var(--ease-out),color .6s var(--ease),border-color .6s var(--ease),transform .4s var(--ease);border-radius:0}
.btn{--sweep:var(--plum-deep);background-image:linear-gradient(var(--sweep),var(--sweep));background-repeat:no-repeat;background-position:50% 100%;background-size:100% 0}
.btn:hover{background-size:100% 100%;border-color:var(--plum-deep)}
.btn:active{transform:scale(.985)}
.btn-ghost{--sweep:var(--plum);background-color:transparent;color:var(--plum)}
.btn-ghost:hover{color:var(--cream);border-color:var(--plum)}
.btn-light{--sweep:var(--plum-deep);background-color:var(--cream);border-color:var(--cream);color:var(--plum-deep)}
.btn-light:hover{color:var(--cream);border-color:var(--cream)}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.link{background:none;border:0;padding:0;cursor:pointer;color:var(--plum);text-decoration:underline;text-underline-offset:4px}
.textlink{font-size:11px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--plum);padding-bottom:4px;background:linear-gradient(currentColor,currentColor) 0 100%/100% 1px no-repeat;transition:background-size .6s var(--ease)}
.textlink:hover{animation:redraw 1.1s var(--ease-out)}
@keyframes redraw{0%{background-size:100% 1px;background-position:100% 100%}45%{background-size:0 1px;background-position:100% 100%}46%{background-position:0 100%}100%{background-size:100% 1px;background-position:0 100%}}
input,select,textarea{font-family:var(--sans);font-weight:300;font-size:15px;color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--sand);padding:12px 2px;border-radius:0;transition:border-color .4s var(--ease)}
input:focus,select:focus,textarea:focus{outline:none;border-bottom-color:var(--plum)}
select{background:var(--paper)}
.field span{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--taupe)}

/* announcement + header */
.announce{background:var(--plum-deep);color:var(--linen);text-align:center;font-size:10.5px;font-weight:400;letter-spacing:.3em;text-transform:uppercase;padding:11px var(--gutter)}
.notice{background:var(--linen);color:var(--plum-deep);text-align:center;font-family:var(--serif);font-style:italic;font-size:19px;padding:14px}
.hdr{position:sticky;top:0;z-index:30;background:var(--paper);border-bottom:1px solid transparent;transition:border-color .6s var(--ease),background-color .6s var(--ease),transform .9s var(--ease-out)}
.hdr.is-scrolled{border-bottom-color:rgba(90,16,40,.12);background-color:rgba(247,242,233,.9);backdrop-filter:saturate(1.2) blur(16px);-webkit-backdrop-filter:saturate(1.2) blur(16px)}
.hdr.is-hidden{transform:translateY(-101%)}
.hdr:focus-within,.hdr:has(details[open]){transform:none;backdrop-filter:none;-webkit-backdrop-filter:none;background-color:var(--paper)}
.scroll-progress{height:2px;background:var(--plum);z-index:60}
.hdr__in{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;height:96px;transition:height .6s var(--ease)}
.hdr.is-scrolled .hdr__in{height:76px}
.nav{display:flex;gap:30px;font-size:11px;font-weight:400;letter-spacing:.22em;text-transform:uppercase}
.nav--end{justify-content:flex-end;align-items:center}
.nav a,.nav summary{position:relative;padding:6px 0;cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:8px}
.nav summary::-webkit-details-marker{display:none}
.nav a::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--plum);transform:scaleX(0);transform-origin:right;transition:transform .6s var(--ease)}
.nav a:hover::after{transform:scaleX(1);transform-origin:left}
.wordmark{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--plum)}
.wordmark__text{display:flex;flex-direction:column;align-items:center;font-family:var(--serif);font-weight:400;text-transform:uppercase;line-height:1;color:var(--plum-deep)}
.wordmark__text span:first-child{font-size:10px;letter-spacing:.42em}
.wordmark__text span:last-child{font-size:21px;letter-spacing:.24em;margin-top:3px}
.hdr.is-scrolled .monogram{width:26px;height:26px}
.monogram{transition:width .6s var(--ease),height .6s var(--ease)}
.bag{display:inline-flex;align-items:center;gap:8px}
.bag__n{display:inline-grid;place-items:center;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:var(--plum);color:var(--cream);font-size:10px;letter-spacing:0}
.searchbox{position:relative}
.searchbox[open] .searchbox__panel{opacity:1;transform:none;pointer-events:auto}
.searchbox__panel{position:absolute;right:-12px;top:calc(100% + 18px);width:min(380px,80vw);background:var(--paper);border:1px solid rgba(90,16,40,.12);padding:22px;box-shadow:0 30px 60px -30px rgba(53,9,23,.35);opacity:0;transform:translateY(-6px);pointer-events:none;transition:.5s var(--ease)}
.searchbox__panel input{width:100%;font-family:var(--serif);font-size:22px;font-style:italic}
.burger{display:none}
.drawer{display:none}

/* hero */
.hero{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6vw,96px);align-items:center;padding-block:clamp(40px,7vw,96px) clamp(56px,8vw,120px)}
.hero h1{font-size:clamp(58px,9.4vw,138px);line-height:.92;letter-spacing:-.025em}
.hero h1 > span{display:block}
.hero h1 em{padding-left:.42em}
.hero__lede{max-width:25rem;font-size:17px;color:#4b3a40;margin:34px 0 40px}
.hero__cta{display:flex;flex-wrap:wrap;gap:14px}
.hero__aside{display:flex;align-items:center;gap:14px;margin-top:56px;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--taupe)}
.hero__aside::before{content:'';width:44px;height:1px;background:var(--mauve);opacity:.5}
.arch{position:relative;isolation:isolate}
.arch__frame{position:relative;overflow:hidden;border-radius:999px 999px 0 0;aspect-ratio:4/5;background:var(--linen)}
.arch__frame img{width:100%;height:100%;object-fit:cover;transform:scale(1.06);animation:settle 3.2s var(--ease) forwards}
.arch::before{content:'';position:absolute;inset:-18px 18px 18px -18px;border:1px solid rgba(90,16,40,.28);border-radius:999px 999px 0 0;z-index:-1}
.js .arch--hero::before{animation:halo 2.6s var(--ease-out) .9s both}
@keyframes drawin{from{opacity:0;transform:translateY(18px)}}
@keyframes halo{from{opacity:0;transform:translate(18px,-18px)}}
html.js [data-reveal=mask]{opacity:1;transform:none}
.arch__frame,.ritual__img .zoom{transition:clip-path 2.1s var(--ease-wipe) var(--d,0ms)}
.js [data-reveal=mask]:not(.is-in) .arch__frame{clip-path:inset(100% 0 0 0)}
.js [data-reveal=mask]:not(.is-in) .zoom{clip-path:inset(0 100% 0 0)}
.arch__caption{position:absolute;left:-36px;bottom:48px;max-width:250px;background:rgba(251,248,243,.92);backdrop-filter:blur(8px);padding:20px 22px;font-family:var(--serif);font-size:19px;line-height:1.3;color:var(--plum-deep);box-shadow:0 24px 50px -28px rgba(53,9,23,.5)}
.arch__caption small{display:block;font-family:var(--sans);font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--taupe);margin-top:10px}
@keyframes settle{to{transform:scale(1)}}

/* trust strip */
.strip{border-top:1px solid rgba(90,16,40,.12);border-bottom:1px solid rgba(90,16,40,.12)}
.strip .marquee{padding:18px 0;font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:#4b3a40;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.tick{display:inline-flex;align-items:center;gap:14px;white-space:nowrap}
.strip .crescent{color:var(--mauve)}

/* sections */
.sec{padding-block:clamp(72px,11vw,150px)}
.sec__head{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:end;margin-bottom:56px}
.sec__head .eyebrow{margin-bottom:18px}
.sec__head h2{font-size:clamp(40px,5.4vw,72px)}
.sec__head > p{margin:0;color:var(--taupe);max-width:26rem;justify-self:end}

/* category tiles */
.ctiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;list-style:none;margin:0;padding:0}
.ctile{position:relative;display:flex;flex-direction:column;justify-content:flex-end;aspect-ratio:3/4.3;padding:24px 22px;overflow:hidden;transition:transform .9s var(--ease)}
.ctile:hover{transform:translateY(-6px)}
.ctile--cream{background:linear-gradient(170deg,#f6efe3 0%,#eadbc6 100%)}
.ctile--sand{background:linear-gradient(170deg,#efe6dc 0%,#d9cbbd 100%)}
.ctile--plum{background:linear-gradient(170deg,#7a2141 0%,#4a0d23 100%);color:var(--cream)}
.ctile__c{position:absolute;top:-.12em;right:-.12em;font-family:var(--serif);font-size:min(17vw,230px);line-height:1;color:rgba(90,16,40,.1);transition:transform 1.4s var(--ease)}
.ctile--plum .ctile__c{color:rgba(247,242,233,.1)}
.ctile:hover .ctile__c{transform:rotate(-8deg) translateY(6px)}
.ctile__num{font-family:var(--serif);font-style:italic;font-size:17px;opacity:.7;margin-bottom:auto}
.ctile__name{font-family:var(--serif);font-size:clamp(24px,2.2vw,32px);line-height:1.05}
.ctile__go{margin-top:12px;font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;opacity:.85}

/* ritual */
.ritual{display:grid;grid-template-columns:1fr 1fr;min-height:640px;background:var(--plum-deep);color:var(--cream)}
.ritual__img{position:relative;overflow:hidden}
.ritual__img .zoom{height:100%}
.ritual__img img{width:100%;height:100%;object-fit:cover}
.ritual__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(48px,7vw,110px)}
.ritual__copy .eyebrow{color:var(--rose)}
.ritual__copy h2{font-size:clamp(42px,5vw,70px);color:var(--cream)}
.ritual__copy h2 em{color:var(--rose)}
.ritual__copy p{max-width:27rem;color:rgba(247,242,233,.78);margin:28px 0 40px}
.ritual__list{list-style:none;padding:0;margin:0 0 42px;display:grid;gap:12px;font-family:var(--serif);font-size:21px;font-style:italic;color:var(--linen)}
.ritual__list li{display:flex;align-items:center;gap:14px}
.ritual__list .crescent{color:var(--mauve)}

/* product grid */
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:40px}
.chips a{display:inline-flex;align-items:center;min-height:44px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;padding:10px 18px;border:1px solid rgba(90,16,40,.2);transition:background-color .6s var(--ease),color .6s var(--ease),border-color .6s var(--ease),opacity .9s var(--ease),transform 1s var(--ease-out)}
.chips a:hover,.chips a.on{background:var(--plum);border-color:var(--plum);color:var(--cream)}
.pgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:48px 22px;list-style:none;margin:0;padding:0}
.pcard{display:flex;flex-direction:column;gap:12px}
.pcard__frame{position:relative;overflow:hidden;aspect-ratio:4/5;background:var(--linen);isolation:isolate}
.pcard__img{display:block;width:100%;height:100%;object-fit:cover;transition:transform 1.8s var(--ease-out),opacity 1.1s var(--ease)}
.pcard:hover .pcard__img{transform:scale(1.045)}
.pcard__alt{position:absolute;inset:0;opacity:0;transform:scale(1.06)}
.pcard__ph.pcard__alt .crescent{color:inherit;opacity:.5}
.pcard__ph--plum.pcard__alt{color:var(--rose)}
.pcard:hover .pcard__alt,.pcard:focus-visible .pcard__alt{opacity:1;transform:scale(1)}
.pcard__cta{position:absolute;left:50%;bottom:16px;z-index:2;translate:-50% 0;padding:11px 22px;background:rgba(251,248,243,.94);color:var(--plum-deep);font-size:10px;font-weight:500;letter-spacing:.26em;text-transform:uppercase;opacity:0;transform:translateY(10px);transition:opacity .7s var(--ease),transform .9s var(--ease-out);pointer-events:none}
@media (hover:hover){.pcard:hover .pcard__cta{opacity:1;transform:none}.pcard:hover .pcard__chip:not(.pcard__chip--sale){opacity:0}}
.pcard__chip{transition:opacity .5s var(--ease)}
.pcard__title span{background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .9s var(--ease-out);padding-bottom:2px}
.pcard:hover .pcard__title span,.pcard:focus-visible .pcard__title span{background-size:100% 1px}
.pcard__ph{display:grid;place-items:center}
.pcard__ph--cream{background:linear-gradient(160deg,#f3ebdf,#e4d4c2)}
.pcard__ph--plum{background:linear-gradient(160deg,#6a1a36,#3d0b1e)}
.pcard__c{font-family:var(--serif);font-size:clamp(90px,10vw,150px);line-height:1;color:rgba(90,16,40,.16)}
.pcard__ph--plum .pcard__c{color:rgba(247,242,233,.14)}
.pcard__chip{position:absolute;left:14px;bottom:14px;background:rgba(251,248,243,.92);color:var(--plum);font-size:9.5px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;padding:6px 10px}
.pcard__chip--sale{left:auto;right:14px;top:14px;bottom:auto;background:var(--plum);color:var(--cream)}
.pcard__title{font-family:var(--serif);font-size:23px;line-height:1.15;margin-top:6px}
.pcard__meta{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--taupe)}
.price{color:var(--ink);font-weight:400}
.compare{text-decoration:line-through;color:var(--taupe);margin-left:8px;font-size:.9em}

/* steps */
.steps{background:var(--linen)}
.steps__grid{display:grid;grid-template-columns:repeat(3,1fr);background:var(--paper)}
.step{position:relative;padding:48px 40px 52px;border-left:1px solid rgba(90,16,40,.1)}
.step::before{content:'';position:absolute;left:40px;right:40px;top:0;height:1px;background:var(--plum);transform-origin:0 50%;transform:scaleX(0);transition:transform 1.6s var(--ease-out);transition-delay:calc(var(--i,0) * 110ms + 500ms)}
.step.is-in::before,html:not(.js) .step::before{transform:scaleX(.18)}
.step:first-child{border-left:0}
.step__n{font-family:var(--serif);font-style:italic;font-size:44px;color:var(--plum);line-height:1}
.step h3{font-size:30px;margin:34px 0 14px}
.step p{margin:0;color:#4b3a40;font-size:15px}

/* promise */
.promise ul{display:grid;grid-template-columns:repeat(3,1fr);list-style:none;margin:0;padding:0;border-top:1px solid rgba(90,16,40,.14);border-bottom:1px solid rgba(90,16,40,.14)}
.promise li{padding:46px 28px;text-align:center;border-left:1px solid rgba(90,16,40,.14)}
.promise li:first-child{border-left:0}
.promise strong{display:block;font-family:var(--serif);font-weight:400;font-size:30px;color:var(--plum-deep)}
.promise span{display:block;margin-top:8px;color:var(--taupe);font-size:14px}

/* story */
.story{text-align:center;max-width:960px;margin:0 auto}
.story__p{display:inline-grid;place-items:center;width:84px;height:84px;border-radius:50%;border:1px solid rgba(90,16,40,.3);font-family:var(--serif);font-style:italic;font-size:42px;color:var(--plum);margin-bottom:34px}
.story blockquote{margin:0;font-family:var(--serif);font-weight:300;font-size:clamp(32px,4.4vw,58px);line-height:1.12;color:var(--ink)}
.story blockquote em{color:var(--plum)}
.story p{max-width:36rem;margin:32px auto 40px;color:#4b3a40}
.story .eyebrow{color:var(--plum);margin:0 0 22px}
.story__sig{font-family:var(--serif);font-style:italic;font-size:22px;color:var(--plum);margin:-12px 0 40px}

/* newsletter */
.join{position:relative;isolation:isolate;background:var(--plum);color:var(--cream);text-align:center;padding:clamp(80px,10vw,130px) var(--gutter);overflow:hidden}
.join__c{position:absolute;inset:0;z-index:-1;display:grid;place-items:center;font-family:var(--serif);font-size:min(80vw,820px);line-height:1;color:rgba(247,242,233,.045);pointer-events:none}
.join .eyebrow{color:var(--rose)}
.join h2{font-size:clamp(42px,5.6vw,76px);color:var(--cream)}
.join h2 em{color:var(--rose)}
.join__moon{display:flex;justify-content:center;margin-bottom:22px}.join__moon .crescent{color:var(--rose)}
.join__lede{max-width:30rem;margin:22px auto 38px;color:rgba(247,242,233,.8)}
.join__form{position:relative;display:flex;max-width:520px;margin:0 auto;border-bottom:1px solid rgba(247,242,233,.5)}
.join__form input{flex:1;min-width:0;border:0;color:var(--cream);font-size:16px;padding:16px 4px}
.join__form input::placeholder{color:rgba(247,242,233,.6)}
.join__form button{background:transparent;border:0;color:var(--cream);padding:16px 4px 16px 20px;background-image:linear-gradient(var(--rose),var(--rose));background-repeat:no-repeat;background-position:100% calc(100% - 10px);background-size:0 1px}
.join__form button:hover{color:var(--rose);background-size:calc(100% - 24px) 1px}
.join__form::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:1px;background:var(--rose);transform:scaleX(0);transition:transform 1.2s var(--ease-out)}
.join__form:focus-within::after{transform:none}
.join__fine{margin-top:18px;font-size:12px;color:rgba(247,242,233,.55)}

/* footer */
.ftr{background:var(--ink);color:rgba(247,242,233,.72);padding:80px 0 34px;font-size:14px}
.ftr__grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:40px}
.ftr .wordmark{align-items:flex-start;color:var(--rose)}
.ftr .wordmark__text{align-items:flex-start;color:var(--cream)}
.ftr__about{max-width:20rem;margin:22px 0 0}
.ftr h4{font-family:var(--sans);font-size:10.5px;font-weight:500;letter-spacing:.26em;text-transform:uppercase;color:var(--cream);margin:6px 0 20px}
.ftr ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.ftr a:hover{color:var(--cream)}
.ftr__mark{margin:clamp(64px,8vw,110px) 0 0;font-family:var(--serif);font-weight:300;font-size:clamp(40px,9.6vw,150px);line-height:.95;letter-spacing:-.02em;white-space:nowrap;color:rgba(247,242,233,.92);text-align:center}
.ftr__mark em{font-style:italic;color:var(--rose)}
.ftr__base{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-top:40px;padding-top:26px;border-top:1px solid rgba(247,242,233,.1);font-size:12px;color:rgba(247,242,233,.5)}

/* inner pages */
.pagehead{text-align:center;padding-block:clamp(56px,8vw,110px) clamp(36px,5vw,64px)}
.pagehead h1{font-size:clamp(46px,6.4vw,92px)}
.pagehead .rule{margin-top:28px}
.inner{padding-bottom:clamp(72px,9vw,130px)}
.inner > .narrow{max-width:760px;margin:0 auto}
.listing-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 40px;padding-bottom:18px;border-bottom:1px solid rgba(90,16,40,.12);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--taupe)}
.listing-bar select{font-size:12px;letter-spacing:.1em;text-transform:none}
.pager{display:flex;gap:22px;align-items:center}
.pager a{color:var(--plum)}

/* product page */
.pdp{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(32px,6vw,96px);padding-block:clamp(28px,4vw,56px) clamp(64px,8vw,110px)}
.gallery-main{aspect-ratio:4/5;object-fit:cover;background:var(--linen)}
.gallery .ph{aspect-ratio:4/5}
.thumbs{gap:10px}
.thumbs img{width:76px;height:94px}
.pdp__info{position:sticky;top:120px;align-self:start}
.crumbs{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--taupe);margin-bottom:30px}
.crumbs a:hover{color:var(--plum)}
.pdp h1{font-size:clamp(40px,4.6vw,62px)}
.pdp__price{font-size:22px;margin:18px 0 8px}
.pdp__price .price{font-family:var(--serif);font-size:30px}
.pdp__desc{color:#4b3a40;white-space:pre-line;margin:28px 0}
.buy{gap:20px;margin:30px 0}
.buy select{width:100%;max-width:none}
.buy-row{gap:12px}
.buy-row input[type=number]{width:80px;text-align:center;border:1px solid var(--sand);padding:0}
.buy-row .btn{flex:1}
.acc{border-top:1px solid rgba(90,16,40,.14)}
.acc details{border-bottom:1px solid rgba(90,16,40,.14)}
.acc summary{list-style:none;display:flex;justify-content:space-between;align-items:center;padding:20px 0;cursor:pointer;font-size:11px;letter-spacing:.24em;text-transform:uppercase}
.acc summary::-webkit-details-marker{display:none}
.acc summary::after{content:'+';font-family:var(--serif);font-size:24px;color:var(--plum);transition:transform .5s var(--ease)}
.acc details[open] summary::after{transform:rotate(45deg)}
.acc p{margin:0 0 22px;color:#4b3a40;font-size:15px}
@supports (interpolate-size:allow-keywords){.acc{interpolate-size:allow-keywords}.acc details::details-content{height:0;overflow:clip;transition:height .7s var(--ease-out),content-visibility .7s allow-discrete}.acc details[open]::details-content{height:auto}}
.thumbs a{overflow:hidden}.thumbs img{transition:opacity .6s var(--ease),transform 1.2s var(--ease-out)}.thumbs a:hover img{transform:scale(1.06)}
.reviews-wrap{border-top:1px solid rgba(90,16,40,.12);padding:clamp(56px,7vw,96px) 0}
.reviews{max-width:860px;margin:0 auto}
.reviews h2{font-size:clamp(36px,4vw,54px);text-align:center;margin-bottom:12px}
.reviews > p{text-align:center}
.stars{color:var(--plum);letter-spacing:3px}
.review{padding:30px 0;border-bottom:1px solid rgba(90,16,40,.12)}
.review strong{font-family:var(--serif);font-weight:400;font-size:22px;display:block;margin-top:6px}
.review-form{margin:40px auto 0;max-width:520px}
.review-form h3{font-size:30px}

/* cart, orders, account */
.cart-table td{padding:22px 10px;border-bottom:1px solid rgba(90,16,40,.12)}
.cart-table a{font-family:var(--serif);font-size:22px}
.cart-img img{width:84px;height:104px}
.cart-table input{width:64px;text-align:center;border:1px solid var(--sand)}
.totals{font-size:15px;min-width:20rem}
.totals .total{font-family:var(--serif);font-size:26px;font-weight:400;color:var(--plum-deep)}
.discount-form input{min-width:12rem}
.checkout-form{margin-top:34px;gap:16px}
.checkout-form input{min-width:18rem}
.error{color:var(--wine);font-style:italic}
.empty{padding:60px 0}
.empty::before{content:'';display:block;width:46px;height:46px;margin:0 auto 26px;background:var(--plum);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M27 6.5A15 15 0 1 0 33.5 30 12.5 12.5 0 1 1 27 6.5Z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M27 6.5A15 15 0 1 0 33.5 30 12.5 12.5 0 1 1 27 6.5Z'/%3E%3C/svg%3E") center/contain no-repeat;animation:rise 2.4s var(--ease-out) both}
@keyframes rise{from{opacity:0;transform:translateY(18px) rotate(-14deg)}}
.empty p{font-family:var(--serif);font-size:28px}
.order-done h1{font-size:clamp(40px,5vw,64px)}
.order-lines{max-width:none}
.order-lines li{border-bottom:1px solid rgba(90,16,40,.1);padding:14px 0}
.orders-list li{padding:18px 0;border-bottom-color:rgba(90,16,40,.12)}
.orders-list a{font-family:var(--serif);font-size:22px;color:var(--plum)}
.stack{gap:18px}

/* story page */
.longform{max-width:760px;margin:0 auto;font-size:18px;color:#3d2c32}
.longform h2{font-size:clamp(34px,3.8vw,50px);margin:70px 0 22px}
.longform p{margin:0 0 22px}
.longform .lead{font-family:var(--serif);font-size:clamp(26px,2.8vw,34px);line-height:1.3;color:var(--ink)}
.portrait{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,72px);align-items:center;max-width:1080px;margin:0 auto 40px}
.portrait .arch__frame{aspect-ratio:4/5}
.pillars{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;list-style:none;padding:0;margin:30px 0}
.pillars li{background:linear-gradient(var(--plum),var(--plum)) 0 0/100% 1px no-repeat;padding-top:14px;font-family:var(--serif);font-size:21px}
.js .pillars li:not(.is-in){background-size:0 1px}
.js .pillars li{transition:opacity 1.4s var(--ease),transform 1.6s var(--ease-out),background-size 1.6s var(--ease-out);transition-delay:calc(var(--i,0) * 110ms)}
.pillars li span{display:block;font-family:var(--sans);font-size:10px;letter-spacing:.22em;color:var(--taupe)}

/* motion */
html.js [data-reveal]{transition:opacity 1.4s var(--ease),transform 1.6s var(--ease-out),clip-path 1.9s var(--ease-wipe);transition-delay:calc(var(--i,0) * 110ms + var(--d,0ms))}
html.js [data-reveal=up]{transform:translateY(24px)}
html.js [data-reveal]:not([data-reveal=clip]):not([data-reveal=wipe]).is-in{clip-path:none}
.split .w>span{transition:transform 1.5s var(--ease-out);transition-delay:calc(var(--i,0) * 80ms + var(--d,0ms))}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html.js [data-reveal]{opacity:1;transform:none;clip-path:none}.arch__frame,.zoom{clip-path:none!important}.draw path{stroke-dashoffset:0!important;fill-opacity:1!important}.rule--lg .draw path{fill-opacity:.12!important}.rule::before,.rule::after{transform:none!important}.step::before{transform:scaleX(.18)!important}.hdr.is-hidden{transform:none}html{scroll-behavior:auto}}

/* responsive */
@media(max-width:1080px){.ctiles{grid-template-columns:repeat(3,1fr)}.pgrid{grid-template-columns:repeat(3,1fr)}.ftr__grid{grid-template-columns:1fr 1fr}.pillars{grid-template-columns:repeat(2,1fr)}}
@media(max-width:860px){
  .nav--start,.nav--end .hide-m{display:none}
  .burger{display:block}
  .burger summary{list-style:none;cursor:pointer;padding:8px 0;font-size:11px;letter-spacing:.22em;text-transform:uppercase}
  .burger summary::-webkit-details-marker{display:none}
  .burger[open] .drawer{display:flex}
  .drawer{position:fixed;inset:0;z-index:40;flex-direction:column;gap:6px;background:var(--paper);padding:90px var(--gutter) 40px;overflow:auto}
  .drawer a{font-family:var(--serif);font-size:36px;line-height:1.3}
  .burger[open] .drawer a{animation:drawin 1.1s var(--ease-out) both}
  .burger[open] .drawer a:nth-child(n+2){animation-delay:calc(var(--n,1) * 60ms)}
  .drawer a:nth-child(3){--n:2}.drawer a:nth-child(4){--n:3}.drawer a:nth-child(5){--n:4}.drawer a:nth-child(6){--n:5}.drawer a:nth-child(7){--n:6}.drawer a:nth-child(n+8){--n:7}
  .drawer .close{position:absolute;top:28px;left:var(--gutter);font-size:11px;letter-spacing:.22em;text-transform:uppercase}
  .hdr__in{grid-template-columns:1fr auto 1fr;height:80px}
  .hero,.ritual,.pdp,.portrait{grid-template-columns:1fr}
  .hero{padding-top:28px}
  .strip ul{flex-direction:column;align-items:center;gap:10px}
  .hero__copy{order:2}
  .arch{margin:0 18px}
  .arch__caption{left:-8px;bottom:20px;font-size:17px;max-width:210px}
  .sec__head{grid-template-columns:1fr}.sec__head > p{justify-self:start}
  .ctiles{grid-template-columns:repeat(2,1fr)}
  .pgrid{grid-template-columns:repeat(2,1fr);gap:34px 14px}
  .pcard__title{font-size:19px}
  .ritual__img{aspect-ratio:4/5}
  .steps__grid,.promise ul{grid-template-columns:1fr}
  .step,.promise li{border-left:0;border-top:1px solid rgba(90,16,40,.1)}
  .pdp__info{position:static}
  .checkout-form input{min-width:0;width:100%}
}
@media(max-width:520px){.ctiles li:last-child{grid-column:span 2}.ctile{aspect-ratio:auto;min-height:220px}.hero__cta .btn{flex:1}.ftr__grid{grid-template-columns:1fr}}
`;

function Picture({ name, alt, eager = false }: { name: string; alt: string; eager?: boolean }) {
  return (
    <img
      src={`${IMG}/${name}.webp`}
      srcset={`${IMG}/${name}-640.webp 640w, ${IMG}/${name}.webp 1122w`}
      sizes="(max-width: 860px) 100vw, 55vw"
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...(eager ? { fetchpriority: 'high' } : {})}
    />
  );
}

function StoryPage({ store }: { store: Store }) {
  return (
    <>
      <div class="wrap pagehead">
        <Eyebrow>Our story</Eyebrow>
        <h1 class="split" style="--d:100ms">
          Where calm <em>begins</em>
        </h1>
        <Rule />
      </div>
      <div class="wrap inner">
        <div class="portrait">
          <div class="arch" data-reveal="mask">
            <div class="arch__frame"><Picture name="sleepwear-bedroom" alt="Three women in Maison de Chantal striped pyjamas and a satin robe in a calm bedroom" /></div>
          </div>
          <div data-reveal="up" style="--d:300ms">
            <Eyebrow>Meet Patricia</Eyebrow>
            <p class="longform lead" style="margin:0">
              Patricia is a mother, a working professional and the founder of {store.name}. She knows how easily personal time disappears inside a busy day.
            </p>
            <p class="story__sig" style="margin:26px 0 0">Patricia, Founder</p>
          </div>
        </div>
        <div class="longform">
          <h2 class="split">How the idea began</h2>
          <p data-reveal="up">Maison de Chantal began with a simple observation. The evening is often the first quiet moment a busy woman has for herself.</p>
          <p data-reveal="up">Patricia wanted to create one place for beautiful sleep, comforting scent and thoughtful gifts, presented with care and priced to stay within reach.</p>
          <h2 class="split">The Maison</h2>
          <p data-reveal="up">A focused collection for sleep, comfort and considered gifting.</p>
          <ul class="pillars" data-stagger="up">
            <li><span>01</span>Sleep</li>
            <li><span>02</span>Nightwear</li>
            <li><span>03</span>Home Scent</li>
            <li><span>04</span>Cosy Extras</li>
            <li><span>05</span>Gift Sets</li>
          </ul>
          <h2 class="split">Our promise</h2>
          <p data-reveal="up">We help women create calmer evenings through beautiful products, thoughtful gifting and a home that feels more restorative.</p>
        </div>
      </div>
      <Rule size={40} large />
      <section class="wrap promise">
        <ul data-stagger="up">
          <li><strong>Premium feel</strong><span>Satin, bamboo and silk, finished with care.</span></li>
          <li><strong>Accessible prices</strong><span>Quiet luxury that stays within reach.</span></li>
          <li><strong>Calm at home</strong><span>Everything chosen for the evening hours.</span></li>
        </ul>
      </section>
      <div class="sec" style="text-align:center" data-reveal="up">
        <a class="btn" href="/products">Discover the collection</a>
      </div>
    </>
  );
}

function DeliveryPage({ store }: { store: Store }) {
  return (
    <>
      <div class="wrap pagehead">
        <Eyebrow>Help</Eyebrow>
        <h1 class="split" style="--d:100ms">
          Delivery <em>and</em> returns
        </h1>
        <Rule />
      </div>
      <div class="wrap inner">
        <div class="longform">
          <p class="lead">Every order is wrapped with care and sent with tracking, so it arrives the way we would want to receive it.</p>
          <h2 class="split">Delivery</h2>
          <p data-reveal="up">We deliver across the United Kingdom. Delivery costs are shown in your bag before you pay, and you will receive an email with tracking as soon as your order is on its way.</p>
          <h2 class="split">Returns</h2>
          <p data-reveal="up">If something is not quite right, write to us{store.supportEmail ? <> at <a class="link" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></> : null} and we will help. Unworn items in their original packaging can be returned for a refund.</p>
          <h2 class="split">Your order</h2>
          <p data-reveal="up">
            You can <a class="link" href="/track">track an order</a> with your order number and email, or <a class="link" href="/account">sign in</a> to see everything you have ordered.
          </p>
        </div>
      </div>
    </>
  );
}

export const maison: Theme = {
  id: 'maison',
  name: 'Maison',
  description: 'Quiet luxury for Maison de Chantal: cream paper, plum, serif display type and slow, calm motion.',
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const nav = categories.slice(0, 4);
    return (
      <html lang="en-GB">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <div class="scroll-progress" aria-hidden="true"></div>
          <a class="sr" href="#main">Skip to content</a>
          <div class="announce">{store.themeSettings.announcement ?? 'Thoughtful comfort, delivered across the UK'}</div>
          <Notice text={notice} />
          <header class="hdr" data-hide-on-scroll>
            <div class="wrap hdr__in">
              <nav class="nav nav--start" aria-label="Collections">
                {nav.length ? nav.map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>) : <a href="/products">Shop</a>}
              </nav>
              <details class="burger">
                <summary aria-label="Menu">Menu</summary>
                <div class="drawer">
                  <a class="close" href="#" onclick="this.closest('details').removeAttribute('open');return false">Close</a>
                  <a href="/products">Shop all</a>
                  {categories.map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
                  <a href="/pages/our-story">Our story</a>
                  <a href="/account">{customer ? 'Your account' : 'Sign in'}</a>
                </div>
              </details>
              <a href="/" aria-label={`${store.name}, home`}><Wordmark /></a>
              <nav class="nav nav--end" aria-label="Account">
                <details class="searchbox hide-m">
                  <summary aria-label="Search"><SearchIcon /> Search</summary>
                  <form class="searchbox__panel" method="get" action="/search" role="search">
                    <input type="search" name="q" placeholder="What are you looking for?" aria-label="Search the shop" />
                  </form>
                </details>
                <a class="hide-m" href="/pages/our-story">Our story</a>
                <a class="hide-m" href="/account">{customer ? 'Account' : 'Sign in'}</a>
                <a class="bag" href="/cart" aria-label={`Bag, ${cartCount} items`}>
                  <BagIcon />
                  <span class="bag__n">{cartCount}</span>
                </a>
              </nav>
            </div>
          </header>
          <main id="main">{children}</main>
          <Newsletter />
          <footer class="ftr">
            <div class="wrap">
              <div class="ftr__grid">
                <div>
                  <Wordmark />
                  <p class="ftr__about">Thoughtful sleepwear, home scent and considered comforts for softer evenings.</p>
                </div>
                <div>
                  <h4>Shop</h4>
                  <ul>
                    <li><a href="/products">Everything</a></li>
                    {categories.slice(0, 5).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
                <div>
                  <h4>Help</h4>
                  <ul>
                    <li><a href="/pages/delivery">Delivery and returns</a></li>
                    <li><a href="/track">Track an order</a></li>
                    <li><a href="/account">Your account</a></li>
                    {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}>Contact us</a></li> : null}
                  </ul>
                </div>
                <div>
                  <h4>About</h4>
                  <ul>
                    <li><a href="/pages/our-story">Our story</a></li>
                    <li><a href="/pages/our-story">{TAGLINE}</a></li>
                  </ul>
                </div>
              </div>
              <p class="ftr__mark split" aria-hidden="true">Maison de <em>Chantal</em></p>
              <div class="ftr__base">
                <span>{raw('&copy;')} {new Date().getFullYear()} {store.name}</span>
                <span>{TAGLINE}</span>
              </div>
            </div>
          </footer>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories }) => {
    const first = categories[0];
    const scent = categories.find((c) => c.slug.includes('scent'));
    return (
      <>
        <section class="wrap hero">
          <div class="hero__copy">
            <p class="eyebrow" data-reveal="up">{store.name}</p>
            <h1 class="split" style="--d:150ms">
              <span>Where</span>
              <span>
                <em>calm</em>
              </span>
              <span>begins</span>
            </h1>
            <p class="hero__lede" data-reveal="up" style="--d:650ms">{store.themeSettings.tagline ?? 'Thoughtful sleepwear, home scent and considered comforts for softer evenings and beautifully settled homes.'}</p>
            <div class="hero__cta" data-reveal="up" style="--d:800ms">
              <a class="btn" href={first ? `/collections/${first.slug}` : '/products'}>Shop {first ? first.name.toLowerCase() : 'the collection'}</a>
              <a class="btn btn-ghost" href={scent ? `/collections/${scent.slug}` : '/products'}>Explore {scent ? scent.name.toLowerCase() : 'more'}</a>
            </div>
            <p class="hero__aside" data-reveal="fade" style="--d:1100ms">For the first quiet hour of the evening</p>
          </div>
          <div class="arch arch--hero" data-reveal="mask">
            <div class="arch__frame"><Picture name="nightwear-illustration" alt="Three women in burgundy satin nightdresses with lace trim" eager /></div>
            <p class="arch__caption" data-reveal="fade" data-parallax style="--p:-26px;--d:1300ms">
              Burgundy satin nightwear, designed for quiet moments.
              <small>The nightwear edit</small>
            </p>
          </div>
        </section>
        <Ticker />
        {categories.length ? (
          <section class="wrap sec">
            <div class="sec__head">
              <div>
                <Eyebrow>The collection</Eyebrow>
                <h2 class="split">
                  Comfort, <em>considered</em>
                </h2>
              </div>
              <p data-reveal="up" style="--d:300ms">Five carefully connected collections that bring together the bedroom, the evening ritual and thoughtful gifting.</p>
            </div>
            <CategoryTiles categories={categories} />
          </section>
        ) : null}
        <section class="ritual">
          <div class="ritual__img" data-reveal="mask">
            <div class="zoom" data-zoom-on-scroll><Picture name="sleepwear-bedroom" alt="Striped satin pyjamas and a burgundy robe in a softly lit bedroom" /></div>
          </div>
          <div class="ritual__copy">
            <Eyebrow>The evening ritual</Eyebrow>
            <h2 class="split" style="--d:200ms">
              Soften the room.
              <br />
              <em>Settle into the night.</em>
            </h2>
            <p data-reveal="up" style="--d:500ms">Layer gentle fragrance, warm light and beautifully tactile pieces to create an evening that feels entirely your own.</p>
            <ul class="ritual__list" data-stagger="left" style="--d:600ms">
              <li><Crescent size={14} />Satin that warms to the skin</li>
              <li><Crescent size={14} />Scent that settles the room</li>
              <li><Crescent size={14} />Slippers by the bed</li>
            </ul>
            <div data-reveal="up" style="--d:900ms"><a class="btn btn-light" href={scent ? `/collections/${scent.slug}` : '/products'}>Begin the ritual</a></div>
          </div>
        </section>
        <section class="wrap sec">
          <div class="sec__head">
            <div>
              <Eyebrow>Bestsellers and new arrivals</Eyebrow>
              <h2 class="split">
                Complete <em>the calm</em>
              </h2>
            </div>
            <p data-reveal="up" style="--d:300ms">Sleep, scent and small comforts, chosen to make the evening feel a little more like yours.</p>
          </div>
          <nav class="chips" aria-label="Shop by collection" data-stagger="fade">
            <a class="on" href="/products">All</a>
            {categories.map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
          </nav>
          <ProductCards store={store} products={products.slice(0, 8)} />
          <div style="text-align:center;margin-top:64px" data-reveal="up">
            <a class="textlink" href="/products">View everything</a>
          </div>
        </section>
        <section class="steps sec">
          <div class="wrap">
            <div class="sec__head">
              <div>
                <Eyebrow>Three steps to calm</Eyebrow>
                <h2 class="split">
                  An evening, <em>beautifully</em> considered
                </h2>
              </div>
              <p data-reveal="up" style="--d:300ms">Small, practical rituals that turn the end of a busy day into time that is truly yours.</p>
            </div>
            <div class="steps__grid">
              <article class="step" data-reveal="up" style="--i:0">
                <span class="step__n">i.</span>
                <h3>Prepare the room</h3>
                <p>Fresh bedding, gentle fragrance and everything placed with intention.</p>
              </article>
              <article class="step" data-reveal="up" style="--i:1">
                <span class="step__n">ii.</span>
                <h3>Soften the light</h3>
                <p>Warm bedside lighting and quiet details create a calmer atmosphere.</p>
              </article>
              <article class="step" data-reveal="up" style="--i:2">
                <span class="step__n">iii.</span>
                <h3>Settle into sleep</h3>
                <p>Comfort-led nightwear and tactile layers complete the evening.</p>
              </article>
            </div>
          </div>
        </section>
        <section class="wrap sec">
          <div class="story">
            <span class="story__p" data-reveal="scale">P</span>
            <Eyebrow>Our story</Eyebrow>
            <blockquote class="split" style="--d:150ms">
              Created from a simple belief that home should offer <em>comfort, calm</em> and a genuine sense of care.
            </blockquote>
            <p data-reveal="up" style="--d:300ms">Patricia founded {store.name} to make beautifully presented sleep, scent and comfort feel both special and within reach, especially for women whose own time is often the first thing to disappear from a busy day.</p>
            <p class="story__sig" data-reveal="fade" style="--d:400ms">Patricia, Founder</p>
            <div data-reveal="up" style="--d:500ms"><a class="btn btn-ghost" href="/pages/our-story">Read our story</a></div>
          </div>
        </section>
        <Rule size={40} large />
        <section class="wrap promise">
          <ul data-stagger="up">
            <li><strong>Premium feel</strong><span>Satin, bamboo and silk, finished with care.</span></li>
            <li><strong>Accessible prices</strong><span>Quiet luxury that stays within reach.</span></li>
            <li><strong>Calm at home</strong><span>Everything chosen for the evening hours.</span></li>
          </ul>
        </section>
        <div style="height:clamp(72px,9vw,130px)" />
      </>
    );
  },
  ProductGrid: ({ store, products }) => <ProductCards store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    return (
      <>
        <div class="wrap pdp">
          <Gallery product={product} image={props.image} />
          <div class="pdp__info">
            <p class="crumbs" data-reveal="fade"><a href="/">Home</a> / <a href="/products">Shop</a>{product.tags[0] ? ` / ${product.tags[0].replace(/-/g, ' ')}` : ''}</p>
            <h1 class="split" style="--d:100ms">{product.title}</h1>
            <p class="pdp__price" data-reveal="up" style="--d:350ms"><Price store={store} product={product} /></p>
            {product.ratingCount ? <p data-reveal="fade" style="--d:400ms"><Stars value={product.ratingAvg} count={product.ratingCount} /></p> : null}
            <p class="pdp__desc" data-reveal="up" style="--d:450ms">{product.description}</p>
            <div data-reveal="up" style="--d:550ms"><BuyBox store={store} product={product} label="Add to bag" /></div>
            <div class="acc" data-reveal="up" style="--d:650ms">
              <details>
                <summary>Delivery and returns</summary>
                <p>Sent across the UK with tracking. {store.freeShippingOver ? 'Free delivery on larger orders, shown in your bag.' : ''} Unworn items in their original packaging can be returned. <a class="link" href="/pages/delivery">Read more</a></p>
              </details>
              <details>
                <summary>Presentation</summary>
                <p>Every order is wrapped with care, ready to give or to keep.</p>
              </details>
              <details>
                <summary>Questions</summary>
                <p>{store.supportEmail ? <>Write to <a class="link" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a> and we will reply personally.</> : 'Reply to your order email and we will help personally.'}</p>
              </details>
            </div>
          </div>
        </div>
        <div class="reviews-wrap">
          <div class="wrap"><Reviews {...props} /></div>
        </div>
      </>
    );
  },
  Page: ({ title, children }) => (
    <>
      {title ? (
        <div class="wrap pagehead">
          <h1 class="split">{title}</h1>
          <Rule />
        </div>
      ) : (
        <div style="height:56px" />
      )}
      <div class="wrap inner">{children}</div>
    </>
  ),
  pages: {
    'our-story': { title: 'Our story', description: 'How Maison de Chantal began, and the calm it is made for.', render: StoryPage },
    delivery: { title: 'Delivery and returns', render: DeliveryPage },
  },
};
