import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'import');
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const refresh = process.argv.includes('--refresh');
if (!slugs.length) {
  console.error('Usage: node scripts/import-shopify.mjs <config-slug>... [--refresh]');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some(Boolean));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^﻿/, '').trim(), (r[i] ?? '').trim()])));
}

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
function htmlToText(html = '') {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|ul|ol|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e) => entities[e] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : m))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 20000);
}

const pence = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, '')) * 100) || 0;
const stripTagCats = (tags) => tags.split(',').map((t) => t.trim()).filter(Boolean);

async function snapshot(cfg, handles) {
  const file = join(dir, `${cfg.store.slug}.snapshot.json.gz`);
  if (existsSync(file) && !refresh) return JSON.parse(gunzipSync(readFileSync(file)).toString());
  const out = {};
  for (const h of handles) {
    const res = await fetch(`https://${cfg.shopifyHost}/products/${h}.json`);
    if (!res.ok) { console.warn(`  ${h}: HTTP ${res.status}`); continue; }
    const { product: p } = await res.json();
    out[h] = {
      title: p.title,
      body: htmlToText(p.body_html),
      options: p.options.map((o) => o.name),
      images: p.images.map((i) => i.src).slice(0, 20),
      variants: p.variants.map((v) => ({ sku: v.sku, options: [v.option1, v.option2, v.option3].filter((x) => x != null), compareAt: pence(v.compare_at_price) })),
    };
  }
  writeFileSync(file, gzipSync(JSON.stringify(out)));
  return out;
}

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Set MONGODB_URI.'); process.exit(1); }
const client = await new MongoClient(uri).connect();
const db = client.db(process.env.MONGODB_DB || 'shop');
const now = new Date();

for (const slug of slugs) {
  const cfg = JSON.parse(readFileSync(join(dir, `${slug}.json`), 'utf8'));
  const rows = parseCsv(readFileSync(join(dir, cfg.csv), 'utf8'));
  const byHandle = new Map();
  for (const r of rows) {
    if (!r.Handle) continue;
    if (!byHandle.has(r.Handle)) byHandle.set(r.Handle, []);
    byHandle.get(r.Handle).push(r);
  }
  const live = await snapshot(cfg, [...byHandle.keys()]);

  const existing = await db.collection('stores').findOne({ slug: cfg.store.slug });
  const storeId = existing?._id ?? new ObjectId();
  const { domains, ...storeFields } = cfg.store;
  await db.collection('stores').updateOne(
    { _id: storeId },
    { $set: { ...storeFields, active: true, updatedAt: now }, $setOnInsert: { domains, createdAt: now } },
    { upsert: true },
  );

  const catOf = (rowsForProduct) => {
    const names = cfg.categoriesFrom === 'tags' ? stripTagCats(rowsForProduct[0].Tags) : [rowsForProduct[0].Category];
    return cfg.categories.filter((c) => c.from.some((f) => names.includes(f))).map((c) => c.slug);
  };

  const products = [];
  let i = 0;
  for (const [handle, prs] of byHandle) {
    const s = live[handle];
    const priceBySku = new Map(prs.map((r) => [r.SKU, pence(r['Price GBP'])]));
    const tags = stripTagCats(prs[0].Tags);
    const options = s ? s.options.filter((n) => n !== 'Title') : [];
    let variants = [];
    if (s && options.length) {
      variants = s.variants
        .filter((v) => priceBySku.has(v.sku))
        .map((v, j) => ({ id: `v${j + 1}`, options: v.options.slice(0, options.length), price: priceBySku.get(v.sku), ...(v.compareAt > priceBySku.get(v.sku) ? { compareAt: v.compareAt } : {}), stock: 999, sku: v.sku }));
    } else if (prs.length > 1) {
      variants = prs.map((r, j) => ({ id: `v${j + 1}`, options: [r.Option], price: pence(r['Price GBP']), stock: 999, sku: r.SKU }));
    }
    const optionDefs = variants.length
      ? (s && options.length ? options : ['Option']).map((name, k) => ({ name, values: [...new Set(variants.map((v) => v.options[k]))] }))
      : [];
    const images = s?.images?.length ? s.images : [...new Set(prs.map((r) => r.Image).filter(Boolean))];
    products.push({
      handle,
      cats: catOf(prs),
      doc: {
        slug: handle,
        title: s?.title ?? prs[0].Product,
        description: s?.body || prs[0].Product,
        images,
        price: variants.length ? Math.min(...variants.map((v) => v.price)) : pence(prs[0]['Price GBP']),
        stock: variants.length ? variants.length * 999 : 999,
        ...(variants.length ? {} : { sku: prs[0].SKU }),
        options: optionDefs,
        variants,
        status: 'active',
        tags,
        createdAt: new Date(now.getTime() - i++ * 1000),
        updatedAt: now,
      },
    });
  }

  const catIds = {};
  for (const [k, c] of cfg.categories.entries()) {
    const image = products.find((p) => p.cats.includes(c.slug))?.doc.images[0];
    const r = await db.collection('categories').findOneAndUpdate(
      { storeId, slug: c.slug },
      { $set: { name: c.name, sort: k, ...(image ? { image } : {}) }, $setOnInsert: { _id: new ObjectId() } },
      { upsert: true, returnDocument: 'after' },
    );
    catIds[c.slug] = r._id;
  }

  const ops = products.map(({ doc, cats }) => {
    const { createdAt, ...rest } = doc;
    return {
      updateOne: {
        filter: { storeId, slug: doc.slug },
        update: { $set: { ...rest, storeId, categoryIds: cats.map((c) => catIds[c]) }, $setOnInsert: { createdAt } },
        upsert: true,
      },
    };
  });
  for (let k = 0; k < ops.length; k += 200) await db.collection('products').bulkWrite(ops.slice(k, k + 200), { ordered: false });
  console.log(`${cfg.store.slug}: ${products.length} products, ${cfg.categories.length} categories, ${products.reduce((n, p) => n + p.doc.variants.length, 0)} variants`);
}

await client.close();
