import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs, type Order, type OrderStatus, type Paged } from '../api';
import { useStore } from '../context';
import { dateTime, money } from '../format';
import { Empty, Loading, PageHeader, Pager, StatusBadge, Tabs, useAsync } from '../ui';

const TABS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Unfulfilled' },
  { value: 'fulfilled', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const SIZE = 25;

export function Orders() {
  const store = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as '' | OrderStatus;
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error } = useAsync(
    () => api<Paged<Order>>(`/orders${qs({ storeId: store._id, status, q, page, limit: SIZE })}`),
    [store._id, status, q, page],
  );

  return (
    <div className="page">
      <PageHeader title="Orders" subtitle="Payments are taken by Stripe. Paid orders land here ready to fulfil." />
      <div className="tcard">
        <Tabs value={status} options={TABS} onChange={(v) => { setPage(1); setParams(v ? { status: v } : {}); }} />
        <div className="tfilter">
          <div className="tfilter__search">
            <input className="input" placeholder="Search by order number, name or email" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
        </div>
        {error ? <p className="field__error" style={{ padding: 'var(--s4)' }}>{error}</p> : null}
        {!data ? (
          <Loading what="orders" />
        ) : data.items.length === 0 ? (
          <Empty title="No orders here" body="Orders appear once a customer starts checkout on the storefront." />
        ) : (
          <div className="tscroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th className="th--num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o._id} className="is-clickable" onClick={() => navigate(`/orders/${o._id}`)}>
                    <td className="cell--primary"><strong>#{o.number}</strong></td>
                    <td className="muted">{dateTime(o.createdAt)}</td>
                    <td>{o.customer.name || o.customer.email || <span className="muted">Guest</span>}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="cell--num num">{money(o.total, o.currency)}</td>
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
