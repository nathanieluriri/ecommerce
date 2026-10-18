import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api';
import { useApp, useStore } from '../context';
import { money } from '../format';
import { Card, Loading, Tabs, useAsync } from '../ui';

interface Stats {
  days: number;
  revenue: number;
  orders: number;
  aov: number;
  refunds: number;
  daily: { _id: string; revenue: number; orders: number }[];
  top: { _id: string; title: string; quantity: number; revenue: number }[];
  byStatus: Record<string, number>;
  activeProducts: number;
  customers: number;
  lowStock: number;
  pendingReviews: number;
  oversold: number;
}

function fillDays(daily: Stats['daily'], days: number) {
  const byDay = new Map(daily.map((d) => [d._id, d]));
  return Array.from({ length: days }, (_, i) => {
    const key = new Date(Date.now() - (days - 1 - i) * 86400_000).toISOString().slice(0, 10);
    return byDay.get(key) ?? { _id: key, revenue: 0, orders: 0 };
  });
}

export function Home() {
  const { me } = useApp();
  const store = useStore();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const { data, error } = useAsync(() => api<Stats>(`/stats${qs({ storeId: store._id, days })}`), [store._id, days]);
  const series = data ? fillDays(data.daily, data.days) : [];
  const max = Math.max(1, ...series.map((d) => d.revenue));
  const m = (n: number) => money(n, store.currency);

  const attention = data
    ? [
        { n: data.byStatus.paid ?? 0, to: '/orders?status=paid', label: ['paid order', 'to fulfil'] },
        { n: data.oversold, to: '/orders?flag=oversold', label: ['oversold order', 'to check'] },
        { n: data.lowStock, to: '/products?lowStock=1', label: ['product', 'low on stock'] },
        { n: data.pendingReviews, to: '/reviews', label: ['review', 'waiting for approval'] },
      ].filter((a) => a.n > 0)
    : [];

  return (
    <div className="page">
      <div className="home__greet">
        <h1>Hello, {me.name.split(' ')[0]}</h1>
        <p className="muted">Here is how {store.name} is doing.</p>
      </div>
      <div className="row">
        <Tabs value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      </div>
      {error ? <p className="field__error">{error}</p> : null}
      {!data ? (
        <Loading what="stats" />
      ) : (
        <>
          <div className="stats">
            <div className="card stats__tile stats__tile--big">
              <div className="stats__label muted">Net revenue</div>
              <div className="stats__num stats__num--big num">{m(data.revenue)}</div>
              <div className="bars" aria-hidden="true" style={{ marginTop: 'var(--s3)' }}>
                {series.map((d) => (
                  <span key={d._id} title={`${d._id}: ${m(d.revenue)}, ${d.orders} orders`} style={{ height: `${(d.revenue / max) * 100}%` }} />
                ))}
              </div>
            </div>
            <div className="card stats__tile">
              <div className="stats__label muted">Orders</div>
              <div className="stats__num num">{data.orders}</div>
              <div className="stats__hint muted">Average {m(data.aov)}</div>
            </div>
            <div className="card stats__tile">
              <div className="stats__label muted">Refunded</div>
              <div className="stats__num num">{m(data.refunds)}</div>
              <div className="stats__hint muted">{data.customers} customers, {data.activeProducts} products live</div>
            </div>
          </div>
          <div className="form2">
            <div className="form2__main">
              <Card title="Top products" flush>
                {data.top.length ? (
                  <table className="table">
                    <thead><tr><th>Product</th><th className="th--num">Sold</th><th className="th--num">Revenue</th></tr></thead>
                    <tbody>
                      {data.top.map((t) => (
                        <tr key={t._id}>
                          <td className="cell--primary"><Link to={`/products/${t._id}`}>{t.title}</Link></td>
                          <td className="cell--num num">{t.quantity}</td>
                          <td className="cell--num num">{m(t.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="card__body muted">No sales in this period yet.</div>
                )}
              </Card>
            </div>
            <div className="form2__side">
              <Card title="Needs attention">
                {attention.length ? (
                  <div className="stack stack--tight">
                    {attention.map((a) => <Link key={a.to} to={a.to}>{a.n} {a.label[0]}{a.n === 1 ? '' : 's'} {a.label[1]}</Link>)}
                  </div>
                ) : (
                  <span className="muted">All caught up.</span>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
