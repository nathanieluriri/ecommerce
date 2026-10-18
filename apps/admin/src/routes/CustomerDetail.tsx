import { useNavigate, useParams } from 'react-router-dom';
import { api, type Customer, type Order } from '../api';
import { useStore } from '../context';
import { dateTime, money } from '../format';
import { Badge, Card, Loading, PageHeader, StatusBadge, useAsync } from '../ui';

export function CustomerDetail() {
  const { id } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const { data } = useAsync(() => api<{ customer: Customer; orders: Order[]; subscribed: boolean }>(`/customers/${id}`), [id]);
  if (!data) return <div className="page"><Loading what="customer" /></div>;
  const { customer, orders, subscribed } = data;
  const m = (n: number) => money(n, store.currency);
  return (
    <div className="page">
      <PageHeader title={customer.name ?? customer.email} subtitle={customer.email} badge={subscribed ? <Badge tone="info">Subscribed</Badge> : undefined} />
      <div className="stats">
        <div className="card stats__tile"><div className="stats__label muted">Orders</div><div className="stats__num num">{customer.orders}</div></div>
        <div className="card stats__tile"><div className="stats__label muted">Total spent</div><div className="stats__num num">{m(customer.totalSpent)}</div></div>
        <div className="card stats__tile"><div className="stats__label muted">Average order</div><div className="stats__num num">{m(customer.orders ? Math.round(customer.totalSpent / customer.orders) : 0)}</div></div>
        <div className="card stats__tile"><div className="stats__label muted">Customer since</div><div className="stats__num" style={{ fontSize: 'var(--t-lg)' }}>{dateTime(customer.createdAt)}</div></div>
      </div>
      <Card title="Orders" flush>
        <table className="table">
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="is-clickable" onClick={() => navigate(`/orders/${o._id}`)}>
                <td className="cell--primary"><strong>#{o.number}</strong></td>
                <td className="muted">{dateTime(o.createdAt)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="cell--num num">{m(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <a href={`mailto:${customer.email}`}>Email {customer.name?.split(' ')[0] ?? 'this customer'}</a>
    </div>
  );
}
