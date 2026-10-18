import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Order, type OrderStatus } from '../api';
import { dateTime, money, toMinor } from '../format';
import { Banner, Button, Card, Field, Loading, PageHeader, StatusBadge, useAsync } from '../ui';

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  paid: { status: 'fulfilled', label: 'Mark as shipped' },
  fulfilled: { status: 'delivered', label: 'Mark as delivered' },
};

export function OrderDetail() {
  const { id } = useParams();
  const { data: order, error, reload } = useAsync(() => api<Order>(`/orders/${id}`), [id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <div className="page"><Banner tone="critical">{error}</Banner></div>;
  if (!order) return <div className="page"><Loading what="order" /></div>;

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const next = NEXT[order.status];
  const canRefund = Boolean(order.stripePaymentIntentId) && order.status !== 'refunded';
  const canCancel = order.status === 'pending' || order.status === 'paid';
  const addr = order.shippingAddress;

  return (
    <div className="page">
      <PageHeader
        title={`Order #${order.number}`}
        badge={<StatusBadge status={order.status} />}
        subtitle={dateTime(order.createdAt)}
        actions={
          <>
            {canCancel ? (
              <Button tone="plain" busy={busy === 'cancel'} onClick={() => run('cancel', () => api(`/orders/${order._id}/status`, { body: { status: 'cancelled' } }))}>
                Cancel order
              </Button>
            ) : null}
            {next ? (
              <Button tone="primary" busy={busy === 'next'} onClick={() => run('next', () => api(`/orders/${order._id}/status`, { body: { status: next.status } }))}>
                {next.label}
              </Button>
            ) : null}
          </>
        }
      />
      {actionError ? <Banner tone="critical">{actionError}</Banner> : null}
      <div className="form2">
        <div className="form2__main">
          <Card title="Items" flush>
            <table className="table">
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.productId}>
                    <td className="cell--primary">
                      <span className="idcell">
                        {i.image ? <img className="thumb" src={i.image} alt="" /> : <span className="thumb" />}
                        <span className="idcell__text"><span className="idcell__title">{i.title}</span><span className="idcell__meta muted">{money(i.price, order.currency)} x {i.quantity}</span></span>
                      </span>
                    </td>
                    <td className="cell--num num">{money(i.price * i.quantity, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card__body">
              <div className="defs">
                <div className="defs__row"><span className="defs__label">Subtotal</span><span className="defs__value num">{money(order.subtotal, order.currency)}</span></div>
                <div className="defs__row"><span className="defs__label">Shipping</span><span className="defs__value num">{money(order.shipping, order.currency)}</span></div>
                <div className="defs__row defs__row--total"><span className="defs__label">Total</span><span className="defs__value num">{money(order.total, order.currency)}</span></div>
              </div>
            </div>
          </Card>
          <Card title="Timeline">
            <div className="row">
              <input className="input" placeholder="Add a private note" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button disabled={!note.trim()} busy={busy === 'note'} onClick={() => run('note', async () => { await api(`/orders/${order._id}/note`, { body: { note } }); setNote(''); })}>
                Post
              </Button>
            </div>
            <ul className="tl">
              {[...(order.timeline ?? [])].reverse().map((t, i) => (
                <li className="tl__item" key={i}>
                  <span className={`tl__dot ${t.status === 'refunded' || t.status === 'cancelled' ? 'tl__dot--critical' : t.status ? 'tl__dot--ok' : 'tl__dot--info'}`} />
                  <div className="tl__content">
                    <div className="tl__msg">{t.note}</div>
                    <div className="tl__meta muted">{dateTime(t.at)}{t.by ? ` by ${t.by}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="form2__side">
          <Card title="Customer">
            <div>{order.customer.name ?? 'Guest'}</div>
            {order.customer.email ? <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a> : null}
            {order.customer.phone ? <div className="muted">{order.customer.phone}</div> : null}
          </Card>
          <Card title="Shipping address">
            {addr ? (
              <div>
                {[addr.line1, addr.line2, [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', '), addr.country].filter(Boolean).map((l) => <div key={l}>{l}</div>)}
              </div>
            ) : (
              <span className="muted">Not provided yet</span>
            )}
          </Card>
          {canRefund ? (
            <Card title="Refund">
              <Field label="Amount" hint="Leave empty to refund in full">
                <input className="input" inputMode="decimal" placeholder={money(order.total, order.currency)} value={refund} onChange={(e) => setRefund(e.target.value)} />
              </Field>
              <Button
                tone="critical"
                busy={busy === 'refund'}
                onClick={() => {
                  if (!confirm('Refund this order through Stripe?')) return;
                  void run('refund', () => api(`/orders/${order._id}/refund`, { body: refund ? { amount: toMinor(refund, order.currency) } : {} }));
                }}
              >
                Refund via Stripe
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
