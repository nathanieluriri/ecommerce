import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs, type Paged, type Product } from '../api';
import { useStore } from '../context';
import { money } from '../format';
import { Badge, Button, Empty, Loading, PageHeader, Pager, Tabs, useAsync } from '../ui';

const SIZE = 25;
type Filter = '' | Product['status'] | 'low';

export function Products() {
  const store = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Filter>(params.get('lowStock') ? 'low' : '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error } = useAsync(() => api<Paged<Product>>(`/products${qs({ storeId: store._id, ...(status === 'low' ? { lowStock: 5 } : { status }), q, page, limit: SIZE })}`), [store._id, status, q, page]);

  return (
    <div className="page">
      <PageHeader title="Products" actions={<Button tone="primary" onClick={() => navigate('/products/new')}>Add product</Button>} />
      <div className="tcard">
        <Tabs<Filter>
          value={status}
          onChange={(v) => { setPage(1); setStatus(v); }}
          options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }, { value: 'low', label: 'Low stock' }]}
        />
        <div className="tfilter">
          <div className="tfilter__search">
            <input className="input" placeholder="Search products" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
        </div>
        {error ? <p className="field__error" style={{ padding: 'var(--s4)' }}>{error}</p> : null}
        {!data ? (
          <Loading what="products" />
        ) : data.items.length === 0 ? (
          <Empty title="No products yet" body="Add your first product and set it to Active to show it on the storefront." actions={<Button tone="primary" onClick={() => navigate('/products/new')}>Add product</Button>} />
        ) : (
          <div className="tscroll">
            <table className="table">
              <thead>
                <tr><th>Product</th><th>Status</th><th className="th--num">Stock</th><th className="th--num">Price</th></tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id} className="is-clickable" onClick={() => navigate(`/products/${p._id}`)}>
                    <td className="cell--primary">
                      <span className="idcell">
                        {p.images[0] ? <img className="thumb" src={p.images[0]} alt="" /> : <span className="thumb" />}
                        <span className="idcell__text"><span className="idcell__title">{p.title}</span><span className="idcell__meta muted">{p.variants.length ? `${p.variants.length} variants` : p.sku ? `SKU ${p.sku}` : p.slug}</span></span>
                      </span>
                    </td>
                    <td><Badge tone={p.status === 'active' ? 'ok' : p.status === 'draft' ? 'info' : 'neutral'}>{p.status}</Badge></td>
                    <td className="cell--num num">{p.stock <= 0 ? <Badge tone="critical">0</Badge> : p.stock}</td>
                    <td className="cell--num num">{p.variants.length && p.variants.some((v) => v.price !== p.price) ? 'From ' : ''}{money(p.price, store.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data ? <Pager page={page} total={data.total} size={SIZE} onPage={setPage} /> : null}
      </div>
    </div>
  );
}
