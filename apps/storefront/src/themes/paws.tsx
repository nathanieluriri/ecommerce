import { raw } from 'hono/html';
import type { Child } from 'hono/jsx';
import type { Category, Product, Store } from '@shop/core';
import type { Theme } from './types';
import { BuyBox, Gallery, Head, Notice, Price, Reviews, Stars, inStock, money, priceRange } from './shared';

const FONTS = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400..700&display=swap';

const POPS = ['sun', 'coral', 'mint', 'sky', 'lilac', 'pink'];
const pop = (i: number) => `var(--${POPS[i % POPS.length]})`;

const svgUri = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const PAW_D = 'M32 36c-8 0-15 7-15 13 0 5 4 7 8 6 3-1 5-2 7-2s4 1 7 2c4 1 8-1 8-6 0-6-7-13-15-13zM14 22c-3.3 0-5.5 3.6-5 7.5.5 3.8 3.3 6.5 6.4 6 3-.4 4.6-4 4-7.6-.6-3.5-2.8-5.9-5.4-5.9zM50 22c3.3 0 5.5 3.6 5 7.5-.5 3.8-3.3 6.5-6.4 6-3-.4-4.6-4-4-7.6.6-3.5 2.8-5.9 5.4-5.9zM25 8c-3.4 0-5.6 3.8-5 8 .5 4 3.3 7 6.4 6.6 3.1-.4 4.9-4.3 4.2-8.3C30 10.6 27.6 8 25 8zM39 8c3.4 0 5.6 3.8 5 8-.5 4-3.3 7-6.4 6.6-3.1-.4-4.9-4.3-4.2-8.3C34 10.6 36.4 8 39 8z';
const PAW_BG = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#14296b" d="${PAW_D}"/></svg>`);
const PAW_PATTERN = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><g fill="#14296b" opacity=".09"><path transform="translate(8 10) scale(.5) rotate(-14 32 32)" d="${PAW_D}"/><path transform="translate(66 62) scale(.42) rotate(18 32 32)" d="${PAW_D}"/></g></svg>`,
);
const BLOB = 'M44.7-63.3C57.1-53.6 66-40 71.2-25s6.7 31.4 1.4 45.3S55.2 45.6 41.7 54.6 13.3 70.2-2.5 73.6s-32.5 3.6-45.2-4.2S-69 45.8-73.4 29.4-78-4-72.6-18.6-56.2-45.4-43.2-55 -15.1-71.6.4-72.2 32.3-67 44.7-63.3Z';

function Paw({ class: c, style }: { class?: string; style?: string }) {
  return (
    <svg class={`paw ${c ?? ''}`} style={style} viewBox="0 0 64 64" aria-hidden="true">
      <path d={PAW_D} fill="currentColor" />
    </svg>
  );
}

function Blob({ class: c }: { class?: string }) {
  return (
    <svg class={c} viewBox="-100 -100 200 200" aria-hidden="true" preserveAspectRatio="none">
      <path d={BLOB} fill="currentColor" />
    </svg>
  );
}

function Squiggle() {
  return (
    <svg class="squiggle" viewBox="0 0 160 14" aria-hidden="true" preserveAspectRatio="none">
      <path d="M2 8c10-8 16 6 26 0s16-8 26 0 16 6 26 0 16-8 26 0 16 6 26 0 16-8 26 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" pathLength="1" />
    </svg>
  );
}

const ICONS: Record<string, Child> = {
  truck: <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01" />,
  lock: <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2.5" />,
  chat: <path d="M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5" />,
  globe: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  dog: <path d="M7.5 5.5C5 5 3 7.5 3.2 11c.1 1.6 1 2.6 2.1 2.6L7 9.5M16.5 5.5C19 5 21 7.5 20.8 11c-.1 1.6-1 2.6-2.1 2.6L17 9.5M7 8c1.4-1.6 3-2.3 5-2.3S15.6 6.4 17 8v6a5 5 0 0 1-10 0zM10 11.2h.01M14 11.2h.01M10.8 15h2.4L12 16.3z" />,
  cat: <path d="M5 3.5 8.5 8h7L19 3.5V13a7 7 0 0 1-14 0zM9.6 12h.01M14.4 12h.01M11 15h2l-1 1.1zM2.5 14.5l4 .3M3 17.5l3.8-1M21.5 14.5l-4 .3M21 17.5l-3.8-1" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  bag: <path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.5-4 4.3-5.8 7.5-5.8s6 1.8 7.5 5.8" />,
  search: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.6-3.6" />,
};

function Icon({ name, size = 24, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {ICONS[name] ?? ICONS.star}
    </svg>
  );
}

function iconFor(title: string, i: number) {
  const t = title.toLowerCase();
  if (/deliver|ship to|ship |post/.test(t)) return /do you/.test(t) ? 'globe' : 'truck';
  if (/secur|ssl|pay|safe/.test(t)) return 'lock';
  if (/support|help|hand|team/.test(t)) return 'chat';
  if (/love|care|pick/.test(t)) return 'heart';
  return ['truck', 'lock', 'chat', 'heart', 'star'][i % 5]!;
}

function badgeFor(p: Product): string | null {
  const r = priceRange(p);
  if (r.compareAt && r.compareAt > r.min) return 'Sale';
  if (p.tags.some((t) => /^featured$/i.test(t))) return 'Top pick';
  if (p.tags.includes('Highly Rated')) return 'Fan fave';
  if (p.tags.includes('New Puppy') || p.tags.includes('New Kitten')) return 'Starter';
  return null;
}

function Card({ store, p, i = 0 }: { store: Store; p: Product; i?: number }) {
  const r = priceRange(p);
  const badge = badgeFor(p);
  return (
    <a class="card" href={`/products/${p.slug}`} style={`--tilt:${i % 2 ? 1.6 : -1.6}deg;--pop:${pop(i + 1)}`}>
      <span class="card__box">
        <span class="card__media">
          {p.images[0] ? <img data-vt data-fade src={p.images[0]} alt={p.title} loading="lazy" decoding="async" width="600" height="600" /> : <span class="card__ph" />}
          {p.images[1] ? <img class="card__alt" src={p.images[1]} alt="" loading="lazy" decoding="async" width="600" height="600" /> : null}
          {badge ? <span class="sticker">{badge}</span> : null}
          {!inStock(p) ? <span class="sticker sticker--out">Sold out</span> : null}
        </span>
        <span class="card__body">
          <span class="card__title">{p.title}</span>
          {p.ratingCount ? <Stars value={p.ratingAvg} count={p.ratingCount} /> : null}
          <span class="card__row">
            <span class="card__price">
              {r.min !== r.max ? <small>From </small> : null}
              {money(store, r.min)}
              {r.compareAt && r.compareAt > r.min ? <s>{money(store, r.compareAt)}</s> : null}
            </span>
            <span class="card__go" aria-hidden="true"><Icon name="arrow" size={18} stroke={2.4} /></span>
          </span>
        </span>
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

function Rail({ store, products, label }: { store: Store; products: Product[]; label: string }) {
  return (
    <div class="rail" role="list" aria-label={label} tabindex={0} data-stagger="up">
      {products.map((p, i) => (
        <div role="listitem" class="rail__item"><Card store={store} p={p} i={i} /></div>
      ))}
    </div>
  );
}

function Marquee({ items, tone = 'sun' }: { items: string[]; tone?: string }) {
  const row = items.map((t, i) => (
    <span class="tick">
      <Paw style={`color:${pop(i + 1)}`} />
      {t}
    </span>
  ));
  return (
    <div class="tickwrap">
      <div class={`ticker ticker--${tone}`}>
        <div class="marquee" style="--speed:38s;--gap:2.6rem">
          <div class="marquee__track">{row}</div>
          <div class="marquee__track" aria-hidden="true">{row}</div>
        </div>
      </div>
    </div>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  return (
    <section class="sec faqsec" aria-labelledby="faq-h">
      <div class="wrap faq">
        <div class="faq__head">
          <span class="eyebrow">Good to know</span>
          <h2 id="faq-h" class="split">Questions, <em>answered</em></h2>
        </div>
        <div class="faq__list" data-stagger="up">
          {items.map((f, i) => (
            <details open={i === 0} style={`--pop:${pop(i)}`}>
              <summary>{f.q}<span class="faq__pm" aria-hidden="true" /></summary>
              <div class="ans">{raw(f.a)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function tileImages(categories: Category[], pool: Product[]): Map<string, string | undefined> {
  const used = new Set<string>();
  const out = new Map<string, string | undefined>();
  for (const c of categories) {
    const id = c._id.toHexString();
    const hit = pool.find((p) => p.images[0] && !used.has(p.images[0]) && p.categoryIds.some((x) => x.toHexString() === id));
    const img = hit?.images[0] ?? (c.image && !used.has(c.image) ? c.image : undefined);
    if (img) used.add(img);
    out.set(id, img);
  }
  return out;
}

const css = `
:root{--a:var(--accent);--ink:#14296b;--sub:#4b5884;--cream:#fff6e8;--paper:#fffdf8;--line:#eedfc6;--sun:#ffcd45;--coral:#ff8a75;--mint:#6fd8bd;--sky:#a4d3ff;--lilac:#c7b6ff;--pink:#ffb8cb;
  --head:'Fredoka',ui-rounded,system-ui,sans-serif;--body:'DM Sans',system-ui,sans-serif;--r:26px;--ease:cubic-bezier(.34,1.56,.64,1)}
