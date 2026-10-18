import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, Copy, ExternalLink, Package, Plus, X } from 'lucide-react';
import { api, type Category, type Product, type Variant } from '../api';
import { useApp, useStore } from '../context';
import { dateTime, slugify, toMajor, toMinor } from '../format';
import { Banner, Button, Card, Defs, Field, Loading, MediaEditor, MenuItem, MenuSeparator, PageHeader, SaveBar, Stars, TagInput, useAsync, useToast } from '../ui';
import { productStatus } from './Products';

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
  tags: string[];
  categoryIds: string[];
  options: { name: string; values: string }[];
  variants: VariantRow[];
}

const blank: Form = { title: '', slug: '', description: '', images: [], price: '', compareAt: '', stock: '0', sku: '', status: 'draft', tags: [], categoryIds: [], options: [], variants: [] };

const newId = () => Math.random().toString(36).slice(2, 10);

function combos(options: Form['options']): string[][] {
  const lists = options.map((o) => o.values.split(',').map((v) => v.trim()).filter(Boolean)).filter((l) => l.length);
  if (!lists.length || lists.length !== options.length) return [];
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])), [[]]);
}

function syncVariants(form: Form): VariantRow[] {
  const existing = new Map(form.variants.map((v) => [v.options.join('\u0000'), v]));
  return combos(form.options).map((opts) => existing.get(opts.join('\u0000')) ?? { id: newId(), options: opts, price: form.price, compareAt: form.compareAt, stock: '0', sku: '' });
}

function toForm(p: Product, cur: string): Form {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    images: p.images,
    price: toMajor(p.price, cur),
    compareAt: toMajor(p.compareAt, cur),
    stock: String(p.stock),
    sku: p.sku ?? '',
    status: p.status,
    tags: p.tags,
    categoryIds: p.categoryIds ?? [],
    options: (p.options ?? []).map((o) => ({ name: o.name, values: o.values.join(', ') })),
    variants: (p.variants ?? []).map((v: Variant) => ({ id: v.id, options: v.options, price: toMajor(v.price, cur), compareAt: toMajor(v.compareAt, cur), stock: String(v.stock), sku: v.sku ?? '' })),
  };
}

