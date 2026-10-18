import { Link } from 'react-router-dom';
import { api, qs } from '../api';
import { useApp, useStore } from '../context';
import { money } from '../format';
import { Card, Loading, useAsync } from '../ui';

interface Stats {
  revenue30d: number;
  orders30d: number;
  daily: { _id: string; revenue: number; orders: number }[];
  byStatus: Record<string, number>;
  activeProducts: number;
  customers: number;
}

export function Home() {
  const { me } = useApp();
  const store = useStore();
  const { data, error } = useAsync(() => api<Stats>(`/stats${qs({ storeId: store._id })}`), [store._id]);
  const max = Math.max(1, ...(data?.daily.map((d) => d.revenue) ?? [1]));

  return (
    <div className="page">
      <div className="home__greet">
        <h1>Hello, {me.name.split(' ')[0]}</h1>
        <p className="muted">Here is how {store.name} is doing.</p>
      </div>
      {error ? <p className="field__error">{error}</p> : null}
      {!data ? (
        <Loading what="stats" />
      ) : (
        <>
          <div className="stats">
            <div className="card stats__tile stats__tile--big">
              <div className="stats__label muted">Revenue, last 30 days</div>
              <div className="stats__num stats__num--big num">{money(data.revenue30d, store.currency)}</div>
              <div className="bars" aria-hidden="true" style={{ marginTop: 'var(--s3)' }}>
                {data.daily.map((d) => (
                  <span key={d._id} title={`${d._id}: ${money(d.revenue, store.currency)}`} style={{ height: `${(d.revenue / max) * 100}%` }} />
                ))}
              </div>
            </div>
            <div className="card stats__tile">
              <div className="stats__label muted">Orders, 30 days</div>
              <div className="stats__num num">{data.orders30d}</div>
              <div className="stats__hint muted">{data.byStatus.paid ?? 0} waiting to ship</div>
            </div>
            <div className="card stats__tile">
              <div className="stats__label muted">Customers</div>
              <div className="stats__num num">{data.customers}</div>
              <div className="stats__hint muted">{data.activeProducts} products live</div>
            </div>
          </div>
          <Card title="Needs attention">
            <div className="stack stack--tight">
              <Link to="/orders?status=paid">{data.byStatus.paid ?? 0} paid orders to fulfil</Link>
              <Link to="/orders?status=pending">{data.byStatus.pending ?? 0} checkouts awaiting payment</Link>
              <Link to="/emails">Check the inbox</Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
