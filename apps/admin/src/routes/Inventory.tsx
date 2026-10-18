import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { api, qs, type Paged, type Product } from '../api';
import { useStore } from '../context';
import { BoxArt, Badge, Banner, Button, DataTable, Empty, IdCell, Learn, PageHeader, Tabs, useAsync, useToast } from '../ui';

interface Row {
  key: string;
  product: Product;
  variantId?: string;
  title: string;
  sku?: string;
  stock: number;
}

const SIZE = 50;

function rowsOf(products: Product[]): Row[] {
  return products.flatMap((p) =>
    p.variants.length
      ? p.variants.map((v) => ({ key: `${p._id}.${v.id}`, product: p, variantId: v.id, title: v.options.join(' / '), sku: v.sku, stock: v.stock }))
      : [{ key: p._id, product: p, title: '', sku: p.sku, stock: p.stock }],
  );
}

export function Inventory() {
  const store = useStore();
  const toast = useToast();
  const threshold = store.lowStockThreshold ?? 5;
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useAsync(
    () => api<Paged<Product>>(`/products${qs({ storeId: store._id, q, page, limit: SIZE, ...(tab === 'low' ? { lowStock: threshold } : {}) })}`),
    [store._id, q, page, tab],
  );
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const rows = data ? rowsOf(data.items.filter((p) => p.status !== 'archived')).filter((r) => tab === 'all' || r.stock <= threshold) : null;
  const changed = Object.keys(edits).filter((k) => rows?.find((r) => r.key === k && String(r.stock) !== edits[k]));

  async function save() {
    if (!rows) return;
    setBusy(true);
    const byProduct = new Map<string, Row[]>();
    for (const k of changed) {
      const r = rows.find((x) => x.key === k)!;
      byProduct.set(r.product._id, [...(byProduct.get(r.product._id) ?? []), r]);
    }
    try {
      for (const [pid, list] of byProduct) {
        const p = list[0]!.product;
        const body = p.variants.length
          ? { variants: p.variants.map((v) => ({ ...v, stock: Math.max(0, Number(edits[`${pid}.${v.id}`] ?? v.stock) || 0) })) }
          : { stock: Math.max(0, Number(edits[pid]) || 0) };
        await api(`/products/${pid}`, { method: 'PUT', body });
      }
      toast.show(`Stock updated for ${changed.length} ${changed.length === 1 ? 'item' : 'items'}`);
      setEdits({});
      reload();
    } catch (e) {
      toast.show((e as Error).message, 'critical');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        icon={<Boxes aria-hidden="true" />}
        title="Inventory"
        subtitle={`Low stock means ${threshold} or fewer. Change the threshold in Settings › Notifications.`}
        actions={changed.length ? (
          <>
            <Button size="lg" onClick={() => setEdits({})}>Discard</Button>
            <Button tone="primary" size="lg" busy={busy} onClick={save}>Save {changed.length} {changed.length === 1 ? 'change' : 'changes'}</Button>
          </>
        ) : undefined}
      />
      {error ? <Banner tone="critical" title="Couldn't load inventory">{error}</Banner> : null}
      <DataTable<Row>
        tabs={<Tabs value={tab} onChange={(v) => { setPage(1); setTab(v); }} options={[{ value: 'all', label: 'All' }, { value: 'low', label: 'Low stock' }]} />}
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'Search by product or SKU' }}
        rows={rows ?? (error ? [] : null)}
        rowKey={(r) => r.key}
        page={data ? { page, size: SIZE, total: data.total, onPage: setPage } : undefined}
        empty={tab === 'low' ? <Empty art={<BoxArt />} title="Nothing is running low" body="Products at or under the threshold show here." /> : <Empty art={<BoxArt />} title="No products yet" />}
        columns={[
          { key: 'p', header: 'Product', render: (r) => <Link to={`/products/${r.product._id}`} className="plainlink"><IdCell thumb={r.product.images[0] ?? null} title={r.product.title} meta={r.title || undefined} /></Link> },
          { key: 'sku', header: 'SKU', render: (r) => <span className="mono muted">{r.sku ?? '-'}</span> },
          { key: 'state', header: 'State', render: (r) => (r.stock <= 0 ? <Badge tone="critical">Sold out</Badge> : r.stock <= threshold ? <Badge tone="warn">Low</Badge> : <Badge tone="ok">In stock</Badge>) },
          {
            key: 'n',
            header: 'Available',
            numeric: true,
            render: (r) => (
              <input
                className="input input--tiny num"
                type="number"
                min={0}
                style={{ width: '6rem', textAlign: 'right' }}
                aria-label={`Stock for ${r.product.title} ${r.title}`}
                value={edits[r.key] ?? String(r.stock)}
                onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
              />
            ),
          },
        ]}
      />
      <Learn>Stock goes down automatically when an order is paid.</Learn>
    </div>
  );
}