export function ProductDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const store = useStore();
  const { me } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const cur = store.currency;
  const { data: categories } = useAsync(() => api<Category[]>(`/categories?storeId=${store._id}`), [store._id]);
  const [product, setProduct] = useState<Product | null>(null);
  const [saved, setSaved] = useState<Form | null>(isNew ? blank : null);
  const [form, setForm] = useState<Form | null>(isNew ? blank : null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    api<Product>(`/products/${id}`)
      .then((p) => {
        setProduct(p);
        setSaved(toForm(p, cur));
        setForm(toForm(p, cur));
      })
      .catch((e: Error) => setError(e.message));
  }, [id, isNew, cur]);

  const dirty = useMemo(() => Boolean(form && saved && JSON.stringify(form) !== JSON.stringify(saved)), [form, saved]);

  if (!form) return <div className="page">{error ? <Banner tone="critical" title="Couldn't load this product">{error}</Banner> : <Loading what="product" />}</div>;

  const update = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const text = (k: 'title' | 'slug' | 'description' | 'price' | 'compareAt' | 'stock' | 'sku') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    update({ [k]: value, ...(k === 'title' && !slugTouched ? { slug: slugify(value) } : {}) });
  };
  const setOptions = (options: Form['options']) => update({ options, variants: syncVariants({ ...form, options }) });
  const setVariant = (i: number, patch: Partial<VariantRow>) => update({ variants: form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const hasVariants = form.variants.length > 0;

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const options = form.options.map((o) => ({ name: o.name.trim(), values: o.values.split(',').map((v) => v.trim()).filter(Boolean) })).filter((o) => o.name && o.values.length);
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
      tags: form.tags,
      categoryIds: form.categoryIds,
      options: hasVariants ? options : [],
      variants: hasVariants ? form.variants.map((v) => ({ id: v.id, options: v.options, price: toMinor(v.price, cur), compareAt: v.compareAt ? toMinor(v.compareAt, cur) : undefined, stock: Number(v.stock) || 0, sku: v.sku || undefined })) : [],
    };
    try {
      if (isNew) {
        const p = await api<Product>('/products', { body });
        toast.show('Product created');
        navigate(`/products/${p._id}`, { replace: true });
      } else {
        const p = await api<Product>(`/products/${id}`, { method: 'PUT', body });
        setProduct(p);
        setSaved(toForm(p, cur));
        setForm(toForm(p, cur));
        toast.show('Product saved');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    const copy = await api<Product>(`/products/${id}/duplicate`, { method: 'POST' });
    toast.show('Copy created as a draft');
    navigate(`/products/${copy._id}`);
  }

  const base = me.storefrontUrl.replace(/\/$/, '');
  const storefront = base ? `${base}/products/${form.slug}?store=${store.slug}` : null;
  const domain = store.domains[0] ?? (base ? new URL(base).host : 'your-store.com');
  const description = form.description.replace(/\s+/g, ' ').trim();

  return (
    <div className="page">
      <PageHeader
        icon={<Package aria-hidden="true" />}
        backTo="/products"
        backLabel="Products"
        title={isNew ? 'Add product' : product?.title || 'Product'}
        badge={!isNew && product ? productStatus(product.status) : undefined}
        menu={
          isNew
            ? undefined
            : (close) => (
                <>
                  {storefront && product?.status === 'active' ? <MenuItem icon={<ExternalLink aria-hidden="true" />} onSelect={() => { close(); window.open(storefront, '_blank', 'noreferrer'); }}>View on storefront</MenuItem> : null}
                  <MenuItem icon={<Copy aria-hidden="true" />} onSelect={() => { close(); void duplicate(); }}>Duplicate</MenuItem>
                  {product?.status !== 'archived' ? (
                    <>
                      <MenuSeparator />
                      <MenuItem critical icon={<Archive aria-hidden="true" />} onSelect={() => { close(); update({ status: 'archived' }); }}>Archive</MenuItem>
                    </>
                  ) : null}
                </>
              )
        }
        actions={isNew ? <Button tone="primary" size="lg" busy={busy} disabled={!form.title || !form.slug} onClick={save}>Save product</Button> : undefined}
      />
      {!isNew ? <SaveBar when={dirty} saving={busy} label="Unsaved product changes" onDiscard={() => saved && setForm(saved)} onSave={() => void save()} /> : null}
      {error ? <Banner tone="critical" title="Couldn't save">{error}</Banner> : null}
      <div className="form2">
        <div className="form2__main">
          <Card>
            <Field label="Title" hint={<>Storefront path: <span className="mono">/products/{form.slug || '...'}</span></>}>
              <input className="input" value={form.title} onChange={text('title')} placeholder="Short sleeve t-shirt" />
            </Field>
            <Field label="Description">
              <textarea className="textarea" rows={7} value={form.description} onChange={text('description')} placeholder="What it is, what it is made of, who it is for..." />
            </Field>
          </Card>
          <Card title="Media">
            <MediaEditor storeId={store._id} images={form.images} onChange={(images) => update({ images })} canUpload={me.media} onError={(m) => toast.show(m, 'critical')} />
          </Card>
          {!hasVariants ? (
            <>
              <Card title="Pricing">
                <div className="cols2">
                  <Field label="Price"><span className="affix"><span className="affix__tag">{cur.toUpperCase()}</span><input className="input affix__fill" inputMode="decimal" value={form.price} onChange={text('price')} placeholder="0.00" /></span></Field>
                  <Field label="Compare-at price" hint="Shown struck through, as a sale"><span className="affix"><span className="affix__tag">{cur.toUpperCase()}</span><input className="input affix__fill" inputMode="decimal" value={form.compareAt} onChange={text('compareAt')} placeholder="0.00" /></span></Field>
                </div>
              </Card>
              <Card title="Inventory">
                <div className="cols2">
                  <Field label="Quantity in stock"><input className="input" type="number" min={0} value={form.stock} onChange={text('stock')} /></Field>
                  <Field label="SKU" hint="Stock keeping unit, printed on packing slips"><input className="input mono" value={form.sku} onChange={text('sku')} /></Field>
                </div>
              </Card>
            </>
          ) : null}
          <Card
            title="Variants"
            action={form.options.length < 3 ? <Button onClick={() => setOptions([...form.options, { name: form.options.length ? '' : 'Size', values: '' }])}><Plus aria-hidden="true" /> Add option</Button> : undefined}
          >
            {!form.options.length ? <span className="muted">Add options like size or colour if this product comes in more than one version. Each combination gets its own price, stock and SKU.</span> : null}
            {form.options.map((o, i) => (
              <div className="row" key={i} style={{ alignItems: 'flex-end' }}>
                <Field label="Option name"><input className="input" value={o.name} onChange={(e) => setOptions(form.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                <div style={{ flex: 2 }}>
                  <Field label="Values" hint="Comma separated, e.g. S, M, L">
                    <input className="input" value={o.values} onChange={(e) => setOptions(form.options.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} />
                  </Field>
                </div>
                <Button tone="plain" iconOnly onClick={() => setOptions(form.options.filter((_, j) => j !== i))} aria-label="Remove option" style={{ marginBottom: 22 }}><X aria-hidden="true" /></Button>
              </div>
            ))}
          </Card>
          {hasVariants ? (
            <Card title={<>Variant prices and stock <span className="muted">· {form.variants.length}</span></>} flush>
              <div className="tscroll">
                <table className="table vgrid">
                  <thead><tr><th>Variant</th><th>Price</th><th>Compare-at</th><th>Stock</th><th>SKU</th></tr></thead>
                  <tbody>
                    {form.variants.map((v, i) => (
                      <tr key={v.id}>
                        <td className="cell--primary"><strong>{v.options.join(' / ')}</strong></td>
                        <td><input className="input" inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} aria-label={`${v.options.join(' / ')} price`} /></td>
                        <td><input className="input" inputMode="decimal" value={v.compareAt} onChange={(e) => setVariant(i, { compareAt: e.target.value })} aria-label={`${v.options.join(' / ')} compare-at price`} /></td>
                        <td><input className="input" type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} aria-label={`${v.options.join(' / ')} stock`} /></td>
                        <td><input className="input mono" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} aria-label={`${v.options.join(' / ')} SKU`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
          <Card title="Search engine listing">
            <div className="seo">
              <span className="seo__url">{domain} › products › {form.slug || '...'}</span>
              <span className="seo__title">{form.title || 'Product title'} | {store.name}</span>
              <span className="seo__desc">{description ? description.slice(0, 160) + (description.length > 160 ? '...' : '') : 'The first lines of the description show here.'}</span>
            </div>
            <Field label="URL handle">
              <input className="input mono" value={form.slug} onChange={(e) => { setSlugTouched(true); text('slug')(e); }} />
            </Field>
          </Card>
        </div>
        <div className="form2__side">
          <Card title="Status">
            <select className="select" value={form.status} onChange={(e) => update({ status: e.target.value as Product['status'] })}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <span className="field__hint">{form.status === 'active' ? 'Visible on the storefront.' : form.status === 'draft' ? 'Hidden until you set it to Active.' : 'Hidden, but kept on past orders.'}</span>
          </Card>
          <Card title="Organisation">
            <div className="field">
              <span className="field__label">Categories</span>
              {categories?.length ? (
                categories.map((c) => (
                  <label className="check" key={c._id}>
                    <input type="checkbox" checked={form.categoryIds.includes(c._id)} onChange={(e) => update({ categoryIds: e.target.checked ? [...form.categoryIds, c._id] : form.categoryIds.filter((x) => x !== c._id) })} /> {c.name}
                  </label>
                ))
              ) : (
                <span className="field__hint">No categories yet. <Link to="/products/categories">Create one</Link>.</span>
              )}
            </div>
            <Field label="Tags" hint="Shoppers find products by tag in search.">
              <TagInput label="Tags" value={form.tags} onChange={(tags) => update({ tags })} />
            </Field>
          </Card>
          {product ? (
            <>
              <Card title="Reviews" action={<Link to="/products/reviews">Moderate</Link>}>
                {product.ratingCount ? (
                  <div className="row"><Stars value={Math.round(product.ratingAvg ?? 0)} /> <strong>{product.ratingAvg}</strong> <span className="muted">from {product.ratingCount}</span></div>
                ) : (
                  <span className="muted">No approved reviews yet.</span>
                )}
              </Card>
              <Card title="Details">
                <Defs rows={[{ label: 'Created', value: dateTime(product.createdAt) }, { label: 'Updated', value: dateTime(product.updatedAt) }]} />
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
