import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ShoppingBag } from 'lucide-react';
import { api, download, qs, type Order, type OrderStatus, type Paged } from '../api';
import { useStore } from '../context';
import { money } from '../format';
import { Badge, Banner, DataTable, Empty, Learn, MenuItem, PageHeader, ReceiptArt, StatusBadge, Tabs, useAsync } from '../ui';

const TABS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'fulfilled', label: 'Sent out' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SIZE = 25;

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function Orders() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as '' | OrderStatus;
  const flag = params.get('flag') ?? '';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error } = useAsync(() => api<Paged<Order>>(`/orders${qs({ storeId: store._id, status, flag, q, page, limit: SIZE })}`), [store._id, status, flag, q, page]);

  const set = (next: Record<string, string>) => {
    setPage(1);
    setParams(Object.fromEntries(Object.entries({ status, flag, ...next }).filter(([, v]) => v)));
  };

  return (
    <div className="page">
      <PageHeader
        icon={<ShoppingBag aria-hidden="true" />}
        title="Orders"
        menu={(close) => (
          <MenuItem icon={<Download aria-hidden="true" />} onSelect={() => { close(); void download(`/orders/export${qs({ storeId: store._id, status, flag, q })}`, `orders-${store.slug}.csv`); }}>
            Export these orders as CSV
          </MenuItem>
        )}
      />
      {error ? <Banner tone="critical" title="Couldn't load orders">{error}</Banner> : null}
      <DataTable<Order>
        tabs={<Tabs value={status} options={TABS} onChange={(v) => set({ status: v })} />}
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'Search by order number, name or email' }}
        filter={
          <select className="select" value={flag} aria-label="Filter" onChange={(e) => set({ flag: e.target.value })} style={{ flex: 'none', maxWidth: '12rem' }}>
            <option value="">All orders</option>
            <option value="oversold">Oversold</option>
          </select>
        }
        rows={data?.items ?? (error ? [] : null)}
        rowKey={(o) => o._id}
        href={(o) => `/orders/${o._id}`}
        page={data ? { page, size: SIZE, total: data.total, onPage: setPage } : undefined}
        empty={
          q || status || flag ? (
            <Empty title="No orders match" body="Try another tab or search." />
          ) : (
            <Empty art={<ReceiptArt />} title="Your orders will show here" body="This is where you send out orders, take refunds and follow their progress." />
          )
        }
        columns={[
          {
            key: 'order',
            header: 'Order',
            render: (o) => (
              <span className="idcell__text">
                <span className="idcell__title mono">#{o.number}</span>
                <span className="idcell__meta">{o.customer.email ?? 'No email yet'}</span>
              </span>
            ),
          },
          { key: 'date', header: 'Date', render: (o) => shortDate(o.createdAt) },
          {
            key: 'status', mobile: true,
            header: 'Status',
            render: (o) => (
              <span className="row" style={{ gap: 'var(--s1)' }}>
                <StatusBadge status={o.status} />
                {o.flags?.includes('oversold') ? <Badge tone="critical">Oversold</Badge> : null}
                {o.refundedAmount && o.status !== 'refunded' ? <Badge tone="warn">Part refunded</Badge> : null}
              </span>
            ),
          },
          { key: 'items', header: 'Items', numeric: true, render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
          {
            key: 'dest',
            header: 'Destination',
            render: (o) => <span className="muted">{[o.shippingAddress?.city, o.shippingAddress?.country].filter(Boolean).join(', ') || '-'}</span>,
          },
          { key: 'total', mobile: true, header: 'Total', numeric: true, render: (o) => <strong>{money(o.total, o.currency)}</strong> },
        ]}
      />
      <Learn>Open an order to send it out, refund it, or see everything that has happened to it.</Learn>
    </div>
  );
}