html{background:var(--cream)}
body{font-family:var(--body);color:var(--ink);background:var(--cream);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit;text-decoration:none}
h1,h2,h3,h4{font-family:var(--head);font-weight:600;line-height:1.05;letter-spacing:-.015em;margin:0}
em{font-style:normal}
.wrap{max-width:1320px;margin:0 auto;padding:0 20px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sr:focus{position:fixed;left:12px;top:12px;width:auto;height:auto;clip:auto;z-index:99;background:var(--ink);color:#fff;padding:10px 16px;border-radius:999px}
:focus-visible{outline:3px solid var(--ink);outline-offset:3px;border-radius:12px}
.muted{color:var(--sub)}
html.js [data-reveal]:not([data-reveal=clip]):not([data-reveal=wipe]).is-in{clip-path:none}
.paw{width:1em;height:1em;display:inline-block;flex:none}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font:600 13px var(--head);letter-spacing:.08em;text-transform:uppercase;color:var(--ink);background:var(--paper);border:2px solid var(--ink);padding:6px 14px;border-radius:999px;box-shadow:3px 3px 0 var(--ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;background:var(--ink);color:var(--paper);border:2px solid var(--ink);border-radius:999px;padding:12px 26px;font:600 16px var(--head);letter-spacing:.01em;cursor:pointer;box-shadow:0 4px 0 #0a1747;transition:transform .18s var(--ease),box-shadow .18s,background .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 0 #0a1747}
.btn:active{transform:translateY(3px);box-shadow:0 1px 0 #0a1747}
.btn--pop{background:var(--coral);color:var(--ink);box-shadow:0 4px 0 var(--ink)}
.btn--pop:hover{box-shadow:0 6px 0 var(--ink)}
.btn--mint{background:var(--mint);color:var(--ink);box-shadow:0 4px 0 var(--ink)}
.btn-ghost{background:var(--paper);color:var(--ink);box-shadow:0 3px 0 var(--ink)}
.btn[disabled]{opacity:.5;cursor:not-allowed;transform:none}
.link{background:none;border:0;padding:0;color:var(--ink);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
input,select,textarea{font:inherit;color:var(--ink);background:var(--paper);border:2px solid var(--line);border-radius:16px;padding:11px 14px;min-height:48px;transition:border-color .15s,box-shadow .15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--ink);box-shadow:0 0 0 4px color-mix(in srgb,var(--sun) 70%,transparent)}
.error{color:#b42318}

.announce{background:var(--ink);color:var(--paper);text-align:center;font:500 14px var(--head);letter-spacing:.02em;padding:9px 16px;display:flex;justify-content:center;align-items:center;gap:10px}
.announce .paw{color:var(--sun)}
.notice{background:var(--mint);color:var(--ink);text-align:center;padding:12px;font-weight:600}
.hdr{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--cream) 88%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:transform .4s cubic-bezier(.2,.7,.2,1),box-shadow .3s}
.hdr.is-scrolled{box-shadow:0 10px 30px -22px rgba(20,41,107,.55)}
.hdr.is-hidden:not(:focus-within){transform:translateY(-100%)}
.hdr__top{display:grid;grid-template-columns:auto 1fr auto;gap:28px;align-items:center;height:84px}
.logo{display:flex;align-items:center;gap:12px}
.logo img{width:58px;height:58px;border-radius:50%;background:#fff;transition:transform .5s var(--ease)}
.logo:hover img{transform:rotate(-12deg) scale(1.06)}
.logo__txt{font:700 22px/1 var(--head);letter-spacing:-.01em}
.logo__txt small{display:block;font:500 12px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--sub);margin-top:4px}
.hsearch{position:relative;max-width:560px;width:100%;justify-self:center}
.hsearch input{width:100%;padding:12px 18px 12px 48px;border-radius:999px;border-color:var(--ink);background:var(--paper)}
.hsearch svg{position:absolute;left:17px;top:50%;transform:translateY(-50%)}
.hacts{display:flex;align-items:center;gap:8px}
.hact{position:relative;display:flex;align-items:center;gap:8px;min-height:48px;padding:0 14px;border-radius:999px;font:600 15px var(--head);transition:background .2s}
.hact:hover{background:var(--paper)}
.hact--bag{background:var(--sun);border:2px solid var(--ink);box-shadow:0 3px 0 var(--ink);transition:transform .2s var(--ease),box-shadow .2s}
.hact--bag:hover{background:var(--sun);transform:translateY(-2px) rotate(-2deg);box-shadow:0 5px 0 var(--ink)}
.hact__n{display:inline-grid;place-items:center;min-width:24px;height:24px;border-radius:12px;background:var(--ink);color:var(--paper);font-size:12px;padding:0 7px}
.cats{display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 20px 14px;max-width:1320px;margin:0 auto}
.cats::-webkit-scrollbar{display:none}
.cats a{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font:500 15px var(--head);padding:8px 15px;min-height:40px;border-radius:999px;border:2px solid transparent;transition:background .2s,border-color .2s,transform .2s var(--ease)}
.cats a:hover{border-color:var(--ink);background:var(--paper);transform:translateY(-2px)}
.cats a.is-main{background:var(--paper);border-color:var(--ink)}
.cats a.is-main svg{color:var(--ink)}
.rainbow{height:5px;background:linear-gradient(90deg,#e53935,#fb8c00,#fdd835,#43a047,#1e88e5,#5e35b1);border-radius:0 0 4px 4px;opacity:.9}

.hero{position:relative;padding:40px 0 70px;overflow:hidden}
.hero__in{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}
.hero h1{font-size:clamp(52px,7.6vw,112px);font-weight:700;line-height:.92;letter-spacing:-.035em;margin:22px 0 22px}
.hero h1 em{color:var(--a)}
.hero h1 .hl{background:linear-gradient(transparent 62%,var(--sun) 62% 92%,transparent 92%)}
.hero__lead{font-size:clamp(17px,1.4vw,20px);max-width:32rem;color:var(--sub);margin:0 0 30px}
.hero__ctas{display:flex;gap:14px;flex-wrap:wrap}
.hero__ctas .btn svg{transition:transform .3s var(--ease)}
.hero__ctas .btn:hover svg{transform:rotate(-10deg) scale(1.15)}
.stats{display:flex;gap:30px;flex-wrap:wrap;margin:36px 0 0;padding:0;list-style:none}
.stats li{display:flex;flex-direction:column}
.stats b{font:700 32px/1 var(--head)}
.stats span{font-size:14px;color:var(--sub);margin-top:4px}
.art{position:relative;aspect-ratio:1;width:min(100%,600px);justify-self:center}
.art__blob{position:absolute;inset:0;width:100%;height:100%;color:var(--sun);animation:spin 60s linear infinite}
.art__blob2{position:absolute;inset:14% -6% -4% 22%;width:84%;height:84%;color:var(--mint);opacity:.9;animation:spin 80s linear infinite reverse}
.art__img{position:absolute;inset:11%;border-radius:58% 42% 52% 48%/48% 56% 44% 52%;overflow:hidden;border:6px solid var(--paper);box-shadow:0 40px 70px -35px rgba(20,41,107,.6);background:var(--paper)}
.art__img img{width:100%;height:100%;object-fit:cover}
.spinner{position:absolute;left:-2%;top:4%;width:clamp(96px,11vw,140px);aspect-ratio:1;display:grid;place-items:center;background:var(--coral);border:2px solid var(--ink);border-radius:50%;box-shadow:4px 4px 0 var(--ink);z-index:2}
.spinner svg.ring{position:absolute;inset:6%;width:88%;height:88%;animation:spin 18s linear infinite}
.spinner text{font:600 11.5px var(--head);letter-spacing:.16em;fill:var(--ink);text-transform:uppercase}
.spinner .paw{font-size:clamp(28px,3vw,40px);color:var(--ink)}
.mini{position:absolute;right:0;bottom:6%;z-index:2;display:flex;align-items:center;gap:12px;background:var(--paper);border:2px solid var(--ink);border-radius:22px;padding:10px 16px 10px 10px;box-shadow:5px 5px 0 var(--ink);max-width:290px;animation:bob 6s ease-in-out infinite;transition:box-shadow .2s}
.mini:hover{box-shadow:7px 7px 0 var(--ink)}
.mini img{width:62px;height:62px;border-radius:14px;object-fit:cover;flex:none}
.mini span{display:flex;flex-direction:column;font-size:13.5px;line-height:1.3;min-width:0}
.mini b{font:600 15px var(--head);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mini i{font-style:normal;font:700 16px var(--head);color:var(--a);margin-top:3px}
.floatpaw{position:absolute;font-size:34px;animation:bob 5s ease-in-out infinite}
.hero .bgpaw{position:absolute;inset:0;background:${PAW_PATTERN};background-size:180px;pointer-events:none;z-index:-1;mask:linear-gradient(transparent,#000 30%,#000 70%,transparent)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bob{50%{transform:translateY(-12px) rotate(2deg)}}

.tickwrap{overflow:hidden;padding:26px 0;margin:-26px 0}
.ticker{position:relative;z-index:2;padding:16px 0;border-block:2px solid var(--ink);transform:rotate(-1.6deg);margin:0 -30px;font:600 clamp(20px,2.4vw,30px)/1.1 var(--head)}
.ticker--sun{background:var(--sun)}
.ticker--ink{background:var(--ink);color:var(--paper);transform:rotate(1.2deg)}
.tick{display:inline-flex;align-items:center;gap:.7em;white-space:nowrap}
.tick .paw{font-size:.9em}
.ticker--sun .tick .paw{color:var(--ink)!important}

.sec{padding:84px 0}
.sec__head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:34px;flex-wrap:wrap}
.sec__head h2{font-size:clamp(34px,4.4vw,60px);font-weight:700;letter-spacing:-.03em}
.sec__head h2 em{color:var(--a)}
.sec__head p{margin:10px 0 0;color:var(--sub);max-width:34rem}
.more{display:inline-flex;align-items:center;gap:8px;font:600 16px var(--head);border-bottom:3px solid var(--sun);padding:6px 0;white-space:nowrap}
.more svg{transition:transform .25s var(--ease)}
.more:hover svg{transform:translateX(5px)}

.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.tile{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:16px;min-height:220px;padding:22px;border-radius:var(--r);background:var(--pop);border:2px solid var(--ink);overflow:hidden;transition:transform .35s var(--ease),box-shadow .35s}
.tile:hover{transform:translateY(-6px) rotate(var(--tilt));box-shadow:6px 8px 0 var(--ink)}
.tile h3{font-size:clamp(22px,2vw,28px);font-weight:600;max-width:9ch;position:relative;z-index:1}
.tile__img{position:absolute;right:-16px;bottom:-16px;width:58%;aspect-ratio:1;border-radius:50%;overflow:hidden;border:4px solid var(--paper);background:var(--paper);transition:transform .45s var(--ease)}
.tile:hover .tile__img{transform:scale(1.08) rotate(-6deg)}
.tile__img img{width:100%;height:100%;object-fit:cover}
.tile__go{position:relative;z-index:1;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--paper);border:2px solid var(--ink);transition:transform .3s var(--ease)}
.tile:hover .tile__go{transform:rotate(-45deg)}
.tile--big{grid-column:span 2;grid-row:span 2;min-height:460px}
.tile--big h3{font-size:clamp(40px,5vw,72px);font-weight:700;max-width:none}
.tile--big .tile__img{width:66%;right:-6%;bottom:-8%}
.tile--big p{position:relative;z-index:1;margin:8px 0 0;max-width:15rem;font-weight:500}

.mode{--modebg:var(--sun);position:relative;background:var(--paper);border-block:2px solid var(--ink);transition:background .4s}
.mode::before{content:'';position:absolute;inset:0;background:var(--modebg);opacity:.32;transition:background .5s;pointer-events:none}
.mode:has([data-tab=cats][aria-selected=true]){--modebg:var(--mint)}
.mode .wrap{position:relative}
.mode__head{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:30px}
.mode__head h2{font-size:clamp(34px,4.4vw,60px);font-weight:700;letter-spacing:-.03em}
.mode__head h2 em{color:var(--a)}
.switch{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:6px;border-radius:999px;background:var(--paper);border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink)}
.switch__knob{position:absolute;top:6px;bottom:6px;left:6px;width:calc(50% - 6px);border-radius:999px;background:var(--sun);border:2px solid var(--ink);transition:transform .5s var(--ease),background .4s}
.mode:has([data-tab=cats][aria-selected=true]) .switch__knob{transform:translateX(100%);background:var(--mint)}
.switch a{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;font:600 19px var(--head);border-radius:999px}
.switch a svg{transition:transform .4s var(--ease)}
.switch a[aria-selected=true] svg{transform:rotate(-12deg) scale(1.15)}
.panel__foot{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px}
.panel__foot p{margin:0;color:var(--sub)}
.js .mode [data-panel]:not([hidden]) .rail__item{animation:pop-in .6s var(--ease) both;animation-delay:calc(var(--i,0) * 50ms)}
@keyframes pop-in{from{opacity:0;transform:translateY(24px) scale(.96)}}

.rail{display:grid;grid-auto-flow:column;grid-auto-columns:min(280px,64vw);gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:16px 20px 28px;scroll-padding:0 20px;scrollbar-width:thin;scrollbar-color:var(--ink) transparent}
.rail__item{scroll-snap-align:start;display:flex}
.rail__item .card{width:100%}

.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px 22px}
.card{display:flex;flex-direction:column}
.card__box{display:flex;flex-direction:column;height:100%;background:var(--paper);border:2px solid var(--ink);border-radius:var(--r);padding:10px;transition:transform .4s var(--ease),box-shadow .4s var(--ease)}
.card:hover .card__box,.card:focus-visible .card__box{transform:translateY(-8px) rotate(var(--tilt));box-shadow:6px 8px 0 var(--ink)}
.card:focus-visible{outline:none}
.card:focus-visible .card__box{outline:3px solid var(--ink);outline-offset:3px}
.card__media{position:relative;aspect-ratio:1;border-radius:18px;overflow:hidden;background:color-mix(in srgb,var(--pop) 40%,var(--paper))}
.card__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .4s,transform .6s cubic-bezier(.2,.7,.2,1)}
.card__alt{opacity:0}
.card:hover .card__alt{opacity:1}
.card:hover .card__media img{transform:scale(1.05)}
.card__ph{position:absolute;inset:0;background:var(--pop)}
.sticker{position:absolute;left:10px;top:10px;z-index:1;display:grid;place-items:center;font:600 13px/1 var(--head);padding:9px 12px;border-radius:999px;background:var(--pop);color:var(--ink);border:2px solid var(--ink);transform:rotate(-8deg);box-shadow:2px 2px 0 var(--ink);transition:transform .4s var(--ease)}
.card:hover .sticker{transform:rotate(4deg) scale(1.08)}
.sticker--out{left:auto;right:10px;background:var(--paper)}
.card__body{display:flex;flex-direction:column;gap:6px;padding:14px 6px 4px;flex:1}
.card__title{font:500 16.5px/1.3 var(--head);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.6em}
.card__row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:4px}
.card__price{font:700 20px var(--head);display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.card__price small{font:500 13px var(--body);color:var(--sub)}
.card__price s{font:500 14px var(--body);color:var(--sub)}
.card__go{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--pop);border:2px solid var(--ink);flex:none;transition:transform .35s var(--ease),background .3s}
.card:hover .card__go{transform:rotate(-45deg) scale(1.1);background:var(--sun)}
.stars{color:#e59a00;font-size:14px;letter-spacing:1px}
.stars .muted{font-size:13px;letter-spacing:0}

.promises{position:relative;background:var(--ink);color:var(--paper);padding:110px 0 100px;margin-top:40px}
.promises .wave{position:absolute;left:0;right:0;height:40px;width:100%;color:var(--ink)}
.promises .wave--top{top:-39px}
.promises .wave--bot{bottom:-39px;transform:scaleY(-1)}
.promises h2{font-size:clamp(36px,5vw,68px);font-weight:700;letter-spacing:-.03em;max-width:14ch}
.promises h2 em{color:var(--sun)}
.promises__head{display:flex;justify-content:space-between;align-items:end;gap:30px;flex-wrap:wrap;margin-bottom:46px}
.promises__head p{max-width:26rem;color:#cbd3ee;margin:0}
.promises__in{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:22px}
.promise{position:relative;background:var(--pop);color:var(--ink);border-radius:var(--r);padding:30px 28px 32px;border:2px solid var(--paper);transition:transform .4s var(--ease)}
.promise:nth-child(2){transform:translateY(24px)}
.promise:hover{transform:translateY(-6px) rotate(var(--tilt))}
.promise__icon{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:var(--paper);border:2px solid var(--ink);margin-bottom:22px;transition:transform .5s var(--ease)}
.promise:hover .promise__icon{transform:rotate(-14deg) scale(1.08)}
.promise h3{font-size:26px;margin-bottom:10px}
.promise p{margin:0}
.featlist{display:flex;gap:14px 34px;flex-wrap:wrap;margin-top:70px;padding-top:30px;border-top:2px dashed rgba(255,255,255,.25)}
.featlist div{display:flex;gap:12px;align-items:center;color:#dfe5f7}
.featlist strong{color:var(--paper);font-family:var(--head);font-weight:600}
.featlist svg{color:var(--sun);flex:none}

.faqsec{padding-top:120px}
.faq{display:grid;grid-template-columns:.8fr 1.2fr;gap:50px;align-items:start}
.faq__head{position:sticky;top:150px}
.faq__head h2{font-size:clamp(36px,4.6vw,64px);font-weight:700;letter-spacing:-.03em;margin-top:18px}
.faq__head h2 em{color:var(--a)}
.faq details{background:var(--paper);border:2px solid var(--ink);border-radius:22px;margin-bottom:14px;transition:box-shadow .3s,transform .3s var(--ease)}
.faq details:hover{transform:translateY(-2px)}
.faq details[open]{box-shadow:5px 5px 0 var(--ink)}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:14px;align-items:center;padding:18px 20px 18px 24px;font:600 19px/1.3 var(--head);min-height:48px}
.faq summary::-webkit-details-marker{display:none}
.faq__pm{position:relative;flex:none;width:38px;height:38px;border-radius:50%;background:var(--pop);border:2px solid var(--ink);transition:transform .4s var(--ease)}
.faq__pm::before,.faq__pm::after{content:'';position:absolute;left:50%;top:50%;width:14px;height:2.5px;margin:-1.25px 0 0 -7px;background:var(--ink);border-radius:2px}
.faq__pm::after{transform:rotate(90deg);transition:transform .3s}
.faq details[open] .faq__pm{transform:rotate(180deg)}
.faq details[open] .faq__pm::after{transform:rotate(0)}
.faq .ans{padding:0 24px 20px;color:var(--sub)}
.faq .ans p{margin:0 0 8px}

.join{padding:30px 0 90px}
.join__card{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:30px;align-items:center;background:var(--coral);border:2px solid var(--ink);border-radius:36px;padding:52px 56px;overflow:hidden;box-shadow:8px 8px 0 var(--ink)}
.join__card::before{content:'';position:absolute;inset:0;background:${PAW_PATTERN};background-size:150px;opacity:.9;pointer-events:none}
.join__card>*{position:relative}
.join h2{font-size:clamp(34px,4.4vw,58px);font-weight:700;letter-spacing:-.03em}
.join p{margin:12px 0 0;max-width:28rem;font-weight:500}
.join form{display:flex;gap:10px;background:var(--paper);border:2px solid var(--ink);border-radius:999px;padding:6px}
.join input{flex:1;min-width:0;border:0;background:transparent;border-radius:999px}
.join input:focus{box-shadow:none}
.join form:focus-within{box-shadow:0 0 0 4px var(--sun)}
.join__dog{position:absolute;right:28px;top:-8px;font-size:90px;color:var(--ink);opacity:.12;transform:rotate(18deg)}

.ftr{position:relative;background:var(--ink);color:#cbd3ee;padding:70px 0 0;font-size:15px;overflow:hidden}
.ftr .wave{position:absolute;top:0;left:0;width:100%;height:40px;color:var(--cream)}
.ftr__grid{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:34px;padding-top:30px}
.ftr h4{color:var(--paper);font:600 18px var(--head);margin:0 0 16px}
.ftr ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}
.ftr li a{display:inline-flex;min-height:32px;align-items:center;transition:color .2s,transform .2s}
.ftr li a:hover{color:var(--sun);transform:translateX(4px)}
.ftr__brand img{width:84px;height:84px;border-radius:50%;background:#fff;margin-bottom:16px}
.ftr__brand p{max-width:22rem;margin:0}
.ftr__mark{display:flex;justify-content:center;font:700 clamp(120px,30vw,380px)/.78 var(--head);letter-spacing:-.05em;margin:60px 0 -0.06em;user-select:none;white-space:nowrap}
.ftr__mark span{display:inline-block;transition:transform .5s var(--ease)}
.ftr__mark:hover span:nth-child(odd){transform:translateY(-.08em) rotate(-4deg)}
.ftr__mark:hover span:nth-child(even){transform:translateY(-.04em) rotate(4deg)}
.ftr__base{position:relative;z-index:1;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid rgba(255,255,255,.14);padding:20px 0 26px;font-size:13.5px;background:var(--ink)}
.pay{display:flex;gap:6px;flex-wrap:wrap}
.pay span{border:1.5px solid rgba(255,255,255,.3);border-radius:8px;padding:3px 9px;font-size:11.5px;font-weight:600;color:var(--paper)}

.crumbs{font-size:14px;color:var(--sub);padding-block:22px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.crumbs a{text-decoration:underline;text-decoration-color:var(--sun);text-decoration-thickness:3px;text-underline-offset:4px}
.crumbs a:hover{color:var(--a)}
.pdp{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:56px;padding-bottom:60px}
.pdp__gal{position:relative;isolation:isolate}
.pdp__gal .blobbg{position:absolute;inset:-4% -3% 18% -4%;width:107%;height:86%;color:var(--sun);z-index:-1;opacity:.75}
.gallery-main{border-radius:32px;border:2px solid var(--ink);background:var(--paper);box-shadow:8px 8px 0 var(--ink)}
.thumbs{gap:10px;overflow-x:auto;flex-wrap:nowrap;padding:14px 4px 6px}
.thumbs a{flex:none;border-radius:16px;border:2px solid transparent;transition:transform .25s var(--ease)}
.thumbs a:hover{transform:translateY(-3px) rotate(-3deg)}
.thumbs a.on{border-color:var(--ink)}
.thumbs img{width:76px;height:76px;border-radius:13px;opacity:.65}
.pdp__info{position:sticky;top:150px;align-self:start}
.pdp__tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.pill{display:inline-flex;align-items:center;gap:6px;font:600 13px var(--head);padding:6px 12px;border-radius:999px;border:2px solid var(--ink);background:var(--paper)}
.pill--ok{background:var(--mint)}
.pill--ok::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--ink);animation:pulse 1.8s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(1.6);opacity:.4}}
.pdp h1{font-size:clamp(32px,3.6vw,50px);font-weight:700;letter-spacing:-.025em;line-height:1}
.pdp__price{display:flex;align-items:center;gap:12px;margin:18px 0 6px;font:700 34px var(--head)}
.pdp__price .price{background:linear-gradient(transparent 58%,var(--sun) 58% 92%,transparent 92%);padding:0 4px}
.pdp__price .compare{font:500 19px var(--body);color:var(--sub);text-decoration:line-through;margin-left:10px}
.pdp__ship{font-size:14px;color:var(--sub);margin:0 0 6px}
.buy{gap:16px;margin:20px 0}
.buy .field span{font:600 15px var(--head)}
.buy select{width:100%;max-width:none;border-color:var(--ink);appearance:none;background:var(--paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2314296b' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 16px center;padding-right:44px}
.buy-row{gap:10px}
.buy-row input[type=number]{width:88px;text-align:center;border-color:var(--ink);border-radius:999px;font:600 17px var(--head)}
.buy-row .btn{flex:1;background:var(--coral);color:var(--ink);box-shadow:0 5px 0 var(--ink);font-size:18px;min-height:54px}
.buy-row .btn:hover{box-shadow:0 7px 0 var(--ink)}
.buy-row .btn:active{box-shadow:0 1px 0 var(--ink)}
.assure{display:grid;gap:10px;margin:22px 0;padding:0;list-style:none}
.assure li{display:flex;gap:12px;align-items:center;font-size:14.5px;padding:12px 14px;border-radius:18px;background:color-mix(in srgb,var(--pop) 45%,var(--paper));border:2px solid var(--ink)}
.assure svg{flex:none}
.desc{white-space:pre-line;color:#33406c;line-height:1.75}
.acc details{border-top:2px dashed var(--line)}
.acc summary{list-style:none;cursor:pointer;padding:18px 0;font:600 18px var(--head);display:flex;justify-content:space-between;align-items:center;min-height:48px}
.acc summary::-webkit-details-marker{display:none}
.acc summary::after{content:'+';display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--sun);border:2px solid var(--ink);font-size:18px;line-height:1;transition:transform .35s var(--ease)}
.acc details[open] summary::after{transform:rotate(45deg)}
.acc .muted{padding-bottom:16px}
.reviews{border-top:2px solid var(--ink);padding:50px 0 70px;margin:0}
.reviews h2{font-size:clamp(32px,3.6vw,48px);font-weight:700;margin-bottom:12px}
.reviews>.review{display:block;background:var(--paper);border:2px solid var(--ink);border-radius:22px;padding:18px 22px;margin:14px 0;max-width:760px}
.review strong{font-family:var(--head);font-size:18px;font-weight:600}
.review-form{background:var(--paper);border:2px solid var(--ink);border-radius:26px;padding:26px}
.review-form h3{font-size:24px}

.pagehead{position:relative;padding:44px 0 26px}
.pagehead h1{font-size:clamp(40px,6vw,84px);font-weight:700;letter-spacing:-.035em;line-height:.95}
.pagehead .squiggle{display:block;width:150px;height:14px;color:var(--coral);margin-top:14px}
.pagehead .paw{position:absolute;right:0;top:30px;font-size:clamp(50px,7vw,96px);color:var(--sun);transform:rotate(18deg)}
.squiggle path{stroke-dasharray:1;stroke-dashoffset:0}
.js .squiggle path{stroke-dashoffset:1;animation:draw 1.2s .3s cubic-bezier(.6,0,.2,1) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.inner{padding-bottom:80px}
.inner>.muted:first-child{font-size:18px;max-width:40rem;margin-top:0}
.listing-bar{border:2px solid var(--ink);background:var(--paper);border-radius:999px;padding:8px 10px 8px 22px;margin-bottom:30px;font:500 15px var(--head)}
.listing-bar select{min-height:42px;padding:6px 12px;border-radius:999px;border-color:var(--ink)}
.pager{gap:14px}
.pager a{font-weight:600;padding:8px 14px;border-radius:999px;background:var(--sun);border:2px solid var(--ink)}
.cart{background:var(--paper);border:2px solid var(--ink);border-radius:30px;padding:26px;box-shadow:6px 6px 0 var(--ink)}
.cart-table td{border-bottom:2px dashed var(--line);padding:16px 8px}
.cart-table a{font:600 17px var(--head)}
.cart-img img{width:84px;height:84px;border-radius:18px;border:2px solid var(--ink)}
.cart-table input{width:76px;text-align:center;border-radius:999px}
.cart-table .link{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--pink);border:2px solid var(--ink);text-decoration:none;font-size:20px}
.cart>form>.btn-ghost{margin-top:16px}
.discount-form input{border-radius:999px}
.totals{font-size:16px;background:var(--cream);border-radius:20px;padding:18px 20px}
.totals .total{font:700 24px var(--head)}
.checkout-form{margin-top:22px}
.checkout-form input{border-radius:999px}
.checkout-form .btn{min-width:16rem;background:var(--coral);color:var(--ink);box-shadow:0 5px 0 var(--ink)}
.empty{padding:40px 0 60px}
.empty::before{content:'';display:block;width:120px;height:120px;margin:0 auto 20px;background:var(--sun) ${PAW_BG} no-repeat center/56%;border:2px solid var(--ink);border-radius:50%;box-shadow:5px 5px 0 var(--ink);animation:bob 4s ease-in-out infinite}
.empty p{font:600 26px var(--head)}
.order-done{background:var(--paper);border:2px solid var(--ink);border-radius:30px;padding:30px}
.order-done h1{font-size:42px;font-weight:700}
.orders-list li{border-bottom:2px dashed var(--line)}
.stack .btn,.inner form>.btn{align-self:flex-start}

@media(max-width:1060px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.tiles{grid-template-columns:repeat(3,minmax(0,1fr))}.tile--big{grid-column:span 3;grid-row:auto;min-height:300px}.ftr__grid{grid-template-columns:1fr 1fr}.faq{grid-template-columns:1fr;gap:26px}.faq__head{position:static}}
@media(max-width:820px){
  .hdr__top{grid-template-columns:auto 1fr;height:auto;grid-template-rows:64px auto;column-gap:12px;row-gap:4px;padding-top:6px}
  .logo img{width:46px;height:46px}
  .logo__txt{font-size:17px}.logo__txt small{display:none}
  .hsearch{grid-column:1/-1;grid-row:2;max-width:none;margin-bottom:8px}
  .hacts{justify-self:end;gap:4px}
  .hact{padding:0 12px}
  .hact__label{display:none}
  .cats{padding-bottom:10px}
  .hero{padding:24px 0 54px}
  .hero__in{grid-template-columns:1fr;gap:20px}
  .art{width:min(100%,440px);margin-top:10px}
  .stats{gap:22px;margin-top:28px}
  .stats b{font-size:26px}
  .sec{padding:60px 0}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
  .card__box{padding:7px;border-radius:20px}
  .card__media{border-radius:14px}
  .card__body{padding:10px 4px 2px}
  .card__title{font-size:15px}
  .card__price{font-size:17px}
  .card__go{width:34px;height:34px}
  .sticker{font-size:11.5px;padding:7px 9px;left:7px;top:7px}
  .tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .tile--big{grid-column:span 2;min-height:280px}
  .tile--big .tile__img{width:50%;right:-8%;bottom:-10%}
  .tile--big p{max-width:58%;font-size:15px}
  .tile{min-height:170px;padding:16px}
  .tile h3{font-size:19px}
  .tile__go{width:40px;height:40px}
  .mode__head{flex-direction:column;align-items:stretch}
  .switch a{padding:0 12px;font-size:17px}
  .promises{padding:80px 0 70px}
  .promises__in{grid-template-columns:1fr}
  .promise:nth-child(2){transform:none}
  .join__card{grid-template-columns:1fr;padding:34px 22px;border-radius:28px}
  .join form{flex-direction:column;border-radius:24px}
  .ftr__grid{grid-template-columns:1fr 1fr;gap:26px}
  .ftr__brand{grid-column:1/-1}
  .pdp{grid-template-columns:1fr;gap:26px}
  .pdp__info{position:static}
  .gallery-main{border-radius:24px;box-shadow:5px 5px 0 var(--ink)}
  .listing-bar{border-radius:24px;padding:10px 14px}
  .cart{padding:14px;border-radius:22px}
  .cart-table td{padding:10px 4px}
  .cart-img{width:60px}
  .cart-img img{width:56px;height:56px;min-width:56px;border-radius:12px}
  .cart-table a{font-size:15px}
  .cart-table input{width:58px}
  .checkout-form input,.checkout-form .btn{min-width:0;width:100%}
  .totals{width:100%;min-width:0}
}
@media(max-width:480px){.hact--acct{display:none}.spinner{left:-4%}.mini{right:0;max-width:230px}.mini img{width:48px;height:48px}}
@media (prefers-reduced-motion:reduce){.art__blob,.art__blob2,.spinner svg.ring,.mini,.floatpaw,.pill--ok::before,.empty::before,.js .mode [data-panel] .rail__item{animation:none!important}.js .squiggle path{animation:none;stroke-dashoffset:0}}
`;

const WAVE = 'M0 40V20C120 0 240 0 360 14s240 26 360 8 240-28 360-14 240 26 360 12V40z';

function Wave({ class: c }: { class: string }) {
  return (
    <svg class={`wave ${c}`} viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true">
      <path d={WAVE} fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return (
    <span class="spinner" aria-hidden="true">
      <svg class="ring" viewBox="0 0 120 120">
        <defs><path id="pawring" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" /></defs>
        <text><textPath href="#pawring">Hand-picked · happy pets · tails up ·</textPath></text>
      </svg>
      <Paw />
    </span>
  );
}

function ModeSwitch({ store, dogs, cats }: { store: Store; dogs?: { category: Category; products: Product[] }; cats?: { category: Category; products: Product[] } }) {
  if (!dogs || !cats) return null;
  const tabs = [
    { key: 'dogs', icon: 'dog', s: dogs, line: 'Chews, walks, beds and everything for a wagging tail.' },
    { key: 'cats', icon: 'cat', s: cats, line: 'Scratchers, snoozes and toys worth pouncing on.' },
  ];
  return (
    <section class="sec mode" data-tabs aria-labelledby="mode-h">
      <div class="wrap">
        <div class="mode__head">
          <div>
            <span class="eyebrow"><Paw /> Pick your pet</span>
            <h2 id="mode-h" class="split" style="margin-top:16px">Who are we <em>spoiling</em> today?</h2>
          </div>
          <div class="switch" role="tablist" aria-label="Shop for">
            <span class="switch__knob" aria-hidden="true" />
            {tabs.map((t, i) => (
              <a href={`/collections/${t.s.category.slug}`} role="tab" id={`tab-${t.key}`} aria-controls={`panel-${t.key}`} aria-selected={i === 0 ? 'true' : 'false'} data-tab={t.key}>
                <Icon name={t.icon} size={26} stroke={1.9} />
                {t.s.category.name}
              </a>
            ))}
          </div>
        </div>
        {tabs.map((t, i) => (
          <div data-panel={t.key} id={`panel-${t.key}`} role="tabpanel" aria-labelledby={`tab-${t.key}`} hidden={i !== 0}>
            <Rail store={store} products={t.s.products} label={`${t.s.category.name} favourites`} />
            <div class="panel__foot">
              <p>{t.line}</p>
              <a class="btn" href={`/collections/${t.s.category.slug}`}>
                All {t.s.category.name.toLowerCase()} <Icon name="arrow" size={18} stroke={2.4} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function wordmarkOf(name: string) {
  return (name.split(/\s+/)[0] ?? name).toLowerCase();
}

export const paws: Theme = {
  id: 'paws',
  name: 'Paws',
  description: 'Playful pet boutique: cream, navy and rainbow pops, rounded type, Dog / Cat switch and bouncy sticker cards.',
  homeCollections: 6,
  Layout: ({ store, title, meta, url, cartCount, categories, customer, notice, children }) => {
    const logo = store.themeSettings.logoUrl;
    const mark = wordmarkOf(store.name);
    const nameRest = store.name.split(/\s+/).slice(1).join(' ');
    const main = new Set(['dogs', 'cats']);
    return (
      <html lang="en-GB">
        <Head store={store} title={title} css={css} meta={meta} url={url} fonts={FONTS} />
        <body>
          <a class="sr" href="#main">Skip to content</a>
          <div class="scroll-progress" />
          {store.themeSettings.announcement ? (
            <div class="announce"><Paw />{store.themeSettings.announcement}<Paw /></div>
          ) : null}
          <Notice text={notice} />
          <header class="hdr" data-hide-on-scroll>
            <div class="wrap hdr__top">
              <a class="logo" href="/" aria-label={`${store.name} home`}>
                {logo ? <img src={logo} alt="" width="58" height="58" /> : null}
                <span class="logo__txt">
                  {store.name.split(/\s+/)[0]}
                  {nameRest ? <small>{nameRest}</small> : null}
                </span>
              </a>
              <form class="hsearch" method="get" action="/search" role="search">
                <Icon name="search" size={19} stroke={2.2} />
                <input type="search" name="q" placeholder="Search toys, beds, collars..." aria-label="Search products" />
              </form>
              <nav class="hacts" aria-label="Account">
                <a class="hact hact--acct" href="/account">
                  <Icon name="user" size={22} />
                  <span class="hact__label">{customer ? 'Account' : 'Sign in'}</span>
                </a>
                <a class="hact hact--bag" href="/cart" aria-label={`Basket, ${cartCount} items`}>
                  <Icon name="bag" size={21} stroke={2} />
                  <span class="hact__label">Basket</span>
                  <span class="hact__n">{cartCount}</span>
                </a>
              </nav>
            </div>
            <nav class="cats" aria-label="Categories">
              {categories.filter((c) => main.has(c.slug)).map((c) => (
                <a class="is-main" href={`/collections/${c.slug}`}>
                  <Icon name={c.slug === 'cats' ? 'cat' : 'dog'} size={20} />
                  {c.name}
                </a>
              ))}
              <a href="/products">Shop all</a>
              {categories.filter((c) => !main.has(c.slug)).map((c) => <a href={`/collections/${c.slug}`}>{c.name}</a>)}
            </nav>
            <div class="rainbow" />
          </header>
          <main id="main">{children}</main>
          <section class="join" aria-labelledby="join-h">
            <div class="wrap">
              <div class="join__card" data-reveal="scale">
                <Paw class="join__dog" />
                <div>
                  <h2 id="join-h" class="split">Join the pack</h2>
                  <p>New toys, seasonal treats for the humans and the odd offer. No spam, just good boys and girls.</p>
                </div>
                <form method="post" action="/subscribe">
                  <label class="sr" for="nl">Email</label>
                  <input id="nl" type="email" name="email" placeholder="Your email address" required autocomplete="email" />
                  <button class="btn" type="submit">Sign me up</button>
                </form>
              </div>
            </div>
          </section>
          <footer class="ftr">
            <Wave class="wave--ftr" />
            <div class="wrap">
              <div class="ftr__grid">
                <div class="ftr__brand">
                  {logo ? <img src={logo} alt={store.name} width="84" height="84" loading="lazy" /> : <h4>{store.name}</h4>}
                  <p>{store.themeSettings.tagline ?? ''}</p>
                </div>
                <div>
                  <h4>Shop</h4>
                  <ul>
                    <li><a href="/products">All products</a></li>
                    {categories.slice(0, 6).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
                <div>
                  <h4>Help</h4>
                  <ul>
                    <li><a href="/track">Track an order</a></li>
                    <li><a href="/pages/faq">Delivery and FAQ</a></li>
                    <li><a href="/account">Your account</a></li>
                    <li><a href="/cart">Basket</a></li>
                    {store.supportEmail ? <li><a href={`mailto:${store.supportEmail}`}>Contact us</a></li> : null}
                  </ul>
                </div>
                <div>
                  <h4>More to sniff</h4>
                  <ul>
                    {categories.slice(6, 13).map((c) => <li><a href={`/collections/${c.slug}`}>{c.name}</a></li>)}
                  </ul>
                </div>
              </div>
              <div class="ftr__mark" aria-hidden="true">
                {mark.split('').map((ch, i) => <span style={`color:${pop(i)}`}>{ch}</span>)}
              </div>
            </div>
            <div class="ftr__base">
              <div class="wrap" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;width:100%">
                <span>{raw('&copy;')} {new Date().getFullYear()} {store.name}. Made with love for happy pets.</span>
                <span class="pay"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Google Pay</span></span>
              </div>
            </div>
          </footer>
        </body>
      </html>
    );
  },
  Home: ({ store, products, categories, featured, sections }) => {
    const content = store.content ?? {};
    const picks = featured?.length ? featured : products;
    const hero = picks[0];
    const side = picks[1];
    const secs = sections ?? [];
    const dogs = secs.find((s) => s.category.slug === 'dogs');
    const cats = secs.find((s) => s.category.slug === 'cats');
    const rest = secs.filter((s) => s !== dogs && s !== cats);
    const pool = [...secs.flatMap((s) => s.products), ...picks, ...products];
    const imgs = tileImages(categories, pool);
    const rated = pool.filter((p) => p.ratingCount);
    const avg = rated.length ? rated.reduce((a, p) => a + (p.ratingAvg ?? 0), 0) / rated.length : 0;
    const ship = store.shippingFlat ? money(store, store.shippingFlat) : null;
    const promisesTicker = [
      store.themeSettings.announcement ?? 'Fast UK delivery',
      'Hand-picked for happy pets',
      'Secure checkout',
      'Toys, beds, walks and grooming',
      'For dogs and cats',
      'Friendly help, every step',
    ];
    const tiles = categories.filter((c) => c.slug !== 'dogs' && c.slug !== 'cats').slice(0, 9);
    return (
      <>
        <section class="hero">
          <div class="bgpaw" aria-hidden="true" />
          <div class="wrap hero__in">
            <div>
              <span class="eyebrow" data-reveal="down"><Paw /> {content.heroTitle ?? 'Pet favourites'}</span>
              <h1 class="split">Spoil them <em>silly</em>, <span class="hl">every</span> single day.</h1>
              <p class="hero__lead" data-reveal="up" style="--d:350ms">{store.themeSettings.tagline ?? content.heroText ?? ''}</p>
              <div class="hero__ctas" data-reveal="up" style="--d:450ms">
                {dogs ? <a class="btn btn--pop" href={`/collections/${dogs.category.slug}`} data-magnetic><Icon name="dog" size={22} stroke={2} />Shop dogs</a> : null}
                {cats ? <a class="btn btn--mint" href={`/collections/${cats.category.slug}`} data-magnetic><Icon name="cat" size={22} stroke={2} />Shop cats</a> : null}
                {!dogs && !cats ? <a class="btn" href="/products">Shop all</a> : null}
              </div>
              <ul class="stats" data-stagger="up">
                {ship ? <li><b>{ship}</b><span>Flat UK delivery</span></li> : null}
                <li><b data-count={String(categories.length)}>{categories.length}</b><span>Collections to explore</span></li>
                {avg ? <li><b><span data-count={avg.toFixed(1)}>{avg.toFixed(1)}</span>{raw('&#9733;')}</b><span>Average pet rating</span></li> : null}
              </ul>
            </div>
            {hero ? (
              <div class="art" data-reveal="scale" style="--d:150ms">
                <Blob class="art__blob" />
                <Blob class="art__blob2" />
                <a class="art__img" href={`/products/${hero.slug}`} aria-label={hero.title}>
                  {hero.images[0] ? <img data-vt src={hero.images[0]} alt={hero.title} width="800" height="800" fetchpriority="high" /> : null}
                </a>
                <Spinner />
                {side ? (
                  <a class="mini" href={`/products/${side.slug}`}>
                    {side.images[0] ? <img src={side.images[0]} alt="" width="62" height="62" loading="lazy" /> : null}
                    <span><b>{side.title}</b><i><Price store={store} product={side} /></i></span>
                  </a>
                ) : null}
                <Paw class="floatpaw" style="left:8%;bottom:4%;color:var(--coral);font-size:44px;transform:rotate(-20deg)" />
                <Paw class="floatpaw" style="right:4%;top:6%;color:var(--ink);animation-delay:-2s;transform:rotate(18deg)" />
              </div>
            ) : null}
          </div>
        </section>

        <Marquee items={promisesTicker} />

        {tiles.length ? (
          <section class="sec" aria-labelledby="cat-h">
            <div class="wrap">
              <div class="sec__head">
                <div>
                  <h2 id="cat-h" class="split">Shop what they <em>love</em></h2>
                  <p>From first-night puppy kits to the comfiest beds on the block.</p>
                </div>
                <a class="more" href="/products">Browse everything <Icon name="arrow" size={18} stroke={2.4} /></a>
              </div>
              <div class="tiles" data-stagger="up">
                {tiles.map((c, i) => {
                  const img = imgs.get(c._id.toHexString());
                  return (
                    <a class={i === 0 ? 'tile tile--big' : 'tile'} href={`/collections/${c.slug}`} style={`--pop:${pop(i)};--tilt:${i % 2 ? 1.5 : -1.5}deg`}>
                      <div>
                        <h3>{c.name}</h3>
                        {i === 0 ? <p>{c.description ?? 'Everything a brand new best friend needs for their first big week home.'}</p> : null}
                      </div>
                      <span class="tile__go" aria-hidden="true"><Icon name="arrow" size={18} stroke={2.4} /></span>
                      {img ? <span class="tile__img"><img src={img} alt="" loading="lazy" width="300" height="300" /></span> : null}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <ModeSwitch store={store} dogs={dogs} cats={cats} />

        {picks.length ? (
          <section class="sec" aria-labelledby="picks-h">
            <div class="wrap">
              <div class="sec__head">
                <div>
                  <h2 id="picks-h" class="split">Top <em>picks</em> this week</h2>
                  <p>The tail-waggers and purr-makers our customers keep coming back for.</p>
                </div>
                <a class="more" href="/products">See all products <Icon name="arrow" size={18} stroke={2.4} /></a>
              </div>
              <Grid store={store} products={picks.slice(0, 8)} />
            </div>
          </section>
        ) : null}

        {content.promises?.length ? (
          <section class="promises" aria-labelledby="prom-h">
            <Wave class="wave--top" />
            <div class="wrap">
              <div class="promises__head">
                <h2 id="prom-h" class="split">Why pets (and people) <em>love</em> us</h2>
                <p data-reveal="up">A small shop with big feelings about good gear. Here is what you can count on.</p>
              </div>
              <div class="promises__in" style={`--n:${Math.min(content.promises.length, 3)}`} data-stagger="up">
                {content.promises.map((f, i) => (
                  <div class="promise" style={`--pop:${pop(i)};--tilt:${i % 2 ? 1.5 : -1.5}deg`}>
                    <span class="promise__icon"><Icon name={iconFor(f.title, i)} size={28} /></span>
                    <h3>{raw(f.title)}</h3>
                    <p>{raw(f.text)}</p>
                  </div>
                ))}
              </div>
              {content.features?.length ? (
                <div class="featlist" data-stagger="up">
                  {content.features.map((f, i) => (
                    <div><Icon name={iconFor(f.title, i)} size={24} /><span><strong>{raw(f.title)}.</strong> {raw(f.text)}</span></div>
                  ))}
                </div>
              ) : null}
            </div>
            <Wave class="wave--bot" />
          </section>
        ) : null}

        {(rest.length || dogs || cats ? rest : [{ category: null, products }]).map((s, i) => (
          <section class="sec" style={i ? 'padding-top:0' : 'padding-top:120px'}>
            <div class="wrap">
              <div class="sec__head">
                <h2 class="split">{s.category ? s.category.name : 'New in'}</h2>
                <a class="more" href={s.category ? `/collections/${s.category.slug}` : '/products'}>View all <Icon name="arrow" size={18} stroke={2.4} /></a>
              </div>
              <Rail store={store} products={s.products} label={s.category ? s.category.name : 'New in'} />
            </div>
          </section>
        ))}

        <Marquee items={promisesTicker.slice().reverse()} tone="ink" />
        <Faq items={content.faq ?? []} />
      </>
    );
  },
  ProductGrid: ({ store, products }) => <Grid store={store} products={products} />,
  ProductPage: (props) => {
    const { store, product } = props;
    const features = (store.content?.features ?? []).slice(0, 3);
    const stock = product.variants.length ? product.variants.reduce((a, v) => a + Math.max(0, v.stock), 0) : product.stock;
    const tags = product.tags.filter((t) => ['Dogs', 'Cats', 'New Puppy', 'New Kitten', 'Highly Rated'].includes(t));
    return (
      <>
        <nav class="wrap crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a><span aria-hidden="true">/</span><a href="/products">Shop all</a><span aria-hidden="true">/</span><span>{product.title}</span>
        </nav>
        <div class="wrap pdp">
          <div class="pdp__gal">
            <Blob class="blobbg" />
            <Gallery product={product} image={props.image} />
          </div>
          <div class="pdp__info">
            <div class="pdp__tags">
              {inStock(product) ? <span class="pill pill--ok">{stock <= 5 ? `Only ${stock} left` : 'In stock, ready to go'}</span> : <span class="pill">Sold out</span>}
              {tags.map((t, i) => <span class="pill" style={`background:${pop(i)}`}>{t}</span>)}
            </div>
            <h1>{product.title}</h1>
            {product.ratingCount ? <p style="margin:12px 0 0"><a href="#reviews"><Stars value={product.ratingAvg} count={product.ratingCount} /></a></p> : null}
            <div class="pdp__price"><Price store={store} product={product} /></div>
            {store.shippingFlat ? <p class="pdp__ship">Flat {money(store, store.shippingFlat)} UK delivery on the whole order.</p> : null}
            <BuyBox store={store} product={product} label="Add to basket" />
            {features.length ? (
              <ul class="assure">
                {features.map((f, i) => <li style={`--pop:${pop(i + 2)}`}><Icon name={iconFor(f.title, i)} size={22} /><span><strong>{raw(f.title)}.</strong> {raw(f.text)}</span></li>)}
              </ul>
            ) : null}
            <div class="acc">
              <details open>
                <summary>The details</summary>
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
      {title ? (
        <header class="pagehead">
          <h1 class="split">{title}</h1>
          <Squiggle />
          <Paw />
        </header>
      ) : <div style="height:32px" />}
      <div class="inner">{children}</div>
    </div>
  ),
  pages: {
    faq: {
      title: 'Delivery and FAQ',
      description: 'Delivery times, costs and answers to common questions.',
      render: ({ store }) => {
        const feats = store.content?.features ?? [];
        return (
          <>
            <div class="wrap">
              <header class="pagehead">
                <h1 class="split">Delivery and FAQ</h1>
                <Squiggle />
                <Paw />
              </header>
              {feats.length ? (
                <ul class="assure" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));max-width:900px">
                  {feats.map((f, i) => <li style={`--pop:${pop(i + 2)}`}><Icon name={iconFor(f.title, i)} size={22} /><span><strong>{raw(f.title)}.</strong> {raw(f.text)}</span></li>)}
                </ul>
              ) : null}
            </div>
            <Faq items={store.content?.faq ?? []} />
          </>
        );
      },
    },
  },
};
