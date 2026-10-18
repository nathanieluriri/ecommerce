import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, upload, type Category, type Product, type Variant } from '../api';
import { useApp, useStore } from '../context';
import { slugify, toMajor, toMinor } from '../format';
import { Badge, Banner, Button, Card, Field, Loading, PageHeader, useAsync } from '../ui';

interface VariantRow {
  id: string;
  options: string[];
  price: string;
  compareAt: string;
  stock: string;
  sku: string;
}

interface Form {
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: string;
  compareAt: string;
  stock: string;
  sku: string;
  status: Product['status'];
  tags: string;
  categoryIds: string[];
  options: { name: string; values: string }[];
  variants: VariantRow[];
}

const blank: Form = { title: '', slug: '', description: '', images: [], price: '', compareAt: '', stock: '0', sku: '', status: 'draft', tags: '', categoryIds: [], options: [], variants: [] };

const newId = () => Math.random().toString(36).slice(2, 10);

function combos(options: { name: string; values: string }[]): string[][] {
  const lists = options.map((o) => o.values.split(',').map((v) => v.trim()).filter(Boolean)).filter((l) => l.length);
  if (!lists.length || lists.length !== options.length) return [];
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])), [[]]);
}

function syncVariants(form: Form): VariantRow[] {
  const existing = new Map(form.variants.map((v) => [v.options.join('\u0000'), v]));
  return combos(form.options).map(
    (opts) => existing.get(opts.join('\u0000')) ?? { id: newId(), options: opts, price: form.price, compareAt: form.compareAt, stock: '0', sku: '' },
  );
}

