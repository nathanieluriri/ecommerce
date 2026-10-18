import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Order } from '../api';
import { useStore } from '../context';
import { Loading, useAsync } from '../ui';

export function PackingSlip() {
  const { id } = useParams();
  const store = useStore();
  const { data: order } = useAsync(() => api<Order>(`/orders/${id}`), [id]);
  useEffect(() => {
    if (order) setTimeout(() => window.print(), 300);
  }, [order]);
  if (!order) return <Loading what="packing slip" />;
  const a = order.shippingAddress ?? {};
  return (
    <div className="slip">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{store.name}</h1>
          <div className="muted">{store.supportEmail}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2>Packing slip</h2>
          <div>Order #{order.number}</div>
          <div className="muted">{new Date(order.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="slip__to">
        <strong>Ship to</strong>
        <div>{order.customer.name}</div>
        {[a.line1, a.line2, [a.city, a.state, a.postalCode].filter(Boolean).join(', '), a.country].filter(Boolean).map((l) => <div key={l}>{l}</div>)}
        {order.customer.phone ? <div>{order.customer.phone}</div> : null}
      </div>
      <table className="slip__table">
        <thead><tr><th>Item</th><th>SKU</th><th style={{ textAlign: 'right' }}>Qty</th></tr></thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={`${i.productId}.${i.variantId ?? ''}`}>
              <td>{i.title}{i.variantTitle ? ` (${i.variantTitle})` : ''}</td>
              <td className="mono">{i.sku ?? ''}</td>
              <td style={{ textAlign: 'right' }}>{i.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Thank you for shopping with {store.name}.</p>
    </div>
  );
}
