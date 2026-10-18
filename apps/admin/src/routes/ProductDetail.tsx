import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Product } from '../api';
import { useStore } from '../context';
import { slugify, toMajor, toMinor } from '../format';
import { Banner, Button, Card, Field, Loading, PageHeader } from '../ui';

interface Form {
  title: string;
  slug: string;
  description: string;
  images: string;
  price: string;
  compareAt: string;
  stock: string;
  status: Product['status'];
  tags: string;
}

const blank: Form = { title: '', slug: '', description: '', images: '', price: '', compareAt: '', stock: '0', status: 'draft', tags: '' };

export function ProductDetail() {
  const { id } = useParams();
  const isNew = id === 'new';
  const store = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(isNew ? blank : null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api<Product>(`/products/${id}`)
      .then((p) =>
        setForm({
          title: p.title,
          slug: p.slug,
          description: p.description,
          images: p.images.join('\n'),
          price: toMajor(p.price, store.currency),
          compareAt: toMajor(p.compareAt, store.currency),
          stock: String(p.stock),
          status: p.status,
          tags: p.tags.join(', '),
        }),
      )
      .catch((e: Error) => setError(e.message));
  }, [id, isNew, store.currency]);

  if (!form) return <div className="page">{error ? <Banner tone="critical">{error}</Banner> : <Loading what="product" />}</div>;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setSaved(false);
    setForm((f) => (f ? { ...f, [k]: value, ...(k === 'title' && !slugTouched ? { slug: slugify(value) } : {}) } : f));
  };

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const body = {
      storeId: store._id,
      title: form.title,
      slug: form.slug,
      description: form.description,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      price: toMinor(form.price, store.currency),
      compareAt: form.compareAt ? toMinor(form.compareAt, store.currency) : undefined,
      stock: Number(form.stock) || 0,
      status: form.status,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isNew) {
        const p = await api<Product>('/products', { body });
        navigate(`/products/${p._id}`, { replace: true });
      } else {
        await api(`/products/${id}`, { method: 'PUT', body });
        setSaved(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={isNew ? 'Add product' : form.title || 'Product'}
        actions={
          <>
            {saved ? <span className="muted">Saved</span> : null}
            <Button tone="primary" busy={busy} onClick={save}>Save</Button>
          </>
        }
      />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <div className="form2">
        <div className="form2__main">
          <Card>
            <Field label="Title"><input className="input" value={form.title} onChange={set('title')} /></Field>
            <Field label="Description"><textarea className="textarea" rows={6} value={form.description} onChange={set('description')} /></Field>
            <Field label="Image URLs" hint="One per line. The first is the cover.">
              <textarea className="textarea mono" rows={3} value={form.images} onChange={set('images')} />
            </Field>
          </Card>
          <Card title="Pricing">
            <div className="cols2">
              <Field label={`Price (${store.currency.toUpperCase()})`}><input className="input" inputMode="decimal" value={form.price} onChange={set('price')} /></Field>
              <Field label="Compare-at price"><input className="input" inputMode="decimal" value={form.compareAt} onChange={set('compareAt')} /></Field>
            </div>
          </Card>
        </div>
        <div className="form2__side">
          <Card title="Status">
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Card>
          <Card title="Inventory">
            <Field label="In stock"><input className="input" type="number" min={0} value={form.stock} onChange={set('stock')} /></Field>
          </Card>
          <Card title="Organisation">
            <Field label="URL handle"><input className="input mono" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug')(e); }} /></Field>
            <Field label="Tags" hint="Comma separated"><input className="input" value={form.tags} onChange={set('tags')} /></Field>
          </Card>
        </div>
      </div>
    </div>
  );
}
