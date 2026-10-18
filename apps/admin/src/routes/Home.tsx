import { Link } from 'react-router-dom';
import { ArrowRight, House } from 'lucide-react';
import { api, qs } from '../api';
import { useStore } from '../context';
import { money } from '../format';
import { AnalyticsBar, Banner, BoxArt, ButtonLink, CouponArt, MegaphoneArt, PageHeader, PeopleArt, ReceiptArt, ShelfArt, useAsync } from '../ui';
import type { Stats } from './Analytics';

export function Home() {
  const store = useStore();
  const { data, error } = useAsync(() => api<Stats>(`/stats${qs({ storeId: store._id, days: 7 })}`), [store._id]);
  const m = (n: number) => money(n, store.currency);
  const toShip = data?.byStatus.paid ?? 0;
  const series = data ? fill(data.daily, 7) : [];

  return (
    <div className="page">
      <PageHeader icon={<House aria-hidden="true" />} title="Home" actions={<ButtonLink to="/analytics">View analytics</ButtonLink>} />
      <div className="home__greet">
        <h1>{store.name} is open for business.</h1>
        <p>What do you want to work on next?</p>
      </div>
      {data ? (
        <AnalyticsBar
          range="Last 7 days"
          metrics={[
            { label: 'Net sales', value: m(data.revenue), series: series.map((d) => d.revenue) },
            { label: 'Orders', value: String(data.orders), series: series.map((d) => d.orders) },
            { label: 'Average order', value: m(data.aov) },
            { label: 'To ship', value: String(toShip) },
          ]}
        />
      ) : null}
      {error ? <Banner tone="critical" title="Couldn't load the store summary">{error}</Banner> : null}
      {data?.oversold ? (
        <Banner tone="warn" title={`${data.oversold} order${data.oversold === 1 ? '' : 's'} oversold`} action={<ButtonLink to="/orders?flag=oversold">Review</ButtonLink>}>
          Stock went below zero. Check inventory before you send these out.
        </Banner>
      ) : null}
      <div className="bento">
        <Link to={toShip ? '/orders?status=paid' : '/orders'} className="bento__card bento__card--a">
          <span className="bento__art"><ReceiptArt /></span>
          {data ? <span className="bento__stat num">{toShip}</span> : null}
          <span className="bento__kicker">Orders</span>
          <span className="bento__title">{toShip ? 'Send out paid orders' : 'Work through orders'}</span>
          <span className="bento__body">Send out what has been paid for, track what is on its way, and refund what came back.</span>
          <span className="bento__go" aria-hidden="true"><ArrowRight /></span>
        </Link>
        <Link to="/discounts" className="bento__card bento__card--b">
          <span className="bento__art"><CouponArt /></span>
          <span className="bento__kicker">Discounts</span>
          <span className="bento__title">Set up a discount</span>
          <span className="bento__body">A code customers type in the cart, for a percentage, a fixed amount or free shipping.</span>
          <span className="bento__go" aria-hidden="true"><ArrowRight /></span>
        </Link>
        <Link to={data?.lowStock ? '/products/inventory' : '/products'} className="bento__card bento__card--c">
          <span className="bento__art"><BoxArt /></span>
          <span className="bento__kicker">{data?.lowStock ? `${data.lowStock} low on stock` : 'Products'}</span>
          <span className="bento__title">Check the catalogue</span>
          <span className="bento__go" aria-hidden="true"><ArrowRight /></span>
        </Link>
        <Link to="/customers" className="bento__card bento__card--d">
          <span className="bento__art"><PeopleArt /></span>
          <span className="bento__kicker">{data ? `${data.customers} customers` : 'Customers'}</span>
          <span className="bento__title">Look up a customer</span>
          <span className="bento__go" aria-hidden="true"><ArrowRight /></span>
        </Link>
        <Link to="/products/categories" className="bento__card bento__card--e">
          <span className="bento__art"><ShelfArt /></span>
          <span className="bento__kicker">Categories</span>
          <span className="bento__title">Tidy the categories</span>
          <span className="bento__go" aria-hidden="true"><ArrowRight /></span>
        </Link>
        <Link to="/marketing" className="bento__card bento__card--f">
          <span>
            <span className="bento__kicker">{data?.pendingReviews ? `${data.pendingReviews} reviews waiting` : 'Marketing'}</span>
            <span className="bento__title">Bring shoppers back</span>
            <span className="bento__body">Send a newsletter to your subscribers, or approve the reviews that sell for you.</span>
          </span>
          <span className="bento__art"><MegaphoneArt /></span>
          <span className="bento__go" aria-hidden="true"><ArrowRight /></span>
        </Link>
      </div>
    </div>
  );
}

export function fill(daily: Stats['daily'], days: number) {
  const byDay = new Map(daily.map((d) => [d._id, d]));
  return Array.from({ length: days }, (_, i) => {
    const key = new Date(Date.now() - (days - 1 - i) * 86400_000).toISOString().slice(0, 10);
    return byDay.get(key) ?? { _id: key, revenue: 0, orders: 0 };
  });
}
