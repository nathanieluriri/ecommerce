import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs, type Customer, type Paged } from '../api';
import { useStore } from '../context';
import { dateTime, money } from '../format';
import { Empty, Loading, PageHeader, Pager, Tabs, useAsync } from '../ui';

const SIZE = 25;

export function Customers() {
  const store = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'spent'>('recent');
  const [page, setPage] = useState(1);
  const { data } = useAsync(() => api<Paged<Customer>>(`/customers${qs({ storeId: store._id, q, sort, page, limit: SIZE })}`), [store._id, q, sort, page]);
  return (
    <div className="page">
      <PageHeader title="Customers" subtitle="Created automatically from paid orders." />
      <div className="tcard">
        <Tabs value={sort} onChange={(v) => { setPage(1); setSort(v); }} options={[{ value: 'recent', label: 'Recent' }, { value: 'spent', label: 'Top spenders' }]} />
        <div className="tfilter">
          <div className="tfilter__search"><input className="input" placeholder="Search by name or email" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} /></div>
        </div>
        {!data ? (
          <Loading what="customers" />
        ) : data.items.length === 0 ? (
          <Empty title="No customers yet" />
        ) : (
          <div className="tscroll">
            <table className="table">
              <thead><tr><th>Customer</th><th>Last order</th><th className="th--num">Orders</th><th className="th--num">Spent</th></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c._id} className="is-clickable" onClick={() => navigate(`/customers/${c._id}`)}>
                    <td className="cell--primary"><span className="idcell__text"><span className="idcell__title">{c.name ?? c.email}</span><span className="idcell__meta muted">{c.email}</span></span></td>
                    <td className="muted">{c.lastOrderAt ? dateTime(c.lastOrderAt) : ''}</td>
                    <td className="cell--num num">{c.orders}</td>
                    <td className="cell--num num">{money(c.totalSpent, store.currency)}</td>
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
