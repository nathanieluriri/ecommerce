import { useState } from 'react';
import { Users } from 'lucide-react';
import { api, qs, type Customer, type Paged } from '../api';
import { useStore } from '../context';
import { money } from '../format';
import { Banner, DataTable, Empty, Learn, PageHeader, PeopleArt, Tabs, useAsync } from '../ui';
import { shortDate } from './Orders';

const SIZE = 25;

export function Customers() {
  const store = useStore();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'spent'>('recent');
  const [page, setPage] = useState(1);
  const { data, error } = useAsync(() => api<Paged<Customer>>(`/customers${qs({ storeId: store._id, q, sort, page, limit: SIZE })}`), [store._id, q, sort, page]);
  return (
    <div className="page">
      <PageHeader icon={<Users aria-hidden="true" />} title="Customers" />
      {error ? <Banner tone="critical" title="Couldn't load customers">{error}</Banner> : null}
      <DataTable<Customer>
        tabs={<Tabs value={sort} onChange={(v) => { setPage(1); setSort(v); }} options={[{ value: 'recent', label: 'Recent' }, { value: 'spent', label: 'Top spenders' }]} />}
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'Search by name or email' }}
        rows={data?.items ?? (error ? [] : null)}
        rowKey={(c) => c._id}
        href={(c) => `/customers/${c._id}`}
        page={data ? { page, size: SIZE, total: data.total, onPage: setPage } : undefined}
        empty={q ? <Empty title="No customers match" /> : <Empty art={<PeopleArt />} title="Your customers will show here" body="Everyone who pays for an order gets a customer record, with their orders and what they have spent." />}
        columns={[
          {
            key: 'c',
            header: 'Customer',
            render: (c) => (
              <span className="idcell">
                <span className="avatar" aria-hidden="true">{(c.name ?? c.email).slice(0, 1).toUpperCase()}</span>
                <span className="idcell__text"><span className="idcell__title">{c.name ?? c.email}</span><span className="idcell__meta">{c.email}</span></span>
              </span>
            ),
          },
          { key: 'last', header: 'Last order', render: (c) => <span className="muted">{c.lastOrderAt ? shortDate(c.lastOrderAt) : '-'}</span> },
          { key: 'since', header: 'Customer since', render: (c) => <span className="muted">{shortDate(c.createdAt)}</span> },
          { key: 'o', header: 'Orders', numeric: true, render: (c) => c.orders },
          { key: 's', header: 'Spent', numeric: true, render: (c) => <strong>{money(c.totalSpent, store.currency)}</strong> },
        ]}
      />
      <Learn>Customers sign in on the storefront with a link sent to their email, no password needed.</Learn>
    </div>
  );
}