function ImagesEditor({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const { me } = useApp();
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await upload(f, store._id));
      onChange([...images, ...urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const move = (i: number, d: number) => {
    const next = [...images];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x!);
    onChange(next);
  };

  return (
    <Card title="Media">
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <div className="imgs" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onFiles(e.dataTransfer.files); }}>
        {images.map((src, i) => (
          <div className="imgs__tile" key={src + i}>
            <img src={src} alt="" />
            <div className="imgs__acts">
              <button type="button" onClick={() => move(i, -1)} aria-label="Move left">‹</button>
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Move right">›</button>
            </div>
          </div>
        ))}
        {me.media ? (
          <label className="imgs__add">
            {busy ? <span className="spinner" /> : 'Add images or drop here'}
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
          </label>
        ) : null}
      </div>
      <div className="row">
        <input className="input" placeholder="Or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button disabled={!/^https?:\/\//.test(url)} onClick={() => { onChange([...images, url]); setUrl(''); }}>Add</Button>
      </div>
      <span className="muted">The first image is the cover.</span>
    </Card>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const store = useStore();
  const { me } = useApp();
  const navigate = useNavigate();
  const { data: categories } = useAsync(() => api<Category[]>(`/categories?storeId=${store._id}`), [store._id]);
  const [form, setForm] = useState<Form | null>(isNew ? blank : null);
  const [product, setProduct] = useState<Product | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const cur = store.currency;

  useEffect(() => {
    if (isNew) return;
    api<Product>(`/products/${id}`)
      .then((p) => {
        setProduct(p);
        setForm({
          title: p.title,
          slug: p.slug,
          description: p.description,
          images: p.images,
          price: toMajor(p.price, cur),
          compareAt: toMajor(p.compareAt, cur),
          stock: String(p.stock),
          sku: p.sku ?? '',
          status: p.status,
          tags: p.tags.join(', '),
          categoryIds: p.categoryIds ?? [],
          options: (p.options ?? []).map((o) => ({ name: o.name, values: o.values.join(', ') })),
          variants: (p.variants ?? []).map((v: Variant) => ({ id: v.id, options: v.options, price: toMajor(v.price, cur), compareAt: toMajor(v.compareAt, cur), stock: String(v.stock), sku: v.sku ?? '' })),
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [id, isNew, cur]);

  if (!form) return <div className="page">{error ? <Banner tone="critical">{error}</Banner> : <Loading what="product" />}</div>;

  const update = (patch: Partial<Form>) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, ...patch } : f));
  };
  const text = (k: 'title' | 'slug' | 'description' | 'price' | 'compareAt' | 'stock' | 'sku' | 'tags') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    update({ [k]: value, ...(k === 'title' && !slugTouched ? { slug: slugify(value) } : {}) });
  };
  const setOptions = (options: Form['options']) => {
    const next = { ...form, options };
    update({ options, variants: syncVariants(next) });
  };
  const setVariant = (i: number, patch: Partial<VariantRow>) => update({ variants: form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const hasVariants = form.variants.length > 0;

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const options = form.options
      .map((o) => ({ name: o.name.trim(), values: o.values.split(',').map((v) => v.trim()).filter(Boolean) }))
      .filter((o) => o.name && o.values.length);
    const body = {
      storeId: store._id,
      title: form.title,
      slug: form.slug,
      description: form.description,
      images: form.images,
      price: toMinor(form.price, cur),
      compareAt: form.compareAt ? toMinor(form.compareAt, cur) : isNew ? undefined : null,
      stock: Number(form.stock) || 0,
      sku: form.sku || (isNew ? undefined : null),
      status: form.status,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      categoryIds: form.categoryIds,
      options: hasVariants ? options : [],
      variants: hasVariants
        ? form.variants.map((v) => ({ id: v.id, options: v.options, price: toMinor(v.price, cur), compareAt: v.compareAt ? toMinor(v.compareAt, cur) : undefined, stock: Number(v.stock) || 0, sku: v.sku || undefined }))
        : [],
    };
    try {
      if (isNew) {
        const p = await api<Product>('/products', { body });
        navigate(`/products/${p._id}`, { replace: true });
      } else {
        setProduct(await api<Product>(`/products/${id}`, { method: 'PUT', body }));
        setSaved(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    const copy = await api<Product>(`/products/${id}/duplicate`, { method: 'POST' });
    navigate(`/products/${copy._id}`);
  }

  const storefront = me.storefrontUrl ? `${me.storefrontUrl.replace(/\/$/, '')}/products/${form.slug}?store=${store.slug}` : null;

  return (
    <div className="page">
      <PageHeader
        title={isNew ? 'Add product' : form.title || 'Product'}
        badge={product?.ratingCount ? <Badge tone="info">{product.ratingAvg} ★ ({product.ratingCount})</Badge> : undefined}
        actions={
          <>
            {saved ? <span className="muted">Saved</span> : null}
            {!isNew && storefront && form.status === 'active' ? <a className="btn btn--plain" href={storefront} target="_blank" rel="noreferrer">View</a> : null}
            {!isNew ? <Button tone="plain" onClick={() => void duplicate()}>Duplicate</Button> : null}
            <Button tone="primary" busy={busy} onClick={save}>Save</Button>
          </>
        }
      />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <div className="form2">
        <div className="form2__main">
          <Card>
            <Field label="Title"><input className="input" value={form.title} onChange={text('title')} /></Field>
            <Field label="Description"><textarea className="textarea" rows={6} value={form.description} onChange={text('description')} /></Field>
          </Card>
          <ImagesEditor images={form.images} onChange={(images) => update({ images })} />
          {!hasVariants ? (
            <Card title="Pricing and inventory">
              <div className="cols2">
                <Field label={`Price (${cur.toUpperCase()})`}><input className="input" inputMode="decimal" value={form.price} onChange={text('price')} /></Field>
                <Field label="Compare-at price" hint="Shows as a sale"><input className="input" inputMode="decimal" value={form.compareAt} onChange={text('compareAt')} /></Field>
                <Field label="In stock"><input className="input" type="number" min={0} value={form.stock} onChange={text('stock')} /></Field>
                <Field label="SKU"><input className="input mono" value={form.sku} onChange={text('sku')} /></Field>
              </div>
            </Card>
          ) : null}
          <Card
            title="Variants"
            action={form.options.length < 3 ? <Button tone="plain" onClick={() => setOptions([...form.options, { name: form.options.length ? '' : 'Size', values: '' }])}>Add option</Button> : undefined}
          >
            {!form.options.length ? <span className="muted">Add options like size or colour if this product comes in variations.</span> : null}
            {form.options.map((o, i) => (
              <div className="cols2" key={i}>
                <Field label="Option name"><input className="input" value={o.name} onChange={(e) => setOptions(form.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                <Field label="Values" hint="Comma separated, e.g. S, M, L">
                  <div className="row">
                    <input className="input" value={o.values} onChange={(e) => setOptions(form.options.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} />
                    <Button tone="plain" onClick={() => setOptions(form.options.filter((_, j) => j !== i))} aria-label="Remove option">✕</Button>
                  </div>
                </Field>
              </div>
            ))}
            {hasVariants ? (
              <div className="tscroll">
                <table className="table vgrid">
                  <thead><tr><th>Variant</th><th>Price</th><th>Compare-at</th><th>Stock</th><th>SKU</th></tr></thead>
                  <tbody>
                    {form.variants.map((v, i) => (
                      <tr key={v.id}>
                        <td className="cell--primary">{v.options.join(' / ')}</td>
                        <td><input className="input" inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} /></td>
                        <td><input className="input" inputMode="decimal" value={v.compareAt} onChange={(e) => setVariant(i, { compareAt: e.target.value })} /></td>
                        <td><input className="input" type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} /></td>
                        <td><input className="input mono" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </div>
        <div className="form2__side">
          <Card title="Status">
            <select className="select" value={form.status} onChange={(e) => update({ status: e.target.value as Product['status'] })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Card>
          <Card title="Categories">
            {categories?.length ? (
              categories.map((c) => (
                <label className="check" key={c._id}>
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(c._id)}
                    onChange={(e) => update({ categoryIds: e.target.checked ? [...form.categoryIds, c._id] : form.categoryIds.filter((x) => x !== c._id) })}
                  />{' '}
                  {c.name}
                </label>
              ))
            ) : (
              <span className="muted">No categories yet.</span>
            )}
          </Card>
          <Card title="Search and URL">
            <Field label="URL handle"><input className="input mono" value={form.slug} onChange={(e) => { setSlugTouched(true); text('slug')(e); }} /></Field>
            <Field label="Tags" hint="Comma separated, also used by search"><input className="input" value={form.tags} onChange={text('tags')} /></Field>
          </Card>
        </div>
      </div>
    </div>
  );
}
