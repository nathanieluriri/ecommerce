import { useParams } from 'react-router-dom';
import { Mail, Users } from 'lucide-react';
import { api, type Customer, type Order } from '../api';
import { useStore } from '../context';
import { dateTime, money } from '../format';
import { AnalyticsBar, Badge, Banner, Card, DataTable, Defs, Empty, Loading, PageHeader, ReceiptArt, StatusBadge, useAsync } from '../ui';
import { shortDate } from './Orders';

export function CustomerDetail() {
  const { id } = useParams();
  const store = useStore();
  const { data, error } = useAsync(() => api<{ customer: Customer; orders: Order[]; subscribed: boolean }>(`/customers/${id}`), [id]);
  if (error) return <div className="page"><Banner tone="critical" title="Couldn't load this customer">{error}</Banner></div>;
  if (!data) return <div className="page"><Loading what="customer" /></div>;
  const { customer, orders, subscribed } = data;
  const m = (n: number) => money(n, store.currency);
  return (
    <div className="page">
      <PageHeader
        icon={<Users aria-hidden="true" />}
        backTo="/customers"
        backLabel="Customers"
        title={customer.name ?? customer.email}
        subtitle={`Customer since ${dateTime(customer.createdAt)}`}
        actions={<a className="btn btn--default btn--lg" href={`mailto:${customer.email}`}><Mail aria-hidden="true" /> Email</a>}
      />
      <AnalyticsBar
        range="Lifetime"
        metrics={[
          { label: 'Orders', value: String(customer.orders) },
          { label: 'Total spent', value: m(customer.totalSpent) },
          { label: 'Average order', value: m(customer.orders ? Math.round(customer.totalSpent / customer.orders) : 0) },
          { label: 'Last order', value: customer.lastOrderAt ? shortDate(customer.lastOrderAt) : '-' },
        ]}
      />
      <div className="form2">
        <div className="form2__main">
          <DataTable<Order>
            rows={orders}
            rowKey={(o) => o._id}
            href={(o) => `/orders/${o._id}`}
            empty={<Empty art={<ReceiptArt />} title="No orders yet" />}
            columns={[
              { key: 'n', header: 'Order', render: (o) => <span className="idcell__title mono">#{o.number}</span> },
              { key: 'd', header: 'Date', render: (o) => shortDate(o.createdAt) },
              { key: 's', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
              { key: 'i', header: 'Items', numeric: true, render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
              { key: 't', header: 'Total', numeric: true, render: (o) => <strong>{money(o.total, o.currency)}</strong> },
            ]}
          />
        </div>
        <div className="form2__side">
          <Card title="Contact">
            <Defs
              rows={[
                { label: 'Email', value: <a href={`mailto:${customer.email}`}>{customer.email}</a> },
                { label: 'Newsletter', value: subscribed ? <Badge tone="ok">Subscribed</Badge> : <Badge>Not subscribed</Badge> },
                { label: 'Last sign-in', value: customer.lastLoginAt ? shortDate(customer.lastLoginAt) : 'Never' },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
