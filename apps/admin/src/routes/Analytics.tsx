import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { api, qs } from '../api';
import { useStore } from '../context';
import { money } from '../format';
import { AnalyticsBar, Banner, Card, Empty, Loading, PageHeader, ReceiptArt, Tabs, useAsync } from '../ui';
import { fill } from './Home';

export interface Stats {
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

export function Analytics() {
  const store = useStore();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const { data, error } = useAsync(() => api<Stats>(`/stats${qs({ storeId: store._id, days })}`), [store._id, days]);
  const m = (n: number) => money(n, store.currency);
  const series = data ? fill(data.daily, data.days) : [];
  const max = Math.max(1, ...series.map((d) => d.revenue));

  return (
    <div className="page">
      <PageHeader icon={<BarChart3 aria-hidden="true" />} title="Analytics" subtitle="Paid orders, net of refunds." />
      <Tabs value={days} onChange={setDays} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
      {error ? <Banner tone="critical" title="Couldn't load analytics">{error}</Banner> : null}
      {!data ? (
        <Loading what="analytics" />
      ) : (
        <>
          <AnalyticsBar
            range={`Last ${days} days`}
            metrics={[
              { label: 'Net sales', value: m(data.revenue), series: series.map((d) => d.revenue) },
              { label: 'Orders', value: String(data.orders), series: series.map((d) => d.orders) },
              { label: 'Average order', value: m(data.aov) },
              { label: 'Refunded', value: m(data.refunds) },
            ]}
          />
          <Card title="Sales over time">
            <div className="bars bars--tall" aria-label="Daily net sales">
              {series.map((d) => (
                <span key={d._id} title={`${d._id}: ${m(d.revenue)}, ${d.orders} orders`} style={{ height: `${Math.max(1, (d.revenue / max) * 100)}%` }} />
              ))}
            </div>
            <div className="row muted" style={{ justifyContent: 'space-between', fontSize: 'var(--t-sm)' }}>
              <span>{series[0]?._id}</span>
              <span>{series[series.length - 1]?._id}</span>
            </div>
          </Card>
          <div className="form2">
            <div className="form2__main">
              <Card title="Top products" flush>
                {data.top.length ? (
                  <table className="table">
                    <thead><tr><th>Product</th><th className="th--num">Units</th><th className="th--num">Sales</th></tr></thead>
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
                  <Empty art={<ReceiptArt />} title="No sales yet" body="Top sellers appear once orders are paid." />
                )}
              </Card>
            </div>
            <div className="form2__side">
              <Card title="Orders by status">
                <div className="defs">
                  {(['pending', 'paid', 'fulfilled', 'delivered', 'refunded', 'cancelled'] as const).map((s) => (
                    <div className="defs__row" key={s}>
                      <span className="defs__label"><Link to={`/orders?status=${s}`}>{{ pending: 'Unpaid', paid: 'Paid', fulfilled: 'Sent out', delivered: 'Delivered', refunded: 'Refunded', cancelled: 'Cancelled' }[s]}</Link></span>
                      <span className="defs__value num">{data.byStatus[s] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Catalogue">
                <div className="defs">
                  <div className="defs__row"><span className="defs__label">Products live</span><span className="defs__value num">{data.activeProducts}</span></div>
                  <div className="defs__row"><span className="defs__label">Low on stock</span><span className="defs__value num">{data.lowStock}</span></div>
                  <div className="defs__row"><span className="defs__label">Customers</span><span className="defs__value num">{data.customers}</span></div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
