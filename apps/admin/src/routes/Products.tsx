import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTree, Package, Plus } from 'lucide-react';
import { api, qs, type Category, type Paged, type Product } from '../api';
import { useStore } from '../context';
import { money } from '../format';
import { Badge, Banner, BoxArt, Button, DataTable, Empty, IdCell, Learn, MenuItem, PageHeader, Tabs, useAsync, useToast } from '../ui';
import { shortDate } from './Orders';

const SIZE = 25;
type Filter = '' | Product['status'];

export const productStatus = (s: Product['status']) => (
  <Badge tone={s === 'active' ? 'ok' : s === 'draft' ? 'warn' : 'neutral'}>{s === 'active' ? 'Active' : s === 'draft' ? 'Draft' : 'Archived'}</Badge>
);

export function stockLine(p: Product) {
  const n = p.stock;
  const text = p.variants.length ? `${n} in stock for ${p.variants.length} variants` : `${n} in stock`;
  return n <= 0 ? <span style={{ color: 'var(--critical)' }}>{text}</span> : n <= 5 ? <span style={{ color: 'var(--warn-ink)' }}>{text}</span> : <span>{text}</span>;
}

export function Products() {
  const store = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState<Filter>('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useAsync(
    () => api<Paged<Product>>(`/products${qs({ storeId: store._id, status, category, q, page, limit: SIZE })}`),
    [store._id, status, category, q, page],
  );
  const cats = useAsync(() => api<Category[]>(`/categories?storeId=${store._id}`), [store._id]);
  const catName = new Map((cats.data ?? []).map((c) => [c._id, c.name]));

  async function bulk(ids: string[], next: Product['status'], clear: () => void) {
    const r = await api<{ updated: number }>('/products/bulk', { body: { ids, status: next } });
    toast.show(`${r.updated} ${r.updated === 1 ? 'product' : 'products'} ${next === 'archived' ? 'archived' : `set to ${next}`}`);
    clear();
    reload();
  }

  const add = <Button tone="primary" size="lg" onClick={() => navigate('/products/new')}><Plus aria-hidden="true" /> Add product</Button>;

  return (
    <div className="page">
      <PageHeader
        icon={<Package aria-hidden="true" />}
        title="Products"
        menu={(close) => <MenuItem icon={<FolderTree aria-hidden="true" />} onSelect={() => { close(); navigate('/products/categories'); }}>Manage categories</MenuItem>}
        actions={add}
      />
      {error ? <Banner tone="critical" title="Couldn't load products">{error}</Banner> : null}
      <DataTable<Product>
        tabs={
          <Tabs<Filter>
            value={status}
            onChange={(v) => { setPage(1); setStatus(v); }}
            options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }]}
          />
        }
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'Search by title or SKU' }}
        filter={
          cats.data?.length ? (
            <select className="select" value={category} aria-label="Category" onChange={(e) => { setPage(1); setCategory(e.target.value); }} style={{ flex: 'none', maxWidth: '12rem' }}>
              <option value="">All categories</option>
              {cats.data.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          ) : undefined
        }
        rows={data?.items ?? (error ? [] : null)}
        rowKey={(p) => p._id}
        href={(p) => `/products/${p._id}`}
        page={data ? { page, size: SIZE, total: data.total, onPage: setPage } : undefined}
        bulk={(ids, clear) => (
          <>
            <Button onClick={() => void bulk(ids, 'active', clear)}>Set active</Button>
            <Button onClick={() => void bulk(ids, 'draft', clear)}>Set draft</Button>
            <Button tone="critical" onClick={() => void bulk(ids, 'archived', clear)}>Archive</Button>
          </>
        )}
        empty={
          q || status || category ? (
            <Empty title="No products match" body="Try another tab, category or search." />
          ) : (
            <Empty art={<BoxArt />} title="Add your first product" body="Give it a title, a price and a photo, then set it to Active to show it on the storefront." actions={add} />
          )
        }
        columns={[
          { key: 'p', header: 'Product', render: (p) => <IdCell thumb={p.images[0] ?? null} title={p.title} meta={<span className="mono">/{p.slug}</span>} /> },
          { key: 's', header: 'Status', render: (p) => productStatus(p.status) },
          { key: 'i', header: 'Inventory', render: stockLine },
          { key: 'c', header: 'Category', render: (p) => <span className="muted">{p.categoryIds.map((id) => catName.get(id)).filter(Boolean).join(', ') || '-'}</span> },
          { key: 'u', header: 'Updated', render: (p) => <span className="muted">{shortDate(p.updatedAt)}</span> },
          { key: 'pr', header: 'Price', numeric: true, render: (p) => `${p.variants.some((v) => v.price !== p.price) ? 'From ' : ''}${money(p.price, store.currency)}` },
        ]}
      />
      <Learn>Archived products are hidden from the storefront but stay on past orders.</Learn>
    </div>
  );
}
